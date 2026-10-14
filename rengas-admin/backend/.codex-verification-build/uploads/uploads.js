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
exports.UploadsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const sharpModule = require("sharp");
const storage_1 = require("../storage");
const admin_auth_guard_1 = require("../auth/admin-auth.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const entities_1 = require("../entities");
const upload_validation_1 = require("./upload-validation");
const sharpFactory = (sharpModule.default ?? sharpModule);
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
let UploadsController = class UploadsController {
    async upload(file) {
        if (!file?.buffer) {
            throw new common_1.BadRequestException("Please select a valid image.");
        }
        await (0, upload_validation_1.validateImageBuffer)(file.buffer);
        const uploadDirectory = (0, storage_1.getUploadDirectory)();
        await (0, promises_1.mkdir)(uploadDirectory, { recursive: true });
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
        try {
            const optimized = await sharpFactory(file.buffer, {
                failOn: "error",
                limitInputPixels: upload_validation_1.MAX_IMAGE_PIXELS,
            })
                .rotate()
                .resize({
                width: 1600,
                height: 1600,
                fit: "inside",
                withoutEnlargement: true,
                fastShrinkOnLoad: true,
            })
                .flatten({ background: "#FFFFFF" })
                .jpeg({ quality: 78, progressive: true, chromaSubsampling: "4:2:0" })
                .toBuffer();
            await (0, promises_1.writeFile)((0, node_path_1.join)(uploadDirectory, filename), optimized, { flag: "wx" });
        }
        catch {
            throw new common_1.BadRequestException("The selected file is not a readable image.");
        }
        return { imageUrl: `/uploads/${filename}` };
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.Post)("image"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("image", {
        storage: (0, multer_1.memoryStorage)(),
        limits: { files: 1, fileSize: upload_validation_1.MAX_IMAGE_BYTES },
        fileFilter: (_request, file, callback) => {
            if (!allowedTypes.has(file.mimetype)) {
                return callback(new common_1.BadRequestException("Only JPG, PNG and WEBP images are allowed."), false);
            }
            callback(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "upload", null);
exports.UploadsController = UploadsController = __decorate([
    (0, common_1.UseGuards)(admin_auth_guard_1.AdminAuthGuard),
    (0, roles_decorator_1.Roles)(entities_1.Role.ADMIN),
    (0, common_1.Controller)("uploads")
], UploadsController);
//# sourceMappingURL=uploads.js.map