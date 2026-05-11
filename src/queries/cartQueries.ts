"use client";

import { type QueryClient, useQuery } from "@tanstack/react-query";

import { getCartCSR } from "@/services/api";
import type { CartData } from "@/types/cart";
import { CART_QUERY_KEY } from "@/queries/queryKeys";

export { CART_QUERY_KEY } from "@/queries/queryKeys";

export const setCartQueryData = (queryClient: QueryClient, data: CartData) => {
  queryClient.setQueryData<CartData>(CART_QUERY_KEY, data);
};

export function useCartQuery(enabled = true) {
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: getCartCSR,
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
