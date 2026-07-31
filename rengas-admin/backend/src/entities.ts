import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export enum Role {
  ADMIN = "ADMIN",
  ORDER_ADMIN = "ORDER_ADMIN",
}
@Entity("users")
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) username: string;
  @Column({ name: "password_hash" }) passwordHash: string;
  @Column({ type: "enum", enum: Role }) role: Role;
}
@Entity("categories")
export class Category {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) name: string;
  @OneToMany(() => Product, (p) => p.category) products: Product[];
}
@Entity("products")
export class Product {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) code: string;
  @Column() description: string;
  @ManyToOne(() => Category, (c) => c.products, { eager: true })
  @JoinColumn({ name: "category_id" })
  category: Category;
  @Column() uom: string;
  @Column("decimal", { precision: 12, scale: 2 }) price: number;
  @Column({ name: "image_url", length: 1000, nullable: true }) imageUrl: string;
  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
}
@Entity("customers")
export class Customer {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column({ nullable: true }) address: string;
  @Column({ name: "tin_number", nullable: true }) tinNumber: string;
  @Column({ name: "phone_number", nullable: true }) phoneNumber: string;
  @Column({ name: "whatsapp_number", nullable: true }) whatsappNumber: string;
}
export enum OrderStatus {
  VIEW = "VIEW",
  MODIFIED = "MODIFIED",
  PRINTED = "PRINTED",
}
@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: "order_no", unique: true }) orderNo: string;
  @ManyToOne(() => Customer, { eager: true })
  @JoinColumn({ name: "customer_id" })
  customer: Customer;
  @Column({ name: "order_date", type: "date" }) orderDate: string;
  @Column({ type: "enum", enum: OrderStatus, default: OrderStatus.VIEW })
  status: OrderStatus;
  @OneToMany(() => OrderItem, (i) => i.order, { eager: true, cascade: true })
  items: OrderItem[];
}
@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn() id: number;
  @ManyToOne(() => Order, (o) => o.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order: Order;
  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: "product_id" })
  product: Product;
  @Column("decimal", { precision: 12, scale: 2 }) quantity: number;
  @Column("decimal", { name: "unit_price", precision: 12, scale: 2 })
  unitPrice: number;
}
export enum NotificationType {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
}
@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn() id: number;
  @Column() title: string;
  @Column() message: string;
  @Column({
    type: "enum",
    enum: NotificationType,
    default: NotificationType.INFO,
  })
  type: NotificationType;
  @Column({ name: "is_read", default: false }) isRead: boolean;
  @CreateDateColumn({ name: "created_at" }) createdAt: Date;
}
@Entity("design_settings")
export class DesignSetting {
  @PrimaryColumn({ default: 1 }) id: number;
  @Column({ name: "top_banner_url", nullable: true }) topBannerUrl: string;
  @Column({ name: "product_photo_url", nullable: true })
  productPhotoUrl: string;
  @Column({ name: "footer_image_url", nullable: true }) footerImageUrl: string;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt: Date;
}
