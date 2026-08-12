import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Post,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { Repository } from "typeorm";
import { Customer, Order, OrderItem, OrderStatus, Product } from "../entities";

class StoreOrderItemDto {
  @IsInt() @Min(1) productId: number;
  @IsNumber() @Min(0.01) quantity: number;
}
class StoreCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsString()
  @IsNotEmpty()
  tinNumber: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
class CreateStoreOrderDto {
  @ValidateNested() @Type(() => StoreCustomerDto) customer: StoreCustomerDto;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreOrderItemDto)
  items: StoreOrderItemDto[];
}

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Product) private products: Repository<Product>,
    @InjectRepository(Customer) private customers: Repository<Customer>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(OrderItem) private orderItems: Repository<OrderItem>,
  ) {}

  private splitProductVariant(description: string) {
    const value = description.trim();
    const variantPattern =
      /\s+(\d+(?:\.\d+)?\s*(?:KG|KGS|G|GM|GMS|ML|L|LTR|LTRS|PCS?|PKTS?|PACKS?|BOX(?:ES)?|CTNS?|BAGS?|BOTTLES?|TINS?|['’]S)(?:\s*[Xx*]\s*\d+(?:\.\d+)?\s*(?:KG|KGS|G|GM|GMS|ML|L|LTR|LTRS|PCS?|PKTS?))?(?:\s*\([^)]*\))?)$/i;
    const match = value.match(variantPattern);
    if (!match) return { name: value, variant: "" };
    return {
      name: value.slice(0, match.index).trim(),
      variant: match[1].replace(/\s+/g, " ").toUpperCase(),
    };
  }

  async groupedProducts() {
    const rows = await this.products.find({ order: { description: "ASC" } });
    const groups = new Map<string, any>();
    for (const row of rows) {
      const parsed = this.splitProductVariant(row.description);
      const key = `${row.category?.id || 0}:${parsed.name.toUpperCase()}`;
      if (!groups.has(key))
        groups.set(key, {
          id: row.id,
          code: row.code,
          name: parsed.name,
          subtitle: "",
          category: row.category,
          imageUrl: row.imageUrl,
          uoms: [],
        });
      if (!groups.get(key).imageUrl && row.imageUrl)
        groups.get(key).imageUrl = row.imageUrl;
      groups.get(key).uoms.push({
        id: row.id,
        productId: row.id,
        name: parsed.variant || row.uom,
        price: Number(row.price),
        pack: `${row.uom} • ${row.code}`,
      });
    }
    return [...groups.values()];
  }

  async createOrder(input: CreateStoreOrderDto) {
    if (!input.items?.length) {
      throw new BadRequestException("Add at least one item");
    }

    /*
     * Validate products before creating the customer
     * or order.
     */
    const ids = input.items.map((item) => item.productId);

    const products = await this.products.findByIds(ids);

    if (products.length !== new Set(ids).size) {
      throw new BadRequestException("One or more products no longer exist");
    }

    /*
     * Find or create customer.
     */
    let customer = input.customer.phoneNumber
      ? await this.customers.findOneBy({
          phoneNumber: input.customer.phoneNumber,
        })
      : null;

    if (!customer) {
      customer = await this.customers.save(
        this.customers.create({
          name: input.customer.name,
          companyName: input.customer.companyName,
          tinNumber: input.customer.tinNumber,
          phoneNumber: input.customer.phoneNumber,
          whatsappNumber: input.customer.whatsappNumber,
          address: input.customer.address,
        }),
      );
    } else {
      customer.name = input.customer.name;
      customer.companyName = input.customer.companyName;
      customer.tinNumber = input.customer.tinNumber;
      customer.phoneNumber = input.customer.phoneNumber;
      customer.whatsappNumber = input.customer.whatsappNumber;
      customer.address = input.customer.address;

      customer = await this.customers.save(customer);
    }

    /*
     * First save the order without items.
     * This creates the order ID.
     */
    let order = await this.orders.save(
      this.orders.create({
        orderNo: `TEMP-${Date.now()}`,
        orderDate: new Date().toISOString().slice(0, 10),
        status: OrderStatus.VIEW,
        customer,
        items: [],
      }),
    );

    order.orderNo = `RB-${String(order.id).padStart(3, "0")}`;
    order = await this.orders.save(order);

    /*
     * The order now has an ID.
     * Save order items separately with that order.
     */
    const lines = input.items.map((item) => {
      const product = products.find(
        (currentProduct) => currentProduct.id === item.productId,
      );

      if (!product) {
        throw new BadRequestException(
          `Product ${item.productId} no longer exists`,
        );
      }

      return this.orderItems.create({
        order,
        product,
        quantity: item.quantity,
        unitPrice: Number(product.price),
      });
    });

    await this.orderItems.save(lines);

    /*
     * Return the completed order with customer
     * and items.
     */
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

  async getOrders() {
  const orders = await this.orders.find({
    relations: {
      customer: true,
      items: {
        product: true,
      },
    },
    order: {
      id: "DESC",
    },
  });

  return orders.map((order) => {
    const total = order.items.reduce(
      (sum, item) =>
        sum + Number(item.quantity) * Number(item.unitPrice),
      0,
    );

    const itemCount = order.items.reduce(
      (sum, item) => sum + Number(item.quantity),
      0,
    );

    return {
      id: order.id,
      orderNo: order.orderNo,
      date: order.orderDate,
      status: order.status,
      itemCount,
      total,
      customer: {
        id: order.customer?.id,
        name: order.customer?.name || "",
        companyName: order.customer?.companyName || "",
        tinNumber: order.customer?.tinNumber || "",
        phoneNumber: order.customer?.phoneNumber || "",
        whatsappNumber: order.customer?.whatsappNumber || "",
        address: order.customer?.address || "",
      },
      items: order.items.map((item) => ({
        id: item.id,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        amount: Number(item.quantity) * Number(item.unitPrice),
        product: {
          id: item.product.id,
          code: item.product.code,
          name: item.product.description,
          imageUrl: item.product.imageUrl,
        },
      })),
    };
  });
}
}

@Controller("store")
export class StoreController {
  constructor(private readonly store: StoreService) {}

  @Get("products")
  products() {
    return this.store.groupedProducts();
  }

  @Get("orders")
  getOrders() {
    return this.store.getOrders();
  }

  @Post("orders")
  async createOrder(@Body() input: CreateStoreOrderDto) {
    try {
      return await this.store.createOrder(input);
    } catch (error) {
      console.error("CREATE ORDER FAILED:", error);
      throw error;
    }
  }
}
