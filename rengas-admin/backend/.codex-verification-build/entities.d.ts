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
    imageUrl: string | null;
    catalogueEnabled: boolean;
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
    email?: string;
    passwordHash?: string;
    phoneVerifiedAt?: Date | null;
    otpHash?: string | null;
    otpExpiresAt?: Date | null;
    otpAttempts: number;
    resetOtpHash?: string | null;
    resetOtpExpiresAt?: Date | null;
    resetOtpAttempts: number;
    resetTokenHash?: string | null;
    resetTokenExpiresAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare enum OrderStatus {
    ACCEPTED = "ACCEPTED",
    PACKED = "PACKED",
    SHIPPED = "SHIPPED",
    DELIVERED = "DELIVERED"
}
export declare class Order {
    id: number;
    orderNo: string;
    customer: Customer;
    orderDate: string;
    createdAt: Date | null;
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
    recipientRole: Role;
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
