import { Repository } from "typeorm";
import { Category, Customer, Order, OrderItem, OrderStatus, Product } from "../entities";
import { CustomerRequest } from "../auth/customer-auth.guard";
declare class StoreOrderItemDto {
    productId: number;
    quantity: number;
}
declare class LegacyStoreCustomerDto {
    name?: string;
    companyName?: string;
    tinNumber?: string;
    phoneNumber?: string;
    whatsappNumber?: string;
    address?: string;
}
declare class CreateStoreOrderDto {
    customer?: LegacyStoreCustomerDto;
    items: StoreOrderItemDto[];
}
export declare class StoreService {
    private products;
    private categories;
    private customers;
    private orders;
    private orderItems;
    constructor(products: Repository<Product>, categories: Repository<Category>, customers: Repository<Customer>, orders: Repository<Order>, orderItems: Repository<OrderItem>);
    listCategories(): Promise<{
        id: number;
        name: string;
    }[]>;
    listProducts(): Promise<{
        id: number;
        code: string;
        name: string;
        subtitle: string;
        category: Category;
        imageUrl: string;
        uoms: {
            id: number;
            productId: number;
            name: string;
            price: number;
            pack: string;
        }[];
    }[]>;
    createOrder(customerId: number, input: CreateStoreOrderDto): Promise<Order>;
    recentOrders(customerId: number): Promise<{
        id: number;
        orderNo: string;
        date: string;
        status: OrderStatus;
    }[]>;
    getOrders(customerId: number): Promise<{
        id: number;
        orderNo: string;
        date: string;
        status: OrderStatus;
        itemCount: number;
        total: number;
        customer: {
            id: number;
            name: string;
            companyName: string;
            tinNumber: string;
            phoneNumber: string;
            whatsappNumber: string;
            address: string;
        };
        items: {
            id: number;
            uom: string;
            uomId: number;
            quantity: number;
            unitPrice: number;
            amount: number;
            product: {
                id: number;
                code: string;
                name: string;
                imageUrl: string;
            };
        }[];
    }[]>;
}
export declare class StoreController {
    private readonly store;
    constructor(store: StoreService);
    products(): Promise<{
        id: number;
        code: string;
        name: string;
        subtitle: string;
        category: Category;
        imageUrl: string;
        uoms: {
            id: number;
            productId: number;
            name: string;
            price: number;
            pack: string;
        }[];
    }[]>;
    categories(): Promise<{
        id: number;
        name: string;
    }[]>;
    recentOrders(request: CustomerRequest): Promise<{
        id: number;
        orderNo: string;
        date: string;
        status: OrderStatus;
    }[]>;
    getOrders(request: CustomerRequest): Promise<{
        id: number;
        orderNo: string;
        date: string;
        status: OrderStatus;
        itemCount: number;
        total: number;
        customer: {
            id: number;
            name: string;
            companyName: string;
            tinNumber: string;
            phoneNumber: string;
            whatsappNumber: string;
            address: string;
        };
        items: {
            id: number;
            uom: string;
            uomId: number;
            quantity: number;
            unitPrice: number;
            amount: number;
            product: {
                id: number;
                code: string;
                name: string;
                imageUrl: string;
            };
        }[];
    }[]>;
    createOrder(request: CustomerRequest, input: CreateStoreOrderDto): Promise<Order>;
}
export {};
