"use client";

import { useQuery } from "@tanstack/react-query";

import { AUTH_QUERY_KEY } from "@/queries/queryKeys";
import { getCurrentUser } from "@/services/api";
import type { User } from "@/types/auth";

export { AUTH_QUERY_KEY } from "@/queries/queryKeys";

interface UseAuthOptions {
  initialData?: User | null;
}

export function useAuth(options: UseAuthOptions = {}) {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: options.initialData,
    placeholderData: options.initialData,
  });
}
