import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Injectable,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  StreamableFile,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join, parse } from "node:path";
import {
  Category,
  Customer,
  DesignSetting,
  Notification,
  NotificationType,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Role,
  User,
} from "../entities";
import { getUploadDirectory } from "../storage";
import { AdminAuthGuard } from "../auth/admin-auth.guard";
import { Roles } from "../auth/roles.decorator";
import {
  MAX_IMAGE_BYTES,
  MAX_SPREADSHEET_BYTES,
  MAX_ZIP_BYTES,
  validateImageBuffer,
  validateSpreadsheetUpload,
  validateZipUpload,
} from "../uploads/upload-validation";
import { readImageZip } from "../uploads/safe-zip";
import { readSpreadsheetRows, writeRowsToXlsx } from "../uploads/spreadsheet";
import {
  CatalogueStatusDto,
  CreateCategoryDto,
  CreateCustomerDto,
  ProductDto,
  UpdateCustomerDto,
  UpdateOrderDto,
} from "./dtos";

@Injectable()
export class CrudService {
  constructor(
    @InjectRepository(Product) private products: Repository<Product>,
    @InjectRepository(Category) private categories: Repository<Category>,
    @InjectRepository(Customer) private customers: Repository<Customer>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(OrderItem) private orderItems: Repository<OrderItem>,
    @InjectRepository(Notification)
    private notifications: Repository<Notification>,
  ) {}
  categoriesAll() {
    return this.categories.find({
      relations: { products: true },
      order: { name: "ASC" },
    });
  }
  
  async notify(
    title: string,
    message: string,
    type = NotificationType.SUCCESS,
  ) {
    await this.notifications.save(
      this.notifications.create({ title, message, type }),
    );
  }
  async addCategory(name: string) {
    const saved = await this.categories.save(
      this.categories.create({ name: name.trim().toUpperCase() }),
    );
    await this.notify("Category added", `${saved.name} is ready for products`);
    return saved;
  }
  async deleteCategory(id: number) {
    const category = await this.categories.findOneBy({ id });
    const result = await this.categories.delete(id);
    if (category)
      await this.notify(
        "Category removed",
        category.name,
        NotificationType.WARNING,
      );
    return result;
  }
  productsAll(search = "") {
    return this.products.find({
      where: search
        ? [
            { code: ILike(`%${search}%`) },
            { description: ILike(`%${search}%`) },
          ]
        : {},
      order: { createdAt: "DESC" },
    });
  }
  async addProduct(body: ProductDto): Promise<Product> {
  const category = await this.categories.findOneByOrFail({
    id: Number(body.categoryId),
  });

  const product: Product = this.products.create({
    code: String(body.code),
    description: String(body.description),
    category,
    uom: String(body.uom || "PKT"),
    price: Number(body.price || 0),
    imageUrl: body.imageUrl || null,
    catalogueEnabled: true,
  });

  const saved: Product = await this.products.save(product);

  await this.notify(
    "Product added",
    `${saved.code} · ${saved.description}`,
  );

  return saved;
}
  async bulkUploadProducts(file: any, imagesZip?: any) {
    validateSpreadsheetUpload(file);
    validateZipUpload(imagesZip);
    const images = await this.readProductImages(imagesZip);
    const uploadDirectory = join(getUploadDirectory(), "products");
    await mkdir(uploadDirectory, { recursive: true });

    const rows = await readSpreadsheetRows(file);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const excelRow = rowIndex + 2;
      const normalized = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key.trim().toLowerCase().replace(/[^a-z0-9]/g, ""),
          value,
        ]),
      ) as Record<string, unknown>;

      const value = (...keys: string[]) => {
        for (const key of keys) {
          const found = normalized[key];
          if (found !== undefined && String(found).trim() !== "") {
            return found;
          }
        }
        return "";
      };

      const code = String(
        value("code", "productcode", "itemcode", "stockcode", "sku"),
      ).trim();
      const description =
        String(
          value(
            "description",
            "productdescription",
            "itemdescription",
            "productname",
            "itemname",
            "stockitem",
            "name",
          ),
        ).trim() || code;
      const categoryName = (
        String(
          value(
            "category",
            "categoryname",
            "productcategory",
            "itemgroup",
            "group",
          ),
        ).trim() || "OTHERS"
      ).toUpperCase();
      const uom = (
        String(value("uom", "unit", "unitofmeasure")).trim() || "PKT"
      ).toUpperCase();
      const rawPrice = value(
        "price",
        "rate",
        "sellingprice",
        "unitprice",
        "amount",
      );
      const price = Number(
        String(rawPrice || "0")
          .replace(/,/g, "")
          .replace(/[^\d.-]/g, ""),
      );
      const imageUrl = String(
        value("image", "imageurl", "productimage", "photo", "photourl"),
      ).trim();

      if (!code || Number.isNaN(price)) {
        skipped++;
        errors.push({ row: excelRow, message: "Code or Price is invalid" });
        continue;
      }

      try {
        let category = await this.categories.findOne({
          where: { name: ILike(categoryName) },
        });

        if (!category) {
          category = await this.categories.save(
            this.categories.create({ name: categoryName }),
          );
        }

        const existing = await this.products.findOne({ where: { code } });
        let savedImageUrl = existing?.imageUrl || null;

        if (/^https?:\/\//i.test(imageUrl)) {
          savedImageUrl = imageUrl;
        } else {
          const requestedFile = imageUrl
            ? parse(imageUrl.replaceAll("\\", "/")).base.toLowerCase()
            : "";
          const image =
            (requestedFile && images.get(`file:${requestedFile}`)) ||
            images.get(`code:${code.toLowerCase()}`);

          if (image) {
            const safeCode = code.replace(/[^a-zA-Z0-9_-]/g, "_");
            const storedName =
              `${safeCode}-${Date.now()}-${rowIndex}${image.extension}`;
            await writeFile(join(uploadDirectory, storedName), image.data);
            savedImageUrl = `/uploads/products/${storedName}`;
          } else if (requestedFile) {
            throw new Error(`Image "${imageUrl}" was not found in the ZIP`);
          }
        }

        if (existing) {
          existing.description = description;
          existing.category = category;
          existing.uom = uom;
          existing.price = price;
          existing.imageUrl = savedImageUrl;
          await this.products.save(existing);
          updated++;
        } else {
          await this.products.save(
            this.products.create({
              code,
              description,
              category,
              uom,
              price,
              imageUrl: savedImageUrl,
            }),
          );
          created++;
        }
      } catch (error) {
        skipped++;
        errors.push({
          row: excelRow,
          message: error instanceof Error ? error.message : "Import failed",
        });
      }
    }

    await this.notify(
      "Bulk upload completed",
      `${created} created · ${updated} updated · ${skipped} skipped`,
    );

    return {
      total: rows.length,
      created,
      updated,
      skipped,
      errors: errors.slice(0, 100),
    };
  }

  private async readProductImages(imagesZip?: Express.Multer.File) {
    const images = new Map<
      string,
      { data: Buffer; extension: string }
    >();
    if (!imagesZip?.buffer) return images;

    const allowed = new Set([".jpg", ".jpeg", ".png", ".webp"]);
    const entries = await readImageZip(imagesZip.buffer);
    for (const entry of entries) {
      const normalizedName = entry.fileName;
      const fileName = parse(normalizedName).base;
      const extension = extname(fileName).toLowerCase();
      if (!allowed.has(extension)) continue;
      const data = entry.data;
      await validateImageBuffer(data);

      const image = { data, extension };
      images.set(`file:${fileName.toLowerCase()}`, image);
      images.set(`code:${parse(fileName).name.toLowerCase()}`, image);
    }

    return images;
  }

  

  async updateCatalogueStatus(
    id: number,
    enabled: boolean,
  ): Promise<Product> {
    const product = await this.products.findOneByOrFail({ id });
    product.catalogueEnabled = enabled;
    const saved = await this.products.save(product);

    await this.notify(
      enabled
        ? "Product enabled for catalogue"
        : "Product disabled for catalogue",
      `${saved.code} · ${saved.description}`,
    );

    return saved;
  }

  async updateProduct(id: number, body: ProductDto): Promise<Product> {
    const product = await this.products.findOneByOrFail({ id });
    const category = await this.categories.findOneByOrFail({
      id: Number(body.categoryId),
    });

    product.code = String(body.code).trim();
    product.description = String(body.description).trim();
    product.category = category;
    product.uom = String(body.uom || "PKT");
    product.price = Number(body.price || 0);
    product.imageUrl = body.imageUrl || null;

    const saved = await this.products.save(product);

    await this.notify(
      "Product updated",
      `${saved.code} · ${saved.description}`,
    );

    return saved;
  }
  async deleteProduct(id: number) {
    const product = await this.products.findOneBy({ id });
    const result = await this.products.delete(id);
    if (product)
      await this.notify(
        "Product deleted",
        product.code,
        NotificationType.WARNING,
      );
    return result;
  }
  async clearProducts() {
    await this.orderItems.createQueryBuilder().delete().execute();
    const result = await this.products.createQueryBuilder().delete().execute();

    await this.notify(
      "All products removed",
      `${result.affected || 0} products were removed`,
      NotificationType.WARNING,
    );

    return {
      success: true,
      removed: result.affected || 0,
    };
  }
  customersAll(search = "") {
    return this.customers.find({
      where: search ? { name: ILike(`%${search}%`) } : {},
      order: { name: "ASC" },
    });
  }
  addCustomer(body: CreateCustomerDto) {
    return this.customers.save(this.customers.create(body));
  }
  updateCustomer(id: number, body: UpdateCustomerDto) {
    return this.customers.update(id, body);
  }
  deleteCustomer(id: number) {
    return this.customers.delete(id);
  }
  clearCustomers() {
    return this.customers.clear();
  }
  ordersAll() {
    return this.orders.find({ order: { orderDate: "DESC" } });
  }
  async updateOrder(id: number, body: UpdateOrderDto) {
    const order = await this.orders.findOne({
      where: { id },
      relations: {
        customer: true,
        items: {
          product: true,
        },
      },
    });

    if (!order) {
      throw new BadRequestException("Order not found");
    }

    // Printing must not alter delivery tracking.
    if (body.action === "PRINT") {
      return order;
    }

    if (body.orderDate) {
      order.orderDate = body.orderDate;
    }

    if (body.customerId) {
      order.customer = await this.customers.findOneByOrFail({
        id: Number(body.customerId),
      });
    }

    if (Array.isArray(body.items)) {
      await this.orderItems.delete({
        order: {
          id: order.id,
        },
      });

      const newItems = await Promise.all(
        body.items.map(async (item) => {
          const product = await this.products.findOneByOrFail({
            id: Number(item.productId),
          });

          return this.orderItems.create({
            order,
            product,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          });
        }),
      );

      await this.orderItems.save(newItems);
      order.items = newItems;
    }

    if (body.status && Object.values(OrderStatus).includes(body.status)) {
      order.status = body.status as OrderStatus;
    }
    await this.orders.save(order);

    return this.orders.findOneOrFail({
      where: {
        id: order.id,
      },
      relations: {
        customer: true,
        items: {
          product: true,
        },
      },
    });
  }
  async deleteOrder(id: number) {
    await this.orderItems.delete({ order: { id } });
    return this.orders.delete(id);
  }
  async exportOrders(filters: {
    date?: string;
    from?: string;
    to?: string;
    month?: string;
    customerId?: number;
  } = {}) {
    const query = this.orders
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.customer", "customer")
      .leftJoinAndSelect("order.items", "item")
      .leftJoinAndSelect("item.product", "product")
      .orderBy("order.orderDate", "DESC")
      .addOrderBy("order.id", "DESC");

    if (filters.date) {
      query.andWhere("order.orderDate = :date", { date: filters.date });
    } else if (filters.from && filters.to) {
      query.andWhere("order.orderDate BETWEEN :from AND :to", {
        from: filters.from,
        to: filters.to,
      });
    } else if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
      const [year, month] = filters.month.split("-").map(Number);
      const nextMonth = new Date(Date.UTC(year, month, 1))
        .toISOString()
        .slice(0, 7);
      query.andWhere(
        "order.orderDate >= :monthStart AND order.orderDate < :nextMonth",
        { monthStart: `${filters.month}-01`, nextMonth: `${nextMonth}-01` },
      );
    } else if (filters.customerId) {
      query.andWhere("customer.id = :customerId", {
        customerId: filters.customerId,
      });
    }

    const orders = await query.getMany();
    const rows = orders.flatMap((o) => o.items.length ? o.items.map((i) => ({
      "Order ID": o.orderNo, Date: o.orderDate, Status: o.status,
      Customer: o.customer?.name || "", Address: o.customer?.address || "",
      "TIN Number": o.customer?.tinNumber || "", Phone: o.customer?.phoneNumber || "",
      WhatsApp: o.customer?.whatsappNumber || "", "Product Code": i.product?.code || "",
      Product: i.product?.description || "", UOM: i.product?.uom || "",
      Quantity: Number(i.quantity), "Unit Price (RM)": Number(i.unitPrice),
      "Line Total (RM)": Number(i.quantity) * Number(i.unitPrice),
    })) : [{ "Order ID": o.orderNo, Date: o.orderDate, Status: o.status, Customer: o.customer?.name || "" }]);
    return writeRowsToXlsx(rows, "Orders");
  }
  async importCustomers(file?: Express.Multer.File) {
    validateSpreadsheetUpload(file);
    const rows = await readSpreadsheetRows(file);
    const value = (row: Record<string, any>, names: string[]) => {
      const key = Object.keys(row).find(k => names.includes(k.trim().toLowerCase().replace(/[^a-z0-9]/g, "")));
      return key ? String(row[key]).trim() : "";
    };
    const customers = rows.map(row => this.customers.create({
      name: value(row, ["name", "customername"]), address: value(row, ["address"]),
      tinNumber: value(row, ["tin", "tinnumber"]), phoneNumber: value(row, ["phone", "phonenumber"]),
      whatsappNumber: value(row, ["whatsapp", "whatsappnumber"]),
    })).filter(customer => customer.name);
    if (!customers.length) {
      throw new BadRequestException("No valid customers found. Use separate columns: Name, Address, TIN Number, Phone Number, WhatsApp Number.");
    }
    if (customers.some(customer => /street\s*,\s*city\s*,\s*state/i.test(customer.address || ""))) {
      throw new BadRequestException("The address column contains a CSV header. Please upload a correctly separated CSV or Excel sheet.");
    }
    await this.customers.save(customers);
    return { imported: customers.length };
  }
  async stats() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekStartDate = new Date(now);
    weekStartDate.setUTCDate(weekStartDate.getUTCDate() - 6);
    const weekStart = weekStartDate.toISOString().slice(0, 10);
    const monthStart = `${today.slice(0, 7)}-01`;
    const nextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    )
      .toISOString()
      .slice(0, 10);

    const [customers, counts] = await Promise.all([
      this.customers.count(),
      this.orders
        .createQueryBuilder("order")
        .select(
          "COUNT(CASE WHEN order.orderDate = :today THEN 1 END)",
          "today",
        )
        .addSelect(
          "COUNT(CASE WHEN order.orderDate BETWEEN :weekStart AND :today THEN 1 END)",
          "week",
        )
        .addSelect(
          "COUNT(CASE WHEN order.orderDate >= :monthStart AND order.orderDate < :nextMonth THEN 1 END)",
          "month",
        )
        .setParameters({ today, weekStart, monthStart, nextMonth })
        .getRawOne<{ today: string; week: string; month: string }>(),
    ]);

    return {
      customers,
      today: Number(counts?.today || 0),
      week: Number(counts?.week || 0),
      month: Number(counts?.month || 0),
    };
  }
}
@UseGuards(AdminAuthGuard)
@Controller()
export class CrudController {
  constructor(private s: CrudService) {}
  @Get("categories") categories() {
    return this.s.categoriesAll();
  }
  @Post("categories")
  @Roles(Role.ADMIN)
  addCategory(@Body() b: CreateCategoryDto) {
    return this.s.addCategory(b.name);
  }
  @Delete("categories/:id")
  @Roles(Role.ADMIN)
  delCategory(@Param("id", ParseIntPipe) id: number) {
    return this.s.deleteCategory(id);
  }
  @Get("products") products(@Query("search") q = "") {
    return this.s.productsAll(q);
  }
  @Post("products")
  @Roles(Role.ADMIN)
  addProduct(@Body() b: ProductDto) {
    return this.s.addProduct(b);
  }
  @Post("products/bulk-upload")
  @Roles(Role.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "file", maxCount: 1 },
        { name: "images", maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { files: 2, fileSize: MAX_ZIP_BYTES },
      },
    ),
  )
  bulkUploadProducts(
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const spreadsheet = files?.file?.[0];
    const imagesZip = files?.images?.[0];
    if (spreadsheet?.size && spreadsheet.size > MAX_SPREADSHEET_BYTES) {
      throw new BadRequestException("Spreadsheet must be 5 MB or smaller");
    }
    return this.s.bulkUploadProducts(spreadsheet, imagesZip);
  }
  @Patch("products/:id/catalogue-status")
  @Roles(Role.ADMIN)
  updateCatalogueStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CatalogueStatusDto,
  ) {
    if (typeof body.enabled !== "boolean") {
      throw new BadRequestException("enabled must be true or false");
    }
    return this.s.updateCatalogueStatus(id, body.enabled);
  }

  @Patch("products/:id")
  @Roles(Role.ADMIN)
  editProduct(
    @Param("id", ParseIntPipe) id: number,
    @Body() b: ProductDto,
  ) {
    return this.s.updateProduct(id, b);
  }
  @Delete("products/all")
  @Roles(Role.ADMIN)
  clearProducts() {
    return this.s.clearProducts();
  }
  @Delete("products/:id")
  @Roles(Role.ADMIN)
  delProduct(@Param("id", ParseIntPipe) id: number) {
    return this.s.deleteProduct(id);
  }
  @Get("customers") customers(@Query("search") q = "") {
    return this.s.customersAll(q);
  }
  @Post("customers") addCustomer(@Body() b: CreateCustomerDto) {
    return this.s.addCustomer(b);
  }
  @Post("customers/bulk-upload")
  @UseInterceptors(FileFieldsInterceptor([{ name: "file", maxCount: 1 }], { storage: memoryStorage(), limits: { fileSize: MAX_SPREADSHEET_BYTES } }))
  bulkCustomers(@UploadedFiles() files: { file?: Express.Multer.File[] }) {
    return this.s.importCustomers(files?.file?.[0]);
  }
  @Patch("customers/:id") editCustomer(
    @Param("id", ParseIntPipe) id: number,
    @Body() b: UpdateCustomerDto,
  ) {
    return this.s.updateCustomer(id, b);
  }
  @Delete("customers/all") clearCustomers() {
    return this.s.clearCustomers();
  }
  @Delete("customers/:id") delCustomer(@Param("id", ParseIntPipe) id: number) {
    return this.s.deleteCustomer(id);
  }
  @Get("orders") orders() {
    return this.s.ordersAll();
  }
  @Patch("orders/:id")
  editOrder(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateOrderDto,
  ) {
    return this.s.updateOrder(id, body);
  }
  @Delete("orders/:id") delOrder(@Param("id", ParseIntPipe) id: number) {
    return this.s.deleteOrder(id);
  }
  @Get("orders-export")
  @Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  @Header("Content-Disposition", "attachment; filename=order-details.xlsx")
  async exportOrders(
    @Query("date") date = "",
    @Query("from") from = "",
    @Query("to") to = "",
    @Query("month") month = "",
    @Query("customerId") customerId = "",
  ) {
    return new StreamableFile(
      await this.s.exportOrders({
        date: date || undefined,
        from: from || undefined,
        to: to || undefined,
        month: month || undefined,
        customerId: customerId ? Number(customerId) : undefined,
      }),
    );
  }
  @Get("dashboard/stats") stats() {
    return this.s.stats();
  }
}
