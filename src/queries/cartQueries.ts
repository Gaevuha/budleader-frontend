"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addToCartCSR, getCartCSR } from "@/services/apiClient";

export const CART_QUERY_KEY = ["cart"] as const;

export function useCartQuery() {
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: getCartCSR,
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
