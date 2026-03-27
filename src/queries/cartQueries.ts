"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addToCartCSR,
  clearCartCSR,
  getCartCSR,
  removeFromCartCSR,
} from "@/services/apiClient";

export const CART_QUERY_KEY = ["cart"] as const;

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

export function useRemoveFromCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeFromCartCSR,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}

export function useClearCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearCartCSR,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });
}
