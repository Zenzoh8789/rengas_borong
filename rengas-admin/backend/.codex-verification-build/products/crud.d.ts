import { StreamableFile } from "@nestjs/common";
import { Repository } from "typeorm";
import { Category, Customer, Notification, NotificationType, Order, OrderItem, Product } from "../entities";
import { CatalogueStatusDto, CreateCategoryDto, CreateCustomerDto, ProductDto, UpdateCustomerDto, UpdateOrderDto } from "./dtos";
export declare class CrudService {
    private products;
    private categories;
    private customers;
    private orders;
    private orderItems;
    private notifications;
    constructor(products: Repository<Product>, categories: Repository<Category>, customers: Repository<Customer>, orders: Repository<Order>, orderItems: Repository<OrderItem>, notifications: Repository<Notification>);
    categoriesAll(): Promise<Category[]>;
    notify(title: string, message: string, type?: NotificationType): Promise<void>;
    addCategory(name: string): Promise<Category>;
    deleteCategory(id: number): Promise<import("typeorm").DeleteResult>;
    productsAll(search?: string): Promise<{
        canDelete: boolean;
        id: number;
        code: string;
        description: string;
        category: Category;
        uom: string;
        price: number;
        imageUrl: string | null;
        catalogueEnabled: boolean;
        createdAt: Date;
    }[]>;
    addProduct(body: ProductDto): Promise<Product>;
    bulkUploadProducts(file: any, imagesZip?: any): Promise<{
        total: number;
        created: number;
        updated: number;
        skipped: number;
        errors: {
            row: number;
            message: string;
        }[];
    }>;
    private readProductImages;
    updateCatalogueStatus(id: number, enabled: boolean): Promise<Product>;
    updateProduct(id: number, body: ProductDto): Promise<Product>;
    deleteProduct(id: number): Promise<import("typeorm").DeleteResult>;
    clearProducts(): Promise<{
        success: boolean;
        removed: number;
    }>;
    customersAll(search?: string): Promise<Customer[]>;
    addCustomer(body: CreateCustomerDto): Promise<Customer>;
    updateCustomer(id: number, body: UpdateCustomerDto): Promise<import("typeorm").UpdateResult>;
    deleteCustomer(id: number): Promise<import("typeorm").DeleteResult>;
    clearCustomers(): Promise<void>;
    ordersAll(): Promise<Order[]>;
    updateOrder(id: number, body: UpdateOrderDto): Promise<Order>;
    deleteOrder(id: number): Promise<import("typeorm").DeleteResult>;
    exportOrders(filters?: {
        date?: string;
        from?: string;
        to?: string;
        month?: string;
        customerId?: number;
    }): Promise<Buffer<ArrayBufferLike>>;
    importCustomers(file?: Express.Multer.File): Promise<{
        imported: number;
    }>;
    stats(): Promise<{
        customers: number;
        today: number;
        week: number;
        month: number;
    }>;
}
export declare class CrudController {
    private s;
    constructor(s: CrudService);
    categories(): Promise<Category[]>;
    addCategory(b: CreateCategoryDto): Promise<Category>;
    delCategory(id: number): Promise<import("typeorm").DeleteResult>;
    products(q?: string): Promise<{
        canDelete: boolean;
        id: number;
        code: string;
        description: string;
        category: Category;
        uom: string;
        price: number;
        imageUrl: string | null;
        catalogueEnabled: boolean;
        createdAt: Date;
    }[]>;
    addProduct(b: ProductDto): Promise<Product>;
    bulkUploadProducts(files: {
        file?: Express.Multer.File[];
        images?: Express.Multer.File[];
    }): Promise<{
        total: number;
        created: number;
        updated: number;
        skipped: number;
        errors: {
            row: number;
            message: string;
        }[];
    }>;
    updateCatalogueStatus(id: number, body: CatalogueStatusDto): Promise<Product>;
    editProduct(id: number, b: ProductDto): Promise<Product>;
    clearProducts(): Promise<{
        success: boolean;
        removed: number;
    }>;
    delProduct(id: number): Promise<import("typeorm").DeleteResult>;
    customers(q?: string): Promise<Customer[]>;
    addCustomer(b: CreateCustomerDto): Promise<Customer>;
    bulkCustomers(files: {
        file?: Express.Multer.File[];
    }): Promise<{
        imported: number;
    }>;
    editCustomer(id: number, b: UpdateCustomerDto): Promise<import("typeorm").UpdateResult>;
    clearCustomers(): Promise<void>;
    delCustomer(id: number): Promise<import("typeorm").DeleteResult>;
    orders(): Promise<Order[]>;
    editOrder(id: number, body: UpdateOrderDto): Promise<Order>;
    delOrder(id: number): Promise<import("typeorm").DeleteResult>;
    exportOrders(date?: string, from?: string, to?: string, month?: string, customerId?: string): Promise<StreamableFile>;
    stats(): Promise<{
        customers: number;
        today: number;
        week: number;
        month: number;
    }>;
}
