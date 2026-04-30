"use client";

import { useQuery } from "@tanstack/react-query";

import { getOrdersCSR } from "@/services/api";

export const ORDERS_QUERY_KEY = ["orders"] as const;

export function useOrdersQuery(enabled = true) {
  return useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: getOrdersCSR,
    enabled,
    staleTime: 30_000,
  });
}
