import { Repository } from "typeorm";
import { DesignSetting, Notification, Product, Role } from "../entities";
import { UpdateDesignDto } from "./design.dto";
export declare class FeaturesService {
    private notifications;
    private products;
    private designs;
    constructor(notifications: Repository<Notification>, products: Repository<Product>, designs: Repository<DesignSetting>);
    listNotifications(role: Role): Promise<Notification[]>;
    unreadCount(role: Role): Promise<{
        count: number;
    }>;
    readNotification(id: number, role: Role): Promise<{
        success: boolean;
    }>;
    readAll(role: Role): Promise<{
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
    saveDesign(body: UpdateDesignDto): Promise<DesignSetting>;
    private normalizeHeader;
    private normalizeCode;
    private normalizePrice;
}
export declare class FeaturesController {
    private service;
    constructor(service: FeaturesService);
    notifications(req: {
        user: {
            role: Role;
        };
    }): Promise<Notification[]>;
    count(req: {
        user: {
            role: Role;
        };
    }): Promise<{
        count: number;
    }>;
    readAll(req: {
        user: {
            role: Role;
        };
    }): Promise<{
        success: boolean;
    }>;
    read(id: number, req: {
        user: {
            role: Role;
        };
    }): Promise<{
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
    saveDesign(body: UpdateDesignDto): Promise<DesignSetting>;
}
