import type { Pagination } from "@/types/api";

export interface Product {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  oldPrice?: number;
  image?: string;
  images?: string[];
  stock?: number;
  categoryId?: string;
  categoryName?: string;
  rating?: number;
  reviewsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductsListData {
  products: Product[];
  pagination: Pagination;
}
