import { OrderStatus } from "../entities";
export declare class CreateCategoryDto {
    name: string;
}
export declare class ProductDto {
    code: string;
    description: string;
    categoryId: number;
    uom: string;
    price: number;
    imageUrl?: string | null;
}
export declare class CatalogueStatusDto {
    enabled: boolean;
}
export declare class CreateCustomerDto {
    name: string;
    companyName?: string;
    address?: string;
    tinNumber?: string;
    phoneNumber?: string;
    whatsappNumber?: string;
    email?: string;
}
export declare class UpdateCustomerDto {
    name?: string;
    companyName?: string;
    address?: string;
    tinNumber?: string;
    phoneNumber?: string;
    whatsappNumber?: string;
    email?: string;
}
export declare class UpdateOrderItemDto {
    productId: number;
    quantity: number;
    unitPrice: number;
}
export declare class UpdateOrderDto {
    action?: "PRINT";
    orderDate?: string;
    customerId?: number;
    status?: OrderStatus;
    items?: UpdateOrderItemDto[];
}
