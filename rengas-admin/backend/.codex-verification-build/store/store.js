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
exports.StoreController = exports.StoreService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const node_crypto_1 = require("node:crypto");
const typeorm_2 = require("typeorm");
const entities_1 = require("../entities");
const customer_auth_guard_1 = require("../auth/customer-auth.guard");
class StoreOrderItemDto {
    productId;
    quantity;
}
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], StoreOrderItemDto.prototype, "productId", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], StoreOrderItemDto.prototype, "quantity", void 0);
class LegacyStoreCustomerDto {
    name;
    companyName;
    tinNumber;
    phoneNumber;
    whatsappNumber;
    address;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(150),
    __metadata("design:type", String)
], LegacyStoreCustomerDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(180),
    __metadata("design:type", String)
], LegacyStoreCustomerDto.prototype, "companyName", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], LegacyStoreCustomerDto.prototype, "tinNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], LegacyStoreCustomerDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], LegacyStoreCustomerDto.prototype, "whatsappNumber", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], LegacyStoreCustomerDto.prototype, "address", void 0);
class CreateStoreOrderDto {
    customer;
    items;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => LegacyStoreCustomerDto),
    __metadata("design:type", LegacyStoreCustomerDto)
], CreateStoreOrderDto.prototype, "customer", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.ArrayMaxSize)(500),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => StoreOrderItemDto),
    __metadata("design:type", Array)
], CreateStoreOrderDto.prototype, "items", void 0);
let StoreService = class StoreService {
    products;
    categories;
    customers;
    orders;
    orderItems;
    constructor(products, categories, customers, orders, orderItems) {
        this.products = products;
        this.categories = categories;
        this.customers = customers;
        this.orders = orders;
        this.orderItems = orderItems;
    }
    async listCategories() {
        const categories = await this.categories.find({
            select: { id: true, name: true },
            order: { name: "ASC", id: "ASC" },
            loadEagerRelations: false,
        });
        return categories.map(({ id, name }) => ({ id, name }));
    }
    async listProducts() {
        const rows = await this.products.find({
            where: { catalogueEnabled: true },
            order: { description: "ASC", id: "ASC" },
        });
        return rows.filter(row => row.catalogueEnabled !== false).map((row) => ({
            id: row.id,
            code: row.code,
            name: row.description,
            subtitle: "",
            category: row.category,
            imageUrl: row.imageUrl,
            uoms: [
                {
                    id: row.id,
                    productId: row.id,
                    name: row.uom,
                    price: Number(row.price),
                    pack: `${row.uom} • ${row.code}`,
                },
            ],
        }));
    }
    async createOrder(customerId, input) {
        if (!input.items?.length) {
            throw new common_1.BadRequestException("Add at least one item");
        }
        const ids = input.items.map((item) => item.productId);
        const products = await this.products.findByIds(ids);
        if (products.length !== new Set(ids).size) {
            throw new common_1.BadRequestException("One or more products no longer exist");
        }
        if (products.some(product => product.catalogueEnabled === false)) {
            throw new common_1.BadRequestException("One or more products are no longer available. Remove them from your cart before ordering.");
        }
        const customer = await this.customers.findOneBy({ id: customerId });
        if (!customer) {
            throw new common_1.UnauthorizedException("The customer account no longer exists.");
        }
        return this.orders.manager.transaction(async (manager) => {
            const orderRepo = manager.getRepository(entities_1.Order);
            const itemRepo = manager.getRepository(entities_1.OrderItem);
            let order = await orderRepo.save(orderRepo.create({
                orderNo: `TEMP-${(0, node_crypto_1.randomUUID)()}`,
                orderDate: new Date().toISOString().slice(0, 10),
                status: entities_1.OrderStatus.ACCEPTED,
                customer,
                items: [],
            }));
            order.orderNo = `RB-${String(order.id).padStart(3, "0")}`;
            order = await orderRepo.save(order);
            const lines = input.items.map((item) => {
                const product = products.find((currentProduct) => currentProduct.id === item.productId);
                if (!product) {
                    throw new common_1.BadRequestException(`Product ${item.productId} no longer exists`);
                }
                return itemRepo.create({
                    order,
                    product,
                    quantity: item.quantity,
                    unitPrice: Number(product.price),
                });
            });
            await itemRepo.save(lines);
            await manager.getRepository(entities_1.Notification).save({
                title: "New order " + order.orderNo,
                message: (customer.companyName || "Customer shop").slice(0, 180) +
                    " placed " +
                    order.orderNo,
                type: entities_1.NotificationType.INFO,
                recipientRole: entities_1.Role.ORDER_ADMIN,
                isRead: false,
            });
            return orderRepo.findOneOrFail({
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
        });
    }
    async recentOrders(customerId) {
        const orders = await this.orders
            .createQueryBuilder("order")
            .select(["order.id", "order.orderNo", "order.orderDate", "order.status"])
            .where("order.customer_id = :customerId", { customerId })
            .orderBy("order.orderDate", "DESC")
            .addOrderBy("order.id", "DESC")
            .take(10)
            .getMany();
        return orders.map((order) => ({
            id: order.id,
            orderNo: order.orderNo,
            date: order.orderDate,
            status: order.status,
        }));
    }
    async getOrders(customerId) {
        const orders = await this.orders.find({
            where: { customer: { id: customerId } },
            loadEagerRelations: false,
            relations: {
                customer: true,
                items: {
                    product: true,
                },
            },
            order: {
                orderDate: "DESC",
                id: "DESC",
            },
        });
        return orders.map((order) => {
            const total = order.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
            const itemCount = order.items.reduce((sum, item) => sum + Number(item.quantity), 0);
            return {
                id: order.id,
                orderNo: order.orderNo,
                date: order.orderDate,
                status: order.status,
                itemCount,
                total,
                customer: {
                    id: order.customer?.id,
                    name: order.customer?.name || "",
                    companyName: order.customer?.companyName || "",
                    tinNumber: order.customer?.tinNumber || "",
                    phoneNumber: order.customer?.phoneNumber || "",
                    whatsappNumber: order.customer?.whatsappNumber || "",
                    address: order.customer?.address || "",
                },
                items: order.items.map((item) => ({
                    id: item.id,
                    uom: item.product.uom,
                    uomId: item.product.id,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    amount: Number(item.quantity) * Number(item.unitPrice),
                    product: {
                        id: item.product.id,
                        code: item.product.code,
                        name: item.product.description,
                        imageUrl: item.product.imageUrl,
                    },
                })),
            };
        });
    }
};
exports.StoreService = StoreService;
exports.StoreService = StoreService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Category)),
    __param(2, (0, typeorm_1.InjectRepository)(entities_1.Customer)),
    __param(3, (0, typeorm_1.InjectRepository)(entities_1.Order)),
    __param(4, (0, typeorm_1.InjectRepository)(entities_1.OrderItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], StoreService);
let StoreController = class StoreController {
    store;
    constructor(store) {
        this.store = store;
    }
    products() {
        return this.store.listProducts();
    }
    categories() {
        return this.store.listCategories();
    }
    recentOrders(request) {
        return this.store.recentOrders(request.user.customerId);
    }
    getOrders(request) {
        return this.store.getOrders(request.user.customerId);
    }
    async createOrder(request, input) {
        try {
            return await this.store.createOrder(request.user.customerId, input);
        }
        catch (error) {
            console.error("CREATE ORDER FAILED:", error);
            throw error;
        }
    }
};
exports.StoreController = StoreController;
__decorate([
    (0, common_1.Get)("products"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StoreController.prototype, "products", null);
__decorate([
    (0, common_1.Get)("categories"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StoreController.prototype, "categories", null);
__decorate([
    (0, common_1.Get)("orders/recent"),
    (0, common_1.UseGuards)(customer_auth_guard_1.CustomerAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StoreController.prototype, "recentOrders", null);
__decorate([
    (0, common_1.Get)("orders"),
    (0, common_1.UseGuards)(customer_auth_guard_1.CustomerAuthGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StoreController.prototype, "getOrders", null);
__decorate([
    (0, common_1.Post)("orders"),
    (0, common_1.UseGuards)(customer_auth_guard_1.CustomerAuthGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateStoreOrderDto]),
    __metadata("design:returntype", Promise)
], StoreController.prototype, "createOrder", null);
exports.StoreController = StoreController = __decorate([
    (0, common_1.Controller)("store"),
    __metadata("design:paramtypes", [StoreService])
], StoreController);
//# sourceMappingURL=store.js.map