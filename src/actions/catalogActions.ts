"use server";

import { mapApiProductToAppProduct } from "@/services/api";
import { getProductsSSR } from "@/services/apiServer";
import type { AppProduct } from "@/types/app";
import type { Pagination } from "@/types/api";

interface LoadMoreProductsActionParams {
  page: number;
  limit: number;
  category?: string;
  brand?: string;
  isNew?: boolean;
  isSale?: boolean;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  sort?: string;
  order?: "asc" | "desc" | string;
}

interface LoadMoreProductsActionResult {
  products: AppProduct[];
  pagination: Pagination | null;
}

export async function loadMoreProductsAction(
  params: LoadMoreProductsActionParams
): Promise<LoadMoreProductsActionResult> {
  const response = await getProductsSSR({
    page: params.page,
    limit: params.limit,
    category: params.category,
    brand: params.brand,
    isNew: params.isNew,
    isSale: params.isSale,
    search: params.search,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    inStock: params.inStock,
    sort: params.sort,
    order: params.order,
  });

  return {
    products: response.products
      .map((product) => mapApiProductToAppProduct(product))
      .filter((product): product is AppProduct => product !== null),
    pagination: response.pagination,
  };
}
