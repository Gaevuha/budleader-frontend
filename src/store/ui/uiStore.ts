import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

interface UIStore {
  theme: ThemeMode;
  isCartOpen: boolean;
  isMobileMenuOpen: boolean;

  toggleTheme: () => void;
  toggleCart: () => void;
  toggleMobileMenu: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: "light",
      isCartOpen: false,
      isMobileMenuOpen: false,
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "light" ? "dark" : "light",
        })),
      toggleCart: () =>
        set((state) => ({
          isCartOpen: !state.isCartOpen,
        })),
      toggleMobileMenu: () =>
        set((state) => ({
          isMobileMenuOpen: !state.isMobileMenuOpen,
        })),
    }),
    {
      name: "budleader-ui-store",
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
