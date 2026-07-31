import { Repository } from "typeorm";
import { DesignSetting, Notification, Product } from "../entities";
export declare class FeaturesService {
    private notifications;
    private products;
    private designs;
    constructor(notifications: Repository<Notification>, products: Repository<Product>, designs: Repository<DesignSetting>);
    listNotifications(): Promise<Notification[]>;
    unreadCount(): Promise<{
        count: number;
    }>;
    readNotification(id: number): Promise<{
        success: boolean;
    }>;
    readAll(): Promise<{
        success: boolean;
    }>;
    importPrices(file?: Express.Multer.File): Promise<{
        total: number;
        updated: number;
        skipped: number;
        invalid: number;
        duplicates: number;
        missing: number;
        notFoundCodes: string[];
    }>;
    getDesign(): Promise<DesignSetting>;
    saveDesign(body: Partial<DesignSetting>): Promise<DesignSetting>;
    private normalizeHeader;
    private normalizeCode;
    private normalizePrice;
}
export declare class FeaturesController {
    private service;
    constructor(service: FeaturesService);
    notifications(): Promise<Notification[]>;
    count(): Promise<{
        count: number;
    }>;
    readAll(): Promise<{
        success: boolean;
    }>;
    read(id: number): Promise<{
        success: boolean;
    }>;
    importPrice(file?: Express.Multer.File): Promise<{
        total: number;
        updated: number;
        skipped: number;
        invalid: number;
        duplicates: number;
        missing: number;
        notFoundCodes: string[];
    }>;
    design(): Promise<DesignSetting>;
    saveDesign(body: Partial<DesignSetting>): Promise<DesignSetting>;
}
