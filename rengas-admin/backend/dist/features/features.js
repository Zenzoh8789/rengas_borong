"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeaturesController = exports.FeaturesService = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const XLSX = require("xlsx");
const entities_1 = require("../entities");
let FeaturesService = class FeaturesService {
    notifications;
    products;
    designs;
    constructor(notifications, products, designs) {
        this.notifications = notifications;
        this.products = products;
        this.designs = designs;
    }
    listNotifications() {
        return this.notifications.find({
            order: { createdAt: "DESC" },
            take: 20,
        });
    }
    unreadCount() {
        return this.notifications
            .count({ where: { isRead: false } })
            .then((count) => ({ count }));
    }
    async readNotification(id) {
        await this.notifications.update(id, { isRead: true });
        return { success: true };
    }
    async readAll() {
        await this.notifications.update({ isRead: false }, { isRead: true });
        return { success: true };
    }
    async importPrices(file) {
        if (!file?.buffer?.length) {
            throw new common_1.BadRequestException("Select a CSV or Excel file.");
        }
        let workbook;
        try {
            workbook = XLSX.read(file.buffer, {
                type: "buffer",
                raw: false,
            });
        }
        catch {
            throw new common_1.BadRequestException("The selected spreadsheet cannot be read.");
        }
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) {
            throw new common_1.BadRequestException("The spreadsheet does not contain a sheet.");
        }
        const rows = XLSX.utils.sheet_to_json(firstSheet, {
            defval: "",
            raw: false,
        });
        if (!rows.length) {
            throw new common_1.BadRequestException("The spreadsheet does not contain data.");
        }
        const headers = Object.keys(rows[0]);
        const codeHeader = headers.find((header) => this.normalizeHeader(header) === "code");
        const priceHeader = headers.find((header) => this.normalizeHeader(header) === "price");
        if (!codeHeader || !priceHeader) {
            throw new common_1.BadRequestException('The spreadsheet must contain columns named "Code" and "Price".');
        }
        const pricesByCode = new Map();
        let invalid = 0;
        let duplicates = 0;
        for (const row of rows) {
            const code = this.normalizeCode(row[codeHeader]);
            const price = this.normalizePrice(row[priceHeader]);
            if (!code || price === null) {
                invalid += 1;
                continue;
            }
            if (pricesByCode.has(code))
                duplicates += 1;
            pricesByCode.set(code, price);
        }
        if (!pricesByCode.size) {
            throw new common_1.BadRequestException(`No prices imported. ${rows.length} rows were skipped. Check the Code and Price columns.`);
        }
        const requestedCodes = [...pricesByCode.keys()];
        const matchedProducts = [];
        for (let index = 0; index < requestedCodes.length; index += 500) {
            const codes = requestedCodes.slice(index, index + 500);
            const matches = await this.products
                .createQueryBuilder("product")
                .where("UPPER(TRIM(product.code)) IN (:...codes)", { codes })
                .getMany();
            matchedProducts.push(...matches);
        }
        const matchedCodes = new Set();
        for (const product of matchedProducts) {
            const code = this.normalizeCode(product.code);
            const price = pricesByCode.get(code);
            if (price === undefined)
                continue;
            product.price = price;
            matchedCodes.add(code);
        }
        if (matchedProducts.length) {
            await this.products.manager.transaction(async (manager) => {
                await manager.save(entities_1.Product, matchedProducts, { chunk: 500 });
            });
        }
        const notFoundCodes = requestedCodes.filter((code) => !matchedCodes.has(code));
        const skipped = invalid + duplicates + notFoundCodes.length;
        await this.notifications.save(this.notifications.create({
            title: "Price import completed",
            message: `${matchedProducts.length} updated · ` +
                `${notFoundCodes.length} codes not found · ` +
                `${invalid} invalid rows`,
            type: entities_1.NotificationType.SUCCESS,
        }));
        return {
            total: rows.length,
            updated: matchedProducts.length,
            skipped,
            invalid,
            duplicates,
            missing: notFoundCodes.length,
            notFoundCodes: notFoundCodes.slice(0, 100),
        };
    }
    async getDesign() {
        let design = await this.designs.findOneBy({ id: 1 });
        if (!design) {
            design = await this.designs.save(this.designs.create({ id: 1 }));
        }
        return design;
    }
    async saveDesign(body) {
        await this.designs.upsert({ id: 1, ...body }, ["id"]);
        await this.notifications.save(this.notifications.create({
            title: "Design updated",
            message: "Catalogue design assets were saved",
            type: entities_1.NotificationType.SUCCESS,
        }));
        return this.getDesign();
    }
    normalizeHeader(value) {
        return String(value ?? "")
            .replace(/^\uFEFF/, "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
    }
    normalizeCode(value) {
        return String(value ?? "")
            .trim()
            .toUpperCase();
    }
    normalizePrice(value) {
        const cleaned = String(value ?? "")
            .trim()
            .replace(/\s/g, "")
            .replace(/^RM/i, "")
            .replace(/,/g, "");
        const price = Number(cleaned);
        return Number.isFinite(price) && price >= 0 ? price : null;
    }
};
exports.FeaturesService = FeaturesService;
exports.FeaturesService = FeaturesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Notification)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.DesignSetting)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], FeaturesService);
let FeaturesController = class FeaturesController {
    service;
    constructor(service) {
        this.service = service;
    }
    notifications() {
        return this.service.listNotifications();
    }
    count() {
        return this.service.unreadCount();
    }
    readAll() {
        return this.service.readAll();
    }
    read(id) {
        return this.service.readNotification(id);
    }
    importPrice(file) {
        return this.service.importPrices(file);
    }
    design() {
        return this.service.getDesign();
    }
    saveDesign(body) {
        return this.service.saveDesign(body);
    }
};
exports.FeaturesController = FeaturesController;
__decorate([
    (0, common_1.Get)("notifications"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FeaturesController.prototype, "notifications", null);
__decorate([
    (0, common_1.Get)("notifications/unread-count"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FeaturesController.prototype, "count", null);
__decorate([
    (0, common_1.Patch)("notifications/read-all"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FeaturesController.prototype, "readAll", null);
__decorate([
    (0, common_1.Patch)("notifications/:id/read"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], FeaturesController.prototype, "read", null);
__decorate([
    (0, common_1.Post)("products/import-price"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file", {
        limits: {
            fileSize: 25 * 1024 * 1024,
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeaturesController.prototype, "importPrice", null);
__decorate([
    (0, common_1.Get)("design-settings"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FeaturesController.prototype, "design", null);
__decorate([
    (0, common_1.Patch)("design-settings"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], FeaturesController.prototype, "saveDesign", null);
exports.FeaturesController = FeaturesController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [FeaturesService])
], FeaturesController);
//# sourceMappingURL=features.js.map