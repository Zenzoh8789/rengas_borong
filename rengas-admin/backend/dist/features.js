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
const entities_1 = require("./entities");
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
        return this.notifications.find({ order: { createdAt: "DESC" }, take: 20 });
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
        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
        let updated = 0, missing = 0;
        for (const row of rows) {
            const code = String(row.Code || row.CODE || row.code || "").trim();
            const price = Number(row.Price || row.PRICE || row.price);
            if (!code || Number.isNaN(price))
                continue;
            const result = await this.products.update({ code }, { price });
            result.affected ? updated++ : missing++;
        }
        await this.notifications.save(this.notifications.create({
            title: "Price import completed",
            message: `${updated} updated · ${missing} codes not found`,
            type: entities_1.NotificationType.SUCCESS,
        }));
        return { updated, missing, total: rows.length };
    }
    async getDesign() {
        let design = await this.designs.findOneBy({ id: 1 });
        if (!design)
            design = await this.designs.save(this.designs.create({ id: 1 }));
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
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("file", { limits: { fileSize: 5 * 1024 * 1024 } })),
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