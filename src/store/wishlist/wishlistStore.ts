import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AppProduct } from "@/types/app";

interface WishlistStore {
  wishlist: AppProduct[];

  toggleWishlist: (product: AppProduct) => void;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set) => ({
      wishlist: [],
      toggleWishlist: (product) =>
        set((state) => {
          const exists = state.wishlist.some((item) => item.id === product.id);

          if (exists) {
            return {
              wishlist: state.wishlist.filter((item) => item.id !== product.id),
            };
          }

          return {
            wishlist: [...state.wishlist, product],
          };
        }),
      clearWishlist: () => set({ wishlist: [] }),
    }),
    {
      name: "budleader-wishlist-store",
    }
  )
);
