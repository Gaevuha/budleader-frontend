import { create } from "zustand";

import { useAuthStore } from "@/store/auth/authStore";
import type { AppProduct } from "@/types/app";

export const GUEST_WISHLIST_STORAGE_KEY = "guest_wishlist";

export interface WishlistItem extends AppProduct {
  productId: string;
}

type CommerceWishlistProductInput = Pick<
  AppProduct,
  | "id"
  | "name"
  | "price"
  | "image"
  | "category"
  | "brand"
  | "inStock"
  | "oldPrice"
  | "stock"
  | "isNew"
  | "isSale"
> &
  Partial<AppProduct>;

interface WishlistStore {
  items: WishlistItem[];
  wishlist: AppProduct[];
  isSyncing: boolean;
  pendingProductIds: string[];

  hydrateGuestWishlist: () => void;
  setSyncing: (value: boolean) => void;
  setPending: (productId: string, isPending: boolean) => void;
  setWishlist: (items: AppProduct[]) => void;
  replaceWithServerWishlist: (
    items: AppProduct[],
    options?: {
      allowEmpty?: boolean;
      resetPending?: boolean;
      clearGuestStorage?: boolean;
    }
  ) => boolean;
  addOptimisticItem: (product: CommerceWishlistProductInput) => void;
  removeOptimisticItem: (productId: string) => void;
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

const normalizeWishlistProduct = (
  product: CommerceWishlistProductInput
): AppProduct => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  description: product.description,
  price: product.price,
  oldPrice: product.oldPrice,
  image: product.image,
  images: product.images,
  stock: product.stock,
  categoryId: product.categoryId,
  categoryName: product.categoryName ?? product.category,
  rating: product.rating,
  reviewsCount: product.reviewsCount,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
  category: product.category,
  brand: product.brand,
  inStock: product.inStock,
  isNew: product.isNew,
  isSale: product.isSale,
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
  items: WishlistItem[],
  pendingProductIds?: string[]
) => {
  set({
    items,
    wishlist: items,
    ...(pendingProductIds ? { pendingProductIds } : {}),
  });
};

const normalizeWishlistItems = (items: AppProduct[]): WishlistItem[] =>
  items.map((item) => normalizeWishlistItem(item));

const addPendingProductId = (
  set: (
    partial:
      | Partial<WishlistStore>
      | ((state: WishlistStore) => Partial<WishlistStore>)
  ) => void,
  productId: string
) => {
  set((state) => ({
    pendingProductIds: state.pendingProductIds.includes(productId)
      ? state.pendingProductIds
      : [...state.pendingProductIds, productId],
  }));
};

const removePendingProductId = (
  set: (
    partial:
      | Partial<WishlistStore>
      | ((state: WishlistStore) => Partial<WishlistStore>)
  ) => void,
  productId: string
) => {
  set((state) => ({
    pendingProductIds: state.pendingProductIds.filter((id) => id !== productId),
  }));
};

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  items: [],
  wishlist: [],
  isSyncing: false,
  pendingProductIds: [],
  hydrateGuestWishlist: () => {
    if (useAuthStore.getState().isAuthenticated) {
      return;
    }

    setWishlistState(set, loadGuestWishlist());
  },
  setSyncing: (value) => {
    set({ isSyncing: value });
  },
  setPending: (productId, isPending) => {
    if (isPending) {
      addPendingProductId(set, productId);
      return;
    }

    removePendingProductId(set, productId);
  },
  setWishlist: (items) => {
    const normalized = normalizeWishlistItems(items);
    setWishlistState(set, normalized);

    if (!useAuthStore.getState().isAuthenticated) {
      saveGuestWishlist(normalized);
    }
  },
  replaceWithServerWishlist: (items, options) => {
    const normalized = normalizeWishlistItems(items);
    const currentItems = get().items;
    const allowEmpty = options?.allowEmpty ?? false;

    if (normalized.length === 0 && currentItems.length > 0 && !allowEmpty) {
      return false;
    }

    if (options?.clearGuestStorage) {
      clearGuestWishlistStorage();
    }

    setWishlistState(set, normalized, options?.resetPending ? [] : undefined);
    return true;
  },
  addOptimisticItem: (product) => {
    const normalizedProduct = normalizeWishlistItem(
      normalizeWishlistProduct(product)
    );
    const nextItems = get().items.some((item) => item.id === product.id)
      ? get().items
      : [...get().items, normalizedProduct];

    setWishlistState(set, nextItems);

    if (!useAuthStore.getState().isAuthenticated) {
      saveGuestWishlist(nextItems);
    }
  },
  removeOptimisticItem: (productId) => {
    const nextItems = get().items.filter((item) => item.id !== productId);

    setWishlistState(set, nextItems);

    if (!useAuthStore.getState().isAuthenticated) {
      saveGuestWishlist(nextItems);
    }
  },
  toggleWishlist: async (product) => {
    const exists = get().items.some((item) => item.id === product.id);

    if (exists) {
      get().removeOptimisticItem(product.id);
      return;
    }

    get().addOptimisticItem(product);
  },
  clearWishlist: () => {
    setWishlistState(set, []);

    if (!useAuthStore.getState().isAuthenticated) {
      clearGuestWishlistStorage();
    }
  },
  addToWishlist: async (product) => {
    get().addOptimisticItem(product);
  },
  removeFromWishlist: async (productId) => {
    get().removeOptimisticItem(productId);
  },
  syncWithServer: async (serverItems) => {
    if (!useAuthStore.getState().isAuthenticated || !serverItems) {
      return;
    }

    get().replaceWithServerWishlist(serverItems, { allowEmpty: true });
  },
  mergeGuestWishlist: async (serverItems) => {
    if (!useAuthStore.getState().isAuthenticated) {
      return;
    }

    clearGuestWishlistStorage();

    if (serverItems) {
      get().replaceWithServerWishlist(serverItems, {
        allowEmpty: true,
        resetPending: true,
      });
    }
  },
  resetState: () => {
    clearGuestWishlistStorage();
    set({ pendingProductIds: [] });
    setWishlistState(set, []);
  },
}));
