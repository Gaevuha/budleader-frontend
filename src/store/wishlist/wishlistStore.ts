import { create } from "zustand";

import {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} from "@/services/wishlistService";
import { useAuthStore } from "@/store/auth/authStore";
import type { AppProduct } from "@/types/app";

export const GUEST_WISHLIST_STORAGE_KEY = "guest_wishlist";

export interface WishlistItem extends AppProduct {
  productId: string;
}

interface WishlistStore {
  items: WishlistItem[];
  wishlist: AppProduct[];
  isSyncing: boolean;

  hydrateGuestWishlist: () => void;
  setWishlist: (items: AppProduct[]) => void;
  toggleWishlist: (product: AppProduct) => Promise<void>;
  clearWishlist: () => void;
  addToWishlist: (product: AppProduct) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  syncWithServer: (serverItems?: AppProduct[] | null) => Promise<void>;
  mergeGuestWishlist: (serverItems?: AppProduct[] | null) => Promise<void>;
  resetState: () => void;
}

const isBrowser = () => typeof window !== "undefined";

const normalizeWishlistItem = (product: AppProduct): WishlistItem => ({
  ...product,
  productId: product.id,
});

const saveGuestWishlist = (items: WishlistItem[]) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    GUEST_WISHLIST_STORAGE_KEY,
    JSON.stringify(items)
  );
};

const loadGuestWishlist = (): WishlistItem[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(GUEST_WISHLIST_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as WishlistItem[];
    return Array.isArray(parsed)
      ? parsed.filter(
          (item) =>
            item && typeof item === "object" && typeof item.id === "string"
        )
      : [];
  } catch {
    return [];
  }
};

const clearGuestWishlistStorage = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY);
};

const setWishlistState = (
  set: (partial: Partial<WishlistStore>) => void,
  items: WishlistItem[]
) => {
  set({
    items,
    wishlist: items,
  });
};

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  items: [],
  wishlist: [],
  isSyncing: false,
  hydrateGuestWishlist: () => {
    if (useAuthStore.getState().isAuthenticated) {
      return;
    }

    setWishlistState(set, loadGuestWishlist());
  },
  setWishlist: (items) => {
    const normalized = items.map((item) => normalizeWishlistItem(item));
    setWishlistState(set, normalized);

    if (!useAuthStore.getState().isAuthenticated) {
      saveGuestWishlist(normalized);
    }
  },
  toggleWishlist: async (product) => {
    if (useAuthStore.getState().isAuthenticated) {
      const exists = get().items.some((item) => item.id === product.id);

      if (exists) {
        await get().removeFromWishlist(product.id);
        return;
      }

      await get().addToWishlist(product);
      return;
    }

    const exists = get().items.some((item) => item.id === product.id);
    const nextItems = exists
      ? get().items.filter((item) => item.id !== product.id)
      : [...get().items, normalizeWishlistItem(product)];

    setWishlistState(set, nextItems);
    saveGuestWishlist(nextItems);
  },
  clearWishlist: () => {
    if (useAuthStore.getState().isAuthenticated) {
      return;
    }

    setWishlistState(set, []);
    clearGuestWishlistStorage();
  },
  addToWishlist: async (product) => {
    if (!useAuthStore.getState().isAuthenticated) {
      get().toggleWishlist(product);
      return;
    }

    set({ isSyncing: true });

    try {
      const serverWishlist = await addToWishlist(product.id);
      setWishlistState(
        set,
        serverWishlist.items.map((item) => normalizeWishlistItem(item))
      );
    } finally {
      set({ isSyncing: false });
    }
  },
  removeFromWishlist: async (productId) => {
    if (!useAuthStore.getState().isAuthenticated) {
      const nextItems = get().items.filter((item) => item.id !== productId);
      setWishlistState(set, nextItems);
      saveGuestWishlist(nextItems);
      return;
    }

    set({ isSyncing: true });

    try {
      const serverWishlist = await removeFromWishlist(productId);
      setWishlistState(
        set,
        serverWishlist.items.map((item) => normalizeWishlistItem(item))
      );
    } finally {
      set({ isSyncing: false });
    }
  },
  syncWithServer: async (serverItems) => {
    if (!useAuthStore.getState().isAuthenticated) {
      return;
    }

    set({ isSyncing: true });

    try {
      const resolved = serverItems ?? (await getWishlist()).items;
      setWishlistState(
        set,
        resolved.map((item) => normalizeWishlistItem(item))
      );
    } finally {
      set({ isSyncing: false });
    }
  },
  mergeGuestWishlist: async (serverItems) => {
    if (!useAuthStore.getState().isAuthenticated) {
      return;
    }

    const guestItems = get().items;

    if (guestItems.length === 0) {
      await get().syncWithServer(serverItems ?? null);
      return;
    }

    set({ isSyncing: true });

    try {
      const resolvedServerItems = serverItems ?? (await getWishlist()).items;
      const serverIds = new Set(resolvedServerItems.map((item) => item.id));

      for (const guestItem of guestItems) {
        if (serverIds.has(guestItem.productId)) {
          continue;
        }

        await addToWishlist(guestItem.productId);
      }

      clearGuestWishlistStorage();
      const mergedWishlist = await getWishlist();
      setWishlistState(
        set,
        mergedWishlist.items.map((item) => normalizeWishlistItem(item))
      );
    } finally {
      set({ isSyncing: false });
    }
  },
  resetState: () => {
    clearGuestWishlistStorage();
    setWishlistState(set, []);
  },
}));
