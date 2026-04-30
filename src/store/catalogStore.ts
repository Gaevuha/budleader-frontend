import { create } from "zustand";

interface CatalogStoreState {
  page: number;
  search: string;
  category: string | null;
  brand: string | null;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setCategory: (category: string | null) => void;
  setBrand: (brand: string | null) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  page: 1,
  search: "",
  category: null,
  brand: null,
} satisfies Pick<CatalogStoreState, "page" | "search" | "category" | "brand">;

export const useCatalogStore = create<CatalogStoreState>((set) => ({
  ...INITIAL_STATE,
  setPage: (page) =>
    set({
      page: Math.max(1, page),
    }),
  setSearch: (search) =>
    set({
      search,
      page: 1,
    }),
  setCategory: (category) =>
    set({
      category,
      page: 1,
    }),
  setBrand: (brand) =>
    set({
      brand,
      page: 1,
    }),
  reset: () => set(INITIAL_STATE),
}));
