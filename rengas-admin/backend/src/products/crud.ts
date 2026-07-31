import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join, parse } from "node:path";
import AdmZip = require("adm-zip");
import * as XLSX from "xlsx";
import {
  Category,
  Customer,
  Notification,
  NotificationType,
  Order,
  OrderItem,
  Product,
} from "../entities";

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
  async addProduct(body: any): Promise<Product> {
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
  });

  const saved: Product = await this.products.save(product);

  await this.notify(
    "Product added",
    `${saved.code} · ${saved.description}`,
  );

  return saved;
}
  async bulkUploadProducts(file: any, imagesZip?: any) {
    if (!file?.buffer) {
      throw new BadRequestException(
        "Please select a valid Excel or CSV file",
      );
    }

    const spreadsheetExtension = extname(file.originalname || "").toLowerCase();
    if (![".csv", ".xls", ".xlsx"].includes(spreadsheetExtension)) {
      throw new BadRequestException("Only CSV, XLS, and XLSX files are supported");
    }

    const images = this.readProductImages(imagesZip);
    const uploadDirectory = join(process.cwd(), "uploads", "products");
    await mkdir(uploadDirectory, { recursive: true });

    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

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

  private readProductImages(imagesZip?: any) {
    const images = new Map<
      string,
      { data: Buffer; extension: string }
    >();
    if (!imagesZip?.buffer) return images;

    if (extname(imagesZip.originalname || "").toLowerCase() !== ".zip") {
      throw new BadRequestException("Product images must be provided as a ZIP file");
    }

    let zip: AdmZip;
    try {
      zip = new AdmZip(imagesZip.buffer);
    } catch {
      throw new BadRequestException("The product images ZIP is invalid");
    }

    const allowed = new Set([".jpg", ".jpeg", ".png", ".webp"]);
    const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
    if (entries.length > 2000) {
      throw new BadRequestException("The ZIP may contain at most 2,000 files");
    }

    for (const entry of entries) {
      const fileName = parse(entry.entryName.replaceAll("\\", "/")).base;
      const extension = extname(fileName).toLowerCase();
      if (!allowed.has(extension)) continue;
      if (entry.header.size > 8 * 1024 * 1024) {
        throw new BadRequestException(`${fileName} is larger than 8 MB`);
      }

      const data = entry.getData();
      if (data.length > 8 * 1024 * 1024) {
        throw new BadRequestException(`${fileName} is larger than 8 MB`);
      }

      const image = { data, extension };
      images.set(`file:${fileName.toLowerCase()}`, image);
      images.set(`code:${parse(fileName).name.toLowerCase()}`, image);
    }

    return images;
  }

  async updateProduct(id: number, body: any): Promise<Product> {
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
  addCustomer(body: any) {
    return this.customers.save(this.customers.create(body));
  }
  updateCustomer(id: number, body: any) {
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
  async stats() {
    const customers = await this.customers.count();
    const orders = await this.orders.find();
    const now = new Date();
    return {
      customers,
      today: orders.filter(
        (o) => o.orderDate === now.toISOString().slice(0, 10),
      ).length,
      week: orders.filter(
        (o) => Date.now() - new Date(o.orderDate).getTime() < 604800000,
      ).length,
      month: orders.filter(
        (o) => new Date(o.orderDate).getMonth() === now.getMonth(),
      ).length,
    };
  }
}
@Controller()
export class CrudController {
  constructor(private s: CrudService) {}
  @Get("categories") categories() {
    return this.s.categoriesAll();
  }
  @Post("categories") addCategory(@Body() b: any) {
    return this.s.addCategory(b.name);
  }
  @Delete("categories/:id") delCategory(@Param("id", ParseIntPipe) id: number) {
    return this.s.deleteCategory(id);
  }
  @Get("products") products(@Query("search") q = "") {
    return this.s.productsAll(q);
  }
  @Post("products") addProduct(@Body() b: any) {
    return this.s.addProduct(b);
  }
  @Post("products/bulk-upload")
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "file", maxCount: 1 },
        { name: "images", maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { files: 2, fileSize: 100 * 1024 * 1024 },
      },
    ),
  )
  bulkUploadProducts(
    @UploadedFiles()
    files: { file?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const spreadsheet = files?.file?.[0];
    const imagesZip = files?.images?.[0];
    if (spreadsheet?.size > 10 * 1024 * 1024) {
      throw new BadRequestException("Spreadsheet must be 10 MB or smaller");
    }
    return this.s.bulkUploadProducts(spreadsheet, imagesZip);
  }
  @Patch("products/:id") editProduct(
    @Param("id", ParseIntPipe) id: number,
    @Body() b: any,
  ) {
    return this.s.updateProduct(id, b);
  }
  @Delete("products/all") clearProducts() {
    return this.s.clearProducts();
  }
  @Delete("products/:id") delProduct(@Param("id", ParseIntPipe) id: number) {
    return this.s.deleteProduct(id);
  }
  @Get("customers") customers(@Query("search") q = "") {
    return this.s.customersAll(q);
  }
  @Post("customers") addCustomer(@Body() b: any) {
    return this.s.addCustomer(b);
  }
  @Patch("customers/:id") editCustomer(
    @Param("id", ParseIntPipe) id: number,
    @Body() b: any,
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
  @Get("dashboard/stats") stats() {
    return this.s.stats();
  }
}
