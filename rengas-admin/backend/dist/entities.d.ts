export declare enum Role {
    ADMIN = "ADMIN",
    ORDER_ADMIN = "ORDER_ADMIN",
    CUSTOMER = "CUSTOMER"
}
export declare class User {
    id: number;
    username: string;
    passwordHash: string;
    role: Role;
}
export declare class Category {
    id: number;
    name: string;
    products: Product[];
}
export declare class Product {
    id: number;
    code: string;
    description: string;
    category: Category;
    uom: string;
    price: number;
    imageUrl: string;
    createdAt: Date;
}
export declare class Customer {
    id: number;
    name: string;
    companyName?: string;
    tinNumber?: string;
    address?: string;
    phoneNumber?: string;
    whatsappNumber?: string;
}
export declare enum OrderStatus {
    VIEW = "VIEW",
    MODIFIED = "MODIFIED",
    PRINTED = "PRINTED"
}
export declare class Order {
    id: number;
    orderNo: string;
    customer: Customer;
    orderDate: string;
    status: OrderStatus;
    items: OrderItem[];
}
export declare class OrderItem {
    id: number;
    order: Order;
    product: Product;
    quantity: number;
    unitPrice: number;
}
export declare enum NotificationType {
    INFO = "INFO",
    SUCCESS = "SUCCESS",
    WARNING = "WARNING"
}
export declare class Notification {
    id: number;
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    createdAt: Date;
}
export declare class DesignSetting {
    id: number;
    topBannerUrl: string;
    productPhotoUrl: string;
    footerImageUrl: string;
    updatedAt: Date;
}
