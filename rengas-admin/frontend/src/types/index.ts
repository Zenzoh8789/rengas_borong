export type Role = "ADMIN" | "ORDER_ADMIN";
export type Category = { id: number; name: string; products?: unknown[] };
export type Product = { id: number; code: string; description: string; uom: string; price: number; category: Category; imageUrl?: string };
export type Customer = { id: number; name: string; address: string; tinNumber: string; phoneNumber: string; whatsappNumber: string };
export type ToastState = { type: "success" | "error"; message: string } | null;
