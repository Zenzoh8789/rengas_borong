export type Role = "ADMIN" | "ORDER_ADMIN";

export type Category = {
  id: number;
  name: string;
  products?: unknown[];
};

export type Product = {
  id: number;
  code: string;
  description: string;
  uom: string;
  price: number;
  category: Category;
  imageUrl?: string;
  catalogueEnabled: boolean;
};

export type Customer = {
  id: number;
  name: string;
  companyName?: string;
  address: string;
  tinNumber: string;
  phoneNumber: string;
  whatsappNumber: string;
};

export type OrderItem = {
  id: number;
  quantity: number;
  unitPrice: number;
  product: Product;
};

export type Order = {
  id: number;
  orderNo: string;
  customer: Customer;
  orderDate: string;
  status: "VIEW" | "MODIFIED" | "PRINTED";
  items: OrderItem[];
};

export type ToastState = {
  type: "success" | "error";
  message: string;
} | null;