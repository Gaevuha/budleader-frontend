"use client";

import { useQuery } from "@tanstack/react-query";

import { getWishlistCSR } from "@/services/api";
import { WISHLIST_QUERY_KEY } from "@/queries/queryKeys";

export { WISHLIST_QUERY_KEY } from "@/queries/queryKeys";

export function useWishlistQuery(enabled = true) {
  return useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: getWishlistCSR,
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
