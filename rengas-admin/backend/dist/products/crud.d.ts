import { Repository } from "typeorm";
import { Category, Customer, Notification, NotificationType, Order, OrderItem, Product } from "../entities";
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
    productsAll(search?: string): Promise<Product[]>;
    addProduct(body: any): Promise<Product>;
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
    updateProduct(id: number, body: any): Promise<Product>;
    deleteProduct(id: number): Promise<import("typeorm").DeleteResult>;
    clearProducts(): Promise<{
        success: boolean;
        removed: number;
    }>;
    customersAll(search?: string): Promise<Customer[]>;
    addCustomer(body: any): Promise<Customer[]>;
    updateCustomer(id: number, body: any): Promise<import("typeorm").UpdateResult>;
    deleteCustomer(id: number): Promise<import("typeorm").DeleteResult>;
    clearCustomers(): Promise<void>;
    ordersAll(): Promise<Order[]>;
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
    addCategory(b: any): Promise<Category>;
    delCategory(id: number): Promise<import("typeorm").DeleteResult>;
    products(q?: string): Promise<Product[]>;
    addProduct(b: any): Promise<Product>;
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
    editProduct(id: number, b: any): Promise<Product>;
    clearProducts(): Promise<{
        success: boolean;
        removed: number;
    }>;
    delProduct(id: number): Promise<import("typeorm").DeleteResult>;
    customers(q?: string): Promise<Customer[]>;
    addCustomer(b: any): Promise<Customer[]>;
    editCustomer(id: number, b: any): Promise<import("typeorm").UpdateResult>;
    clearCustomers(): Promise<void>;
    delCustomer(id: number): Promise<import("typeorm").DeleteResult>;
    orders(): Promise<Order[]>;
    stats(): Promise<{
        customers: number;
        today: number;
        week: number;
        month: number;
    }>;
}
