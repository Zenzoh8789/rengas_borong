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
const entities_1 = require("../entities");
const storage_1 = require("../storage");
const admin_auth_guard_1 = require("../auth/admin-auth.guard");
const roles_decorator_1 = require("../auth/roles.decorator");
const upload_validation_1 = require("../uploads/upload-validation");
const safe_zip_1 = require("../uploads/safe-zip");
const spreadsheet_1 = require("../uploads/spreadsheet");
const dtos_1 = require("./dtos");
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
    async productsAll(search = "") {
        const products = await this.products.find({
            where: search
                ? [
                    { code: (0, typeorm_2.ILike)(`%${search}%`) },
                    { description: (0, typeorm_2.ILike)(`%${search}%`) },
                ]
                : {},
            order: { createdAt: "DESC" },
        });
        const references = await this.orderItems.createQueryBuilder("item")
            .select("item.product_id", "productId")
            .distinct(true)
            .getRawMany();
        const orderedIds = new Set(references.map(row => Number(row.productId)));
        return products.map(product => ({ ...product, canDelete: !orderedIds.has(product.id) }));
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
            catalogueEnabled: true,
        });
        const saved = await this.products.save(product);
        await this.notify("Product added", `${saved.code} · ${saved.description}`);
        return saved;
    }
    async bulkUploadProducts(file, imagesZip) {
        (0, upload_validation_1.validateSpreadsheetUpload)(file);
        (0, upload_validation_1.validateZipUpload)(imagesZip);
        const images = await this.readProductImages(imagesZip);
        const uploadDirectory = (0, node_path_1.join)((0, storage_1.getUploadDirectory)(), "products");
        await (0, promises_1.mkdir)(uploadDirectory, { recursive: true });
        const rows = await (0, spreadsheet_1.readSpreadsheetRows)(file);
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
    async readProductImages(imagesZip) {
        const images = new Map();
        if (!imagesZip?.buffer)
            return images;
        const allowed = new Set([".jpg", ".jpeg", ".png", ".webp"]);
        const entries = await (0, safe_zip_1.readImageZip)(imagesZip.buffer);
        for (const entry of entries) {
            const normalizedName = entry.fileName;
            const fileName = (0, node_path_1.parse)(normalizedName).base;
            const extension = (0, node_path_1.extname)(fileName).toLowerCase();
            if (!allowed.has(extension))
                continue;
            const data = entry.data;
            await (0, upload_validation_1.validateImageBuffer)(data);
            const image = { data, extension };
            images.set(`file:${fileName.toLowerCase()}`, image);
            images.set(`code:${(0, node_path_1.parse)(fileName).name.toLowerCase()}`, image);
        }
        return images;
    }
    async updateCatalogueStatus(id, enabled) {
        const product = await this.products.findOneByOrFail({ id });
        product.catalogueEnabled = enabled;
        const saved = await this.products.save(product);
        await this.notify(enabled
            ? "Product enabled for catalogue"
            : "Product disabled for catalogue", `${saved.code} · ${saved.description}`);
        return saved;
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
        const referenced = await this.orderItems.count({ where: { product: { id } } });
        if (referenced) {
            throw new common_1.BadRequestException("This product is used in order history and cannot be deleted. Turn catalogue status OFF to hide it from customers.");
        }
        const product = await this.products.findOneBy({ id });
        const result = await this.products.delete(id);
        if (product)
            await this.notify("Product deleted", product.code, entities_1.NotificationType.WARNING);
        return result;
    }
    async clearProducts() {
        if (await this.orderItems.count()) {
            throw new common_1.BadRequestException("Products are used in order history and cannot be cleared. Order history has been preserved.");
        }
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
    async updateOrder(id, body) {
        const order = await this.orders.findOne({
            where: { id },
            relations: {
                customer: true,
                items: {
                    product: true,
                },
            },
        });
        if (!order) {
            throw new common_1.BadRequestException("Order not found");
        }
        if (body.action === "PRINT") {
            return order;
        }
        if (body.orderDate) {
            order.orderDate = body.orderDate;
        }
        if (body.customerId) {
            order.customer = await this.customers.findOneByOrFail({
                id: Number(body.customerId),
            });
        }
        if (Array.isArray(body.items)) {
            await this.orderItems.delete({
                order: {
                    id: order.id,
                },
            });
            const newItems = await Promise.all(body.items.map(async (item) => {
                const product = await this.products.findOneByOrFail({
                    id: Number(item.productId),
                });
                return this.orderItems.create({
                    order,
                    product,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                });
            }));
            await this.orderItems.save(newItems);
            order.items = newItems;
        }
        if (body.status && Object.values(entities_1.OrderStatus).includes(body.status)) {
            order.status = body.status;
        }
        await this.orders.save(order);
        return this.orders.findOneOrFail({
            where: {
                id: order.id,
            },
            relations: {
                customer: true,
                items: {
                    product: true,
                },
            },
        });
    }
    async deleteOrder(id) {
        await this.orderItems.delete({ order: { id } });
        return this.orders.delete(id);
    }
    async exportOrders(filters = {}) {
        const query = this.orders
            .createQueryBuilder("order")
            .leftJoinAndSelect("order.customer", "customer")
            .leftJoinAndSelect("order.items", "item")
            .leftJoinAndSelect("item.product", "product")
            .orderBy("order.orderDate", "DESC")
            .addOrderBy("order.id", "DESC");
        if (filters.date) {
            query.andWhere("order.orderDate = :date", { date: filters.date });
        }
        else if (filters.from && filters.to) {
            query.andWhere("order.orderDate BETWEEN :from AND :to", {
                from: filters.from,
                to: filters.to,
            });
        }
        else if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
            const [year, month] = filters.month.split("-").map(Number);
            const nextMonth = new Date(Date.UTC(year, month, 1))
                .toISOString()
                .slice(0, 7);
            query.andWhere("order.orderDate >= :monthStart AND order.orderDate < :nextMonth", { monthStart: `${filters.month}-01`, nextMonth: `${nextMonth}-01` });
        }
        else if (filters.customerId) {
            query.andWhere("customer.id = :customerId", {
                customerId: filters.customerId,
            });
        }
        const orders = await query.getMany();
        const rows = orders.flatMap((o) => o.items.length ? o.items.map((i) => ({
            "Order ID": o.orderNo, Date: o.orderDate, Status: o.status,
            Customer: o.customer?.name || "", Address: o.customer?.address || "",
            "TIN Number": o.customer?.tinNumber || "", Phone: o.customer?.phoneNumber || "",
            WhatsApp: o.customer?.whatsappNumber || "", "Product Code": i.product?.code || "",
            Product: i.product?.description || "", UOM: i.product?.uom || "",
            Quantity: Number(i.quantity), "Unit Price (RM)": Number(i.unitPrice),
            "Line Total (RM)": Number(i.quantity) * Number(i.unitPrice),
        })) : [{ "Order ID": o.orderNo, Date: o.orderDate, Status: o.status, Customer: o.customer?.name || "" }]);
        return (0, spreadsheet_1.writeRowsToXlsx)(rows, "Orders");
    }
    async importCustomers(file) {
        (0, upload_validation_1.validateSpreadsheetUpload)(file);
        const rows = await (0, spreadsheet_1.readSpreadsheetRows)(file);
        const value = (row, names) => {
            const key = Object.keys(row).find(k => names.includes(k.trim().toLowerCase().replace(/[^a-z0-9]/g, "")));
            return key ? String(row[key]).trim() : "";
        };
        const customers = rows.map(row => this.customers.create({
            name: value(row, ["name", "customername"]), address: value(row, ["address"]),
            tinNumber: value(row, ["tin", "tinnumber"]), phoneNumber: value(row, ["phone", "phonenumber"]),
            whatsappNumber: value(row, ["whatsapp", "whatsappnumber"]),
        })).filter(customer => customer.name);
        if (!customers.length) {
            throw new common_1.BadRequestException("No valid customers found. Use separate columns: Name, Address, TIN Number, Phone Number, WhatsApp Number.");
        }
        if (customers.some(customer => /street\s*,\s*city\s*,\s*state/i.test(customer.address || ""))) {
            throw new common_1.BadRequestException("The address column contains a CSV header. Please upload a correctly separated CSV or Excel sheet.");
        }
        await this.customers.save(customers);
        return { imported: customers.length };
    }
    async stats() {
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const weekStartDate = new Date(now);
        weekStartDate.setUTCDate(weekStartDate.getUTCDate() - 6);
        const weekStart = weekStartDate.toISOString().slice(0, 10);
        const monthStart = `${today.slice(0, 7)}-01`;
        const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
            .toISOString()
            .slice(0, 10);
        const [customers, counts] = await Promise.all([
            this.customers.count(),
            this.orders
                .createQueryBuilder("order")
                .select("COUNT(CASE WHEN order.orderDate = :today THEN 1 END)", "today")
                .addSelect("COUNT(CASE WHEN order.orderDate BETWEEN :weekStart AND :today THEN 1 END)", "week")
                .addSelect("COUNT(CASE WHEN order.orderDate >= :monthStart AND order.orderDate < :nextMonth THEN 1 END)", "month")
                .setParameters({ today, weekStart, monthStart, nextMonth })
                .getRawOne(),
        ]);
        return {
            customers,
            today: Number(counts?.today || 0),
            week: Number(counts?.week || 0),
            month: Number(counts?.month || 0),
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
        if (spreadsheet?.size && spreadsheet.size > upload_validation_1.MAX_SPREADSHEET_BYTES) {
            throw new common_1.BadRequestException("Spreadsheet must be 5 MB or smaller");
        }
        return this.s.bulkUploadProducts(spreadsheet, imagesZip);
    }
    updateCatalogueStatus(id, body) {
        if (typeof body.enabled !== "boolean") {
            throw new common_1.BadRequestException("enabled must be true or false");
        }
        return this.s.updateCatalogueStatus(id, body.enabled);
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
    bulkCustomers(files) {
        return this.s.importCustomers(files?.file?.[0]);
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
    editOrder(id, body) {
        return this.s.updateOrder(id, body);
    }
    delOrder(id) {
        return this.s.deleteOrder(id);
    }
    async exportOrders(date = "", from = "", to = "", month = "", customerId = "") {
        return new common_1.StreamableFile(await this.s.exportOrders({
            date: date || undefined,
            from: from || undefined,
            to: to || undefined,
            month: month || undefined,
            customerId: customerId ? Number(customerId) : undefined,
        }));
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
    (0, roles_decorator_1.Roles)(entities_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.CreateCategoryDto]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "addCategory", null);
__decorate([
    (0, common_1.Delete)("categories/:id"),
    (0, roles_decorator_1.Roles)(entities_1.Role.ADMIN),
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
    (0, roles_decorator_1.Roles)(entities_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dtos_1.ProductDto]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "addProduct", null);
__decorate([
    (0, common_1.Post)("products/bulk-upload"),
    (0, roles_decorator_1.Roles)(entities_1.Role.ADMIN),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: "file", maxCount: 1 },
        { name: "images", maxCount: 1 },
    ], {
        storage: (0, multer_1.memoryStorage)(),
        limits: { files: 2, fileSize: upload_validation_1.MAX_ZIP_BYTES },
    })),
    __param(0, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "bulkUploadProducts", null);
__decorate([
    (0, common_1.Patch)("products/:id/catalogue-status"),
    (0, roles_decorator_1.Roles)(entities_1.Role.ADMIN),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.CatalogueStatusDto]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "updateCatalogueStatus", null);
__decorate([
    (0, common_1.Patch)("products/:id"),
    (0, roles_decorator_1.Roles)(entities_1.Role.ADMIN),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.ProductDto]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "editProduct", null);
__decorate([
    (0, common_1.Delete)("products/all"),
    (0, roles_decorator_1.Roles)(entities_1.Role.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "clearProducts", null);
__decorate([
    (0, common_1.Delete)("products/:id"),
    (0, roles_decorator_1.Roles)(entities_1.Role.ADMIN),
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
    __metadata("design:paramtypes", [dtos_1.CreateCustomerDto]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "addCustomer", null);
__decorate([
    (0, common_1.Post)("customers/bulk-upload"),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([{ name: "file", maxCount: 1 }], { storage: (0, multer_1.memoryStorage)(), limits: { fileSize: upload_validation_1.MAX_SPREADSHEET_BYTES } })),
    __param(0, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "bulkCustomers", null);
__decorate([
    (0, common_1.Patch)("customers/:id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdateCustomerDto]),
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
    (0, common_1.Patch)("orders/:id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, dtos_1.UpdateOrderDto]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "editOrder", null);
__decorate([
    (0, common_1.Delete)("orders/:id"),
    __param(0, (0, common_1.Param)("id", common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "delOrder", null);
__decorate([
    (0, common_1.Get)("orders-export"),
    (0, common_1.Header)("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    (0, common_1.Header)("Content-Disposition", "attachment; filename=order-details.xlsx"),
    __param(0, (0, common_1.Query)("date")),
    __param(1, (0, common_1.Query)("from")),
    __param(2, (0, common_1.Query)("to")),
    __param(3, (0, common_1.Query)("month")),
    __param(4, (0, common_1.Query)("customerId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], CrudController.prototype, "exportOrders", null);
__decorate([
    (0, common_1.Get)("dashboard/stats"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CrudController.prototype, "stats", null);
exports.CrudController = CrudController = __decorate([
    (0, common_1.UseGuards)(admin_auth_guard_1.AdminAuthGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [CrudService])
], CrudController);
//# sourceMappingURL=crud.js.map