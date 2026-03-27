"use client";

import { useEffect } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useDebounce } from "@/hooks/useDebounce";
import { fetchProducts } from "@/services/apiClient";
import { useProductsListStore } from "@/store/ui/productsListStore";

const PRODUCTS_LIMIT = 12;

export function useProducts() {
  const queryClient = useQueryClient();
  const page = useProductsListStore((state) => state.page);
  const search = useProductsListStore((state) => state.search);
  const setPage = useProductsListStore((state) => state.setPage);
  const setSearch = useProductsListStore((state) => state.setSearch);

  const debouncedSearch = useDebounce(search, 300);

  const query = useQuery({
    queryKey: ["products", page, debouncedSearch],
    queryFn: () =>
      fetchProducts({
        page,
        limit: PRODUCTS_LIMIT,
        search: debouncedSearch,
      }),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    const totalPages = query.data?.pagination?.totalPages ?? 1;
    const nextPage = page + 1;

    if (nextPage > totalPages) {
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: ["products", nextPage, debouncedSearch],
      queryFn: () =>
        fetchProducts({
          page: nextPage,
          limit: PRODUCTS_LIMIT,
          search: debouncedSearch,
        }),
    });
  }, [debouncedSearch, page, query.data?.pagination?.totalPages, queryClient]);

  return {
    products: query.data?.products ?? [],
    pagination: query.data?.pagination,
    page,
    search,
    setPage,
    setSearch,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
}
