import { create } from "zustand";

import type { ThemeMode } from "@/types/app";

interface UIStore {
  theme: ThemeMode | null;
  isCartOpen: boolean;
  isMobileMenuOpen: boolean;

  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  toggleCart: () => void;
  toggleMobileMenu: () => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  theme: null,
  isCartOpen: false,
  isMobileMenuOpen: false,
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === "dark" ? "light" : "dark",
    })),
  toggleCart: () =>
    set((state) => ({
      isCartOpen: !state.isCartOpen,
    })),
  toggleMobileMenu: () =>
    set((state) => ({
      isMobileMenuOpen: !state.isMobileMenuOpen,
    })),
}));
