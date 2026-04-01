import type { Product } from "@/types/product";

export type ThemeMode = "light" | "dark";

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
  role: "admin" | "user" | "moderator" | "customer";
  date: string;
}

export interface AppOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  date: string;
  totalAmount: number;
  status:
    | "pending"
    | "paid"
    | "processing"
    | "shipped"
    | "received"
    | "delivered"
    | "cancelled"
    | "new";
}
