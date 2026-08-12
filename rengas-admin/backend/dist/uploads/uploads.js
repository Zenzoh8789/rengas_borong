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
const fs_1 = require("fs");
const path_1 = require("path");
const uploadDirectory = (0, path_1.join)(process.cwd(), "uploads");
if (!(0, fs_1.existsSync)(uploadDirectory)) {
    (0, fs_1.mkdirSync)(uploadDirectory, {
        recursive: true,
    });
}
let UploadsController = class UploadsController {
    upload(file) {
        if (!file) {
            throw new common_1.BadRequestException("Please select a valid image.");
        }
        return {
            imageUrl: `/uploads/${file.filename}`,
        };
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.Post)("image"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)("image", {
        storage: (0, multer_1.diskStorage)({
            destination: uploadDirectory,
            filename: (_request, file, callback) => {
                const extension = (0, path_1.extname)(file.originalname).toLowerCase();
                const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
                callback(null, uniqueName);
            },
        }),
        fileFilter: (_request, file, callback) => {
            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
            ];
            if (!allowedTypes.includes(file.mimetype)) {
                return callback(new common_1.BadRequestException("Only JPG, PNG and WEBP images are allowed."), false);
            }
            callback(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UploadsController.prototype, "upload", null);
exports.UploadsController = UploadsController = __decorate([
    (0, common_1.Controller)("uploads")
], UploadsController);
//# sourceMappingURL=uploads.js.map