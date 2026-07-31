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
exports.CrudController = exports.CrudService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const AdmZip = require("adm-zip");
const XLSX = require("xlsx");
const entities_1 = require("./entities");
let CrudService = class CrudService {
    products;
    categories;
    customers;
    orders;
    orderItems;
    notifications;
    constructor(products, categories, customers, orders, orderItems, notifications) {
        this.products = products;
        this.categories = categories;
        this.customers = customers;
        this.orders = orders;
        this.orderItems = orderItems;
        this.notifications = notifications;
    }
    categoriesAll() {
        return this.categories.find({
            relations: { products: true },
            order: { name: "ASC" },
        });
    }
    async notify(title, message, type = entities_1.NotificationType.SUCCESS) {
        await this.notifications.save(this.notifications.create({ title, message, type }));
    }
    async addCategory(name) {
        const saved = await this.categories.save(this.categories.create({ name: name.trim().toUpperCase() }));
        await this.notify("Category added", `${saved.name} is ready for products`);
        return saved;
    }
    async deleteCategory(id) {
        const category = await this.categories.findOneBy({ id });
        const result = await this.categories.delete(id);
        if (category)
            await this.notify("Category removed", category.name, entities_1.NotificationType.WARNING);
        return result;
    }
    productsAll(search = "") {
        return this.products.find({
            where: search
                ? [
                    { code: (0, typeorm_2.ILike)(`%${search}%`) },
                    { description: (0, typeorm_2.ILike)(`%${search}%`) },
                ]
                : {},
            order: { createdAt: "DESC" },
        });
    }
    async addProduct(body) {
        const category = await this.categories.findOneByOrFail({
            id: Number(body.categoryId),
        });
        const product = this.products.create({
            code: String(body.code),
            description: String(body.description),
            category,
            uom: String(body.uom || "PKT"),
            price: Number(body.price || 0),
            imageUrl: body.imageUrl || null,
        });
        const saved = await this.products.save(product);
        await this.notify("Product added", `${saved.code} · ${saved.description}`);
        return saved;
    }
    async bulkUploadProducts(file, imagesZip) {
        if (!file?.buffer) {
            throw new common_1.BadRequestException("Please select a valid Excel or CSV file");
        }
        const spreadsheetExtension = (0, node_path_1.extname)(file.originalname || "").toLowerCase();
        if (![".csv", ".xls", ".xlsx"].includes(spreadsheetExtension)) {
            throw new common_1.BadRequestException("Only CSV, XLS, and XLSX files are supported");
        }
        const images = this.readProductImages(imagesZip);
        const uploadDirectory = (0, node_path_1.join)(process.cwd(), "uploads", "products");
        await (0, promises_1.mkdir)(uploadDirectory, { recursive: true });
        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors = [];
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const excelRow = rowIndex + 2;
            const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [
                key.trim().toLowerCase().replace(/[^a-z0-9]/g, ""),
                value,
            ]));
            const value = (...keys) => {
                for (const key of keys) {
                    const found = normalized[key];
                    if (found !== undefined && String(found).trim() !== "") {
                        return found;
                    }
                }
                return "";
            };
            const code = String(value("code", "productcode", "itemcode", "stockcode", "sku")).trim();
            const description = String(value("description", "productdescription", "itemdescription", "productname", "itemname", "stockitem", "name")).trim() || code;
            const categoryName = (String(value("category", "categoryname", "productcategory", "itemgroup", "group")).trim() || "OTHERS").toUpperCase();
            const uom = (String(value("uom", "unit", "unitofmeasure")).trim() || "PKT").toUpperCase();
            const rawPrice = value("price", "rate", "sellingprice", "unitprice", "amount");
            const price = Number(String(rawPrice || "0")
                .replace(/,/g, "")
                .replace(/[^\d.-]/g, ""));
            const imageUrl = String(value("image", "imageurl", "productimage", "photo", "photourl")).trim();
            if (!code || Number.isNaN(price)) {
                skipped++;
                errors.push({ row: excelRow, message: "Code or Price is invalid" });
                continue;
            }
            try {
                let category = await this.categories.findOne({
                    where: { name: (0, typeorm_2.ILike)(categoryName) },
                });
                if (!category) {
                    category = await this.categories.save(this.categories.create({ name: categoryName }));
                }
                const existing = await this.products.findOne({ where: { code } });
                let savedImageUrl = existing?.imageUrl || null;
                if (/^https?:\/\//i.test(imageUrl)) {
                    savedImageUrl = imageUrl;
                }
                else {
                    const requestedFile = imageUrl
                        ? (0, node_path_1.parse)(imageUrl.replaceAll("\\", "/")).base.toLowerCase()
                        : "";
                    const image = (requestedFile && images.get(`file:${requestedFile}`)) ||
                        images.get(`code:${code.toLowerCase()}`);
                    if (image) {
                        const safeCode = code.replace(/[^a-zA-Z0-9_-]/g, "_");
                        const storedName = `${safeCode}-${Date.now()}-${rowIndex}${image.extension}`;
                        await (0, promises_1.writeFile)((0, node_path_1.join)(uploadDirectory, storedName), image.data);
                        savedImageUrl = `/uploads/products/${storedName}`;
                    }
                    else if (requestedFile) {
                        throw new Error(`Image "${imageUrl}" was not found in the ZIP`);
                    }
                }
                if (existing) {
                    existing.description = description;
                    existing.category = category;
                    existing.uom = uom;
                    existing.price = price;
                    existing.imageUrl = savedImageUrl;
                    await this.products.save(existing);
                    updated++;
                }
                else {
                    await this.products.save(this.products.create({
                        code,
                        description,
                        category,
                        uom,
                        price,
                        imageUrl: savedImageUrl,
                    }));
                    created++;
                }
            }
            catch (error) {
                skipped++;
                errors.push({
                    row: excelRow,
                    message: error instanceof Error ? error.message : "Import failed",
                });
            }
        }
        await this.notify("Bulk upload completed", `${created} created · ${updated} updated · ${skipped} skipped`);
        return {
            total: rows.length,
            created,
            updated,
            skipped,
            errors: errors.slice(0, 100),
        };
    }
    readProductImages(imagesZip) {
        const images = new Map();
        if (!imagesZip?.buffer)
            return images;
        if ((0, node_path_1.extname)(imagesZip.originalname || "").toLowerCase() !== ".zip") {
            throw new common_1.BadRequestException("Product images must be provided as a ZIP file");
        }
        let zip;
        try {
            zip = new AdmZip(imagesZip.buffer);
        }
        catch {
            throw new common_1.BadRequestException("The product images ZIP is invalid");
        }
        const allowed = new Set([".jpg", ".jpeg", ".png", ".webp"]);
        const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
        if (entries.length > 2000) {
            throw new common_1.BadRequestException("The ZIP may contain at most 2,000 files");
        }
        for (const entry of entries) {
            const fileName = (0, node_path_1.parse)(entry.entryName.replaceAll("\\", "/")).base;
            const extension = (0, node_path_1.extname)(fileName).toLowerCase();
            if (!allowed.has(extension))
                continue;
            if (entry.header.size > 8 * 1024 * 1024) {
                throw new common_1.BadRequestException(`${fileName} is larger than 8 MB`);
            }
            const data = entry.getData();
            if (data.length > 8 * 1024 * 1024) {
                throw new common_1.BadRequestException(`${fileName} is larger than 8 MB`);
            }
            const image = { data, extension };
            images.set(`file:${fileName.toLowerCase()}`, image);
            images.set(`code:${(0, node_path_1.parse)(fileName).name.toLowerCase()}`, image);
        }
        return images;
    }
    async updateProduct(id, body) {
        const product = await this.products.findOneByOrFail({ id });
        const category = await this.categories.findOneByOrFail({
            id: Number(body.categoryId),
        });
        product.code = String(body.code).trim();
        product.description = String(body.description).trim();
        product.category = category;
        product.uom = String(body.uom || "PKT");
        product.price = Number(body.price || 0);
        product.imageUrl = body.imageUrl || null;
        const saved = await this.products.save(product);
        await this.notify("Product updated", `${saved.code} · ${saved.description}`);
        return saved;
    }
    async deleteProduct(id) {
        const product = await this.products.findOneBy({ id });
        const result = await this.products.delete(id);
        if (product)
            await this.notify("Product deleted", product.code, entities_1.NotificationType.WARNING);
        return result;
    }
    async clearProducts() {
        await this.orderItems.createQueryBuilder().delete().execute();
        const result = await this.products.createQueryBuilder().delete().execute();
        await this.notify("All products removed", `${result.affected || 0} products were removed`, entities_1.NotificationType.WARNING);
        return {
            success: true,
            removed: result.affected || 0,
        };
    }
    customersAll(search = "") {
        return this.customers.find({
            where: search ? { name: (0, typeorm_2.ILike)(`%${search}%`) } : {},
            order: { name: "ASC" },
        });
    }
    addCustomer(body) {
        return this.customers.save(this.customers.create(body));
    }
    updateCustomer(id, body) {
        return this.customers.update(id, body);
    }
    deleteCustomer(id) {
        return this.customers.delete(id);
    }
    clearCustomers() {
        return this.customers.clear();
    }
    ordersAll() {
        return this.orders.find({ order: { orderDate: "DESC" } });
    }
    async stats() {
        const customers = await this.customers.count();
        const orders = await this.orders.find();
        const now = new Date();
        return {
            customers,
            today: orders.filter((o) => o.orderDate === now.toISOString().slice(0, 10)).length,
            week: orders.filter((o) => Date.now() - new Date(o.orderDate).getTime() < 604800000).length,
            month: orders.filter((o) => new Date(o.orderDate).getMonth() === now.getMonth()).length,
        };
    }
};
exports.CrudService = CrudService;
exports.CrudService = CrudService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Category)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.Customer)),
    __param(3, (0, typeorm_1.InjectRepository)(entities_1.Order)),
    __param(4, (0, typeorm_1.InjectRepository)(entities_1.OrderItem)),
    __param(5, (0, typeorm_1.InjectRepository)(entities_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CrudService);
let CrudController = class CrudController {
    s;
    constructor(s) {
        this.s = s;
    }
    categories() {
        return this.s.categoriesAll();
    }
    addCategory(b) {
        return this.s.addCategory(b.name);
    }
    delCategory(id) {
        return this.s.deleteCategory(id);
    }
    products(q = "") {
        return this.s.productsAll(q);
    }
    addProduct(b) {
        return this.s.addProduct(b);
    }
    bulkUploadProducts(files) {
        const spreadsheet = files?.file?.[0];
        const imagesZip = files?.images?.[0];
        if (spreadsheet?.size > 10 * 1024 * 1024) {
            throw new common_1.BadRequestException("Spreadsheet must be 10 MB or smaller");
        }
        return this.s.bulkUploadProducts(spreadsheet, imagesZip);
    }
    editProduct(id, b) {
        return this.s.updateProduct(id, b);
    }
    clearProducts() {
        return this.s.clearProducts();
    }
    delProduct(id) {
        return this.s.deleteProduct(id);
    }
    customers(q = "") {
        return this.s.customersAll(q);
    }
    addCustomer(b) {
        return this.s.addCustomer(b);
    }
    editCustomer(id, b) {
        return this.s.updateCustomer(id, b);
    }
    clearCustomers() {
        return this.s.clearCustomers();
    }
    delCustomer(id) {
        return this.s.deleteCustomer(id);
    }
    orders() {
        return this.s.ordersAll();
    }
    stats() {
        return this.s.stats();
    }
};
exports.CrudController = CrudController;
__decorate([
    (0, common_1.Get)("categories"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "categories", null);
__decorate([
    (0, common_1.Post)("categories"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "addCategory", null);
__decorate([
    (0, common_1.Delete)("categories/:id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "delCategory", null);
__decorate([
    (0, common_1.Get)("products"),
    __param(0, (0, common_1.Query)("search")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "products", null);
__decorate([
    (0, common_1.Post)("products"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "addProduct", null);
__decorate([
    (0, common_1.Post)("products/bulk-upload"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: "file", maxCount: 1 },
        { name: "images", maxCount: 1 },
    ], {
        storage: (0, multer_1.memoryStorage)(),
        limits: { files: 2, fileSize: 100 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "bulkUploadProducts", null);
__decorate([
    (0, common_1.Patch)("products/:id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "editProduct", null);
__decorate([
    (0, common_1.Delete)("products/all"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "clearProducts", null);
__decorate([
    (0, common_1.Delete)("products/:id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "delProduct", null);
__decorate([
    (0, common_1.Get)("customers"),
    __param(0, (0, common_1.Query)("search")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "customers", null);
__decorate([
    (0, common_1.Post)("customers"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "addCustomer", null);
__decorate([
    (0, common_1.Patch)("customers/:id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "editCustomer", null);
__decorate([
    (0, common_1.Delete)("customers/all"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "clearCustomers", null);
__decorate([
    (0, common_1.Delete)("customers/:id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "delCustomer", null);
__decorate([
    (0, common_1.Get)("orders"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "orders", null);
__decorate([
    (0, common_1.Get)("dashboard/stats"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "stats", null);
exports.CrudController = CrudController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [CrudService])
], CrudController);
//# sourceMappingURL=crud.js.map