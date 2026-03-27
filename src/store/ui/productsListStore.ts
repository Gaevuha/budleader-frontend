import { create } from "zustand";

interface ProductsListStore {
  page: number;
  search: string;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  reset: () => void;
}

export const useProductsListStore = create<ProductsListStore>((set) => ({
  page: 1,
  search: "",
  setPage: (page) =>
    set({
      page: Math.max(1, page),
    }),
  setSearch: (search) =>
    set({
      search,
      // Search changes always restart pagination from the first page.
      page: 1,
    }),
  reset: () =>
    set({
      page: 1,
      search: "",
    }),
}));
