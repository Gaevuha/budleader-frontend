"use client";

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  addToCartCSR,
  clearCartCSR,
  getCartCSR,
  removeFromCartCSR,
} from "@/services/apiClient";
import type { CartData } from "@/types/cart";

export const CART_QUERY_KEY = ["cart"] as const;

export const setCartQueryData = (queryClient: QueryClient, data: CartData) => {
  queryClient.setQueryData<CartData>(CART_QUERY_KEY, data);
};

export function useCartQuery(enabled = true) {
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: getCartCSR,
    enabled,
    staleTime: 30_000,
  });
}

export function useAddToCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addToCartCSR,
    onSuccess: (data) => {
      setCartQueryData(queryClient, data);
    },
  });
}

export function useRemoveFromCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeFromCartCSR,
    onSuccess: (data) => {
      setCartQueryData(queryClient, data);
    },
  });
}

export function useClearCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearCartCSR,
    onSuccess: (data) => {
      setCartQueryData(queryClient, data);
    },
  });
}
