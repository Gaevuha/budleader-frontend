import type { Product } from "@/types/product";

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product?: Product;
}

export interface CartData {
  items: CartItem[];
  subtotal: number;
  itemsCount: number;
}
