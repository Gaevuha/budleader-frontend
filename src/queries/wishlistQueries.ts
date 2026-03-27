"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addToWishlistCSR,
  getWishlistCSR,
  removeFromWishlistCSR,
} from "@/services/apiClient";

export const WISHLIST_QUERY_KEY = ["wishlist"] as const;

export function useWishlistQuery(enabled = true) {
  return useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: getWishlistCSR,
    enabled,
    staleTime: 30_000,
  });
}

export function useAddToWishlistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addToWishlistCSR,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
  });
}

export function useRemoveFromWishlistMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeFromWishlistCSR,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
  });
}
