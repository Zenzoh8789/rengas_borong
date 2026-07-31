import { Repository } from "typeorm";
import { DesignSetting, Notification, Product } from "./entities";
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
    importPrices(file: any): Promise<{
        updated: number;
        missing: number;
        total: number;
    }>;
    getDesign(): Promise<DesignSetting>;
    saveDesign(body: Partial<DesignSetting>): Promise<DesignSetting>;
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
    importPrice(file: any): Promise<{
        updated: number;
        missing: number;
        total: number;
    }>;
    design(): Promise<DesignSetting>;
    saveDesign(body: any): Promise<DesignSetting>;
}
