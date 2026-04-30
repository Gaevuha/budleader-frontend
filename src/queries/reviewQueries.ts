"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getProductReviewsCSR,
  type ProductReviewsResult,
} from "@/services/api";

export const productReviewsQueryKey = (productId: string) =>
  ["product-reviews", productId] as const;

export function useProductReviewsQuery(
  productId: string,
  initialData?: ProductReviewsResult
) {
  const resolvedInitialData =
    initialData && initialData.reviews.length > 0 ? initialData : undefined;

  return useQuery({
    queryKey: productReviewsQueryKey(productId),
    queryFn: () => getProductReviewsCSR(productId),
    enabled: Boolean(productId),
    initialData: resolvedInitialData,
    staleTime: 30_000,
  });
}
