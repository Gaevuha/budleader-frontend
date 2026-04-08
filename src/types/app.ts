import type { Product } from "@/types/product";

export type ThemeMode = "light" | "dark";
export type CatalogViewMode = "grid" | "list";

export interface ProductReview {
  id: string;
  user: string;
  text: string;
  date: string;
  rating?: number;
}

export interface AppProduct extends Product {
  image: string;
  category: string;
  brand: string;
  inStock: boolean;
  isNew?: boolean;
  isSale?: boolean;
  reviews?: ProductReview[];
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "user" | "moderator" | "customer";
  date: string;
}

export type AppOrderStatus =
  | "pending"
  | "paid"
  | "confirmed"
  | "processing"
  | "shipped"
  | "received"
  | "delivered"
  | "cancelled"
  | "returned"
  | "new";

export interface AppOrderItem {
  productId?: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface AppOrderAddress {
  name: string;
  phone: string;
  city: string;
  street: string;
  building: string;
  apartment?: string;
  comment?: string;
}

export interface AppOrderStatusHistoryEntry {
  status: AppOrderStatus;
  date: string;
  comment?: string;
}

export interface AppOrder {
  id: string;
  orderNumber: string;
  orderType?: "product" | "service";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  totalAmount: number;
  subtotalAmount: number;
  deliveryCost: number;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveryMethod?: string;
  notes?: string;
  serviceId?: string;
  serviceName?: string;
  servicePricePerHour?: number;
  isGuest: boolean;
  shippingAddress?: AppOrderAddress;
  items: AppOrderItem[];
  statusHistory: AppOrderStatusHistoryEntry[];
  status: AppOrderStatus;
}
