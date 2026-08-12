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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignSetting = exports.Notification = exports.NotificationType = exports.OrderItem = exports.Order = exports.OrderStatus = exports.Customer = exports.Product = exports.Category = exports.User = exports.Role = void 0;
const typeorm_1 = require("typeorm");
var Role;
(function (Role) {
    Role["ADMIN"] = "ADMIN";
    Role["ORDER_ADMIN"] = "ORDER_ADMIN";
    Role["CUSTOMER"] = "CUSTOMER";
})(Role || (exports.Role = Role = {}));
let User = class User {
    id;
    username;
    passwordHash;
    role;
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "password_hash" }),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: Role }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)("users")
], User);
let Category = class Category {
    id;
    name;
    products;
};
exports.Category = Category;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Category.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Category.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Product, (p) => p.category),
    __metadata("design:type", Array)
], Category.prototype, "products", void 0);
exports.Category = Category = __decorate([
    (0, typeorm_1.Entity)("categories")
], Category);
let Product = class Product {
    id;
    code;
    description;
    category;
    uom;
    price;
    imageUrl;
    createdAt;
};
exports.Product = Product;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Product.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Product.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Category, (c) => c.products, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: "category_id" }),
    __metadata("design:type", Category)
], Product.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Product.prototype, "uom", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Product.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "image_url", length: 1000, nullable: true }),
    __metadata("design:type", String)
], Product.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at" }),
    __metadata("design:type", Date)
], Product.prototype, "createdAt", void 0);
exports.Product = Product = __decorate([
    (0, typeorm_1.Entity)("products")
], Product);
let Customer = class Customer {
    id;
    name;
    companyName;
    tinNumber;
    address;
    phoneNumber;
    whatsappNumber;
};
exports.Customer = Customer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Customer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 150,
    }),
    __metadata("design:type", String)
], Customer.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "company_name",
        type: "varchar",
        length: 180,
        nullable: true,
    }),
    __metadata("design:type", String)
], Customer.prototype, "companyName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "tin_number",
        type: "varchar",
        length: 100,
        nullable: true,
    }),
    __metadata("design:type", String)
], Customer.prototype, "tinNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "varchar",
        length: 500,
        nullable: true,
    }),
    __metadata("design:type", String)
], Customer.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "phone_number",
        type: "varchar",
        length: 40,
        nullable: true,
    }),
    __metadata("design:type", String)
], Customer.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: "whatsapp_number",
        type: "varchar",
        length: 40,
        nullable: true,
    }),
    __metadata("design:type", String)
], Customer.prototype, "whatsappNumber", void 0);
exports.Customer = Customer = __decorate([
    (0, typeorm_1.Entity)("customers")
], Customer);
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["VIEW"] = "VIEW";
    OrderStatus["MODIFIED"] = "MODIFIED";
    OrderStatus["PRINTED"] = "PRINTED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
let Order = class Order {
    id;
    orderNo;
    customer;
    orderDate;
    status;
    items;
};
exports.Order = Order;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Order.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "order_no", unique: true }),
    __metadata("design:type", String)
], Order.prototype, "orderNo", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Customer, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: "customer_id" }),
    __metadata("design:type", Customer)
], Order.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "order_date", type: "date" }),
    __metadata("design:type", String)
], Order.prototype, "orderDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: OrderStatus, default: OrderStatus.VIEW }),
    __metadata("design:type", String)
], Order.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => OrderItem, (i) => i.order, { eager: true, cascade: true }),
    __metadata("design:type", Array)
], Order.prototype, "items", void 0);
exports.Order = Order = __decorate([
    (0, typeorm_1.Entity)("orders")
], Order);
let OrderItem = class OrderItem {
    id;
    order;
    product;
    quantity;
    unitPrice;
};
exports.OrderItem = OrderItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], OrderItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Order, (o) => o.items, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "order_id" }),
    __metadata("design:type", Order)
], OrderItem.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Product, { eager: true }),
    (0, typeorm_1.JoinColumn)({ name: "product_id" }),
    __metadata("design:type", Product)
], OrderItem.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], OrderItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { name: "unit_price", precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], OrderItem.prototype, "unitPrice", void 0);
exports.OrderItem = OrderItem = __decorate([
    (0, typeorm_1.Entity)("order_items")
], OrderItem);
var NotificationType;
(function (NotificationType) {
    NotificationType["INFO"] = "INFO";
    NotificationType["SUCCESS"] = "SUCCESS";
    NotificationType["WARNING"] = "WARNING";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
let Notification = class Notification {
    id;
    title;
    message;
    type;
    isRead;
    createdAt;
};
exports.Notification = Notification;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Notification.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Notification.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Notification.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: NotificationType,
        default: NotificationType.INFO,
    }),
    __metadata("design:type", String)
], Notification.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "is_read", default: false }),
    __metadata("design:type", Boolean)
], Notification.prototype, "isRead", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: "created_at" }),
    __metadata("design:type", Date)
], Notification.prototype, "createdAt", void 0);
exports.Notification = Notification = __decorate([
    (0, typeorm_1.Entity)("notifications")
], Notification);
let DesignSetting = class DesignSetting {
    id;
    topBannerUrl;
    productPhotoUrl;
    footerImageUrl;
    updatedAt;
};
exports.DesignSetting = DesignSetting;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ default: 1 }),
    __metadata("design:type", Number)
], DesignSetting.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "top_banner_url", nullable: true }),
    __metadata("design:type", String)
], DesignSetting.prototype, "topBannerUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "product_photo_url", nullable: true }),
    __metadata("design:type", String)
], DesignSetting.prototype, "productPhotoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "footer_image_url", nullable: true }),
    __metadata("design:type", String)
], DesignSetting.prototype, "footerImageUrl", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: "updated_at" }),
    __metadata("design:type", Date)
], DesignSetting.prototype, "updatedAt", void 0);
exports.DesignSetting = DesignSetting = __decorate([
    (0, typeorm_1.Entity)("design_settings")
], DesignSetting);
//# sourceMappingURL=entities.js.map