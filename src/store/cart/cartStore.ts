import { create, type StoreApi } from "zustand";

import { mapApiProductToAppProduct } from "@/services/api";
import {
  addToCart,
  clearCart as clearServerCart,
  getCart,
  removeFromCart as removeFromServerCart,
  updateCartItem,
} from "@/services/cartService";
import { useAuthStore } from "@/store/auth/authStore";
import type { AppProduct } from "@/types/app";
import type { CartData } from "@/types/cart";

export const GUEST_CART_STORAGE_KEY = "guest_cart";

export interface CartItem extends AppProduct {
  productId: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  cart: CartItem[];
  isSyncing: boolean;
  pendingProductIds: string[];

  hydrateGuestCart: () => void;
  addToCart: (product: AppProduct, quantity?: number) => Promise<void>;
  setCart: (items: CartItem[]) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  syncWithServer: (serverCart?: CartData | null) => Promise<void>;
  mergeGuestCart: (serverCart?: CartData | null) => Promise<void>;
  resetState: () => void;
}

const isBrowser = () => typeof window !== "undefined";

const normalizeCartItem = (
  product: AppProduct,
  quantity = 1,
  productId?: string
): CartItem => ({
  ...product,
  productId: productId ?? product.id,
  quantity: Math.max(1, quantity),
});

const saveGuestCart = (items: CartItem[]) => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
};

const clearGuestCartStorage = () => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
};

const loadGuestCart = (): CartItem[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed)
      ? parsed.filter(
          (item) =>
            item &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.productId === "string"
        )
      : [];
  } catch {
    return [];
  }
};

const mapServerCartToStoreItems = (serverCart: CartData): CartItem[] => {
  return serverCart.items.map((item) => {
    const mappedProduct = item.product
      ? mapApiProductToAppProduct(item.product) ?? {
          id: item.productId,
          name: item.product?.name ?? "Товар",
          price: item.price,
          image: item.product?.image ?? "/img/not-img.webp",
          category: "Загальна",
          brand: "Budleader",
          inStock: true,
        }
      : {
          id: item.productId,
          name: "Товар",
          price: item.price,
          image: "/img/not-img.webp",
          category: "Загальна",
          brand: "Budleader",
          inStock: true,
        };

    return normalizeCartItem(mappedProduct, item.quantity, item.productId);
  });
};

const setCartState = (
  set: StoreApi<CartStore>["setState"],
  items: CartItem[]
) => {
  set({
    items,
    cart: items,
  });
};

const addPendingProductId = (
  set: StoreApi<CartStore>["setState"],
  productId: string
) => {
  set((state) => ({
    pendingProductIds: state.pendingProductIds.includes(productId)
      ? state.pendingProductIds
      : [...state.pendingProductIds, productId],
  }));
};

const removePendingProductId = (
  set: StoreApi<CartStore>["setState"],
  productId: string
) => {
  set((state) => ({
    pendingProductIds: state.pendingProductIds.filter((id) => id !== productId),
  }));
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  cart: [],
  isSyncing: false,
  pendingProductIds: [],
  hydrateGuestCart: () => {
    if (useAuthStore.getState().isAuthenticated) {
      return;
    }

    const items = loadGuestCart();
    setCartState(set, items);
  },
  addToCart: async (product, quantity = 1) => {
    if (useAuthStore.getState().isAuthenticated) {
      addPendingProductId(set, product.id);
      set({ isSyncing: true });

      try {
        const serverCart = await addToCart({
          productId: product.id,
          quantity: Math.max(1, quantity),
        });
        setCartState(set, mapServerCartToStoreItems(serverCart));
      } finally {
        removePendingProductId(set, product.id);
        set({ isSyncing: false });
      }

      return;
    }

    if (useAuthStore.getState().isAuthenticated) {
      return;
    }

    const normalizedProduct = normalizeCartItem(product, quantity);
    const nextItems = (() => {
      const existing = get().cart.find((item) => item.productId === product.id);

      if (!existing) {
        return [...get().cart, normalizedProduct];
      }

      return get().cart.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + Math.max(1, quantity) }
          : item
      );
    })();

    setCartState(set, nextItems);
    saveGuestCart(nextItems);
  },
  setCart: (items) => {
    setCartState(set, items);

    if (!useAuthStore.getState().isAuthenticated) {
      saveGuestCart(items);
    }
  },
  setQuantity: (id, quantity) => {
    if (useAuthStore.getState().isAuthenticated) {
      return;
    }

    const nextItems = get()
      .cart.map((item) =>
        item.productId === id
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
      .filter((item) => item.quantity > 0);

    setCartState(set, nextItems);
    saveGuestCart(nextItems);
  },
  removeFromCart: async (id) => {
    if (useAuthStore.getState().isAuthenticated) {
      addPendingProductId(set, id);
      set({ isSyncing: true });

      try {
        const serverCart = await removeFromServerCart(id);
        setCartState(set, mapServerCartToStoreItems(serverCart));
      } finally {
        removePendingProductId(set, id);
        set({ isSyncing: false });
      }

      return;
    }

    if (useAuthStore.getState().isAuthenticated) {
      return;
    }

    const nextItems = get().cart.filter((item) => item.productId !== id);
    setCartState(set, nextItems);
    saveGuestCart(nextItems);
  },
  clearCart: async () => {
    if (useAuthStore.getState().isAuthenticated) {
      set({ isSyncing: true });

      try {
        const serverCart = await clearServerCart();
        setCartState(set, mapServerCartToStoreItems(serverCart));
      } finally {
        set({ isSyncing: false });
      }

      return;
    }

    if (useAuthStore.getState().isAuthenticated) {
      return;
    }

    setCartState(set, []);
    clearGuestCartStorage();
  },
  updateQuantity: async (productId, quantity) => {
    if (!useAuthStore.getState().isAuthenticated) {
      if (quantity <= 0) {
        get().removeFromCart(productId);
        return;
      }

      get().setQuantity(productId, quantity);
      return;
    }

    addPendingProductId(set, productId);
    set({ isSyncing: true });

    try {
      const serverCart =
        quantity <= 0
          ? await removeFromServerCart(productId)
          : await updateCartItem(productId, quantity);
      const items = mapServerCartToStoreItems(serverCart);
      setCartState(set, items);
    } finally {
      removePendingProductId(set, productId);
      set({ isSyncing: false });
    }
  },
  syncWithServer: async (serverCart) => {
    if (!useAuthStore.getState().isAuthenticated) {
      return;
    }

    set({ isSyncing: true });

    try {
      const resolvedCart = serverCart ?? (await getCart());
      setCartState(set, mapServerCartToStoreItems(resolvedCart));
    } finally {
      set({ isSyncing: false });
    }
  },
  mergeGuestCart: async (serverCart) => {
    if (!useAuthStore.getState().isAuthenticated) {
      return;
    }

    const guestItems = get().cart;

    if (guestItems.length === 0) {
      await get().syncWithServer(serverCart ?? null);
      return;
    }

    set({ isSyncing: true });

    try {
      const currentServerCart = serverCart ?? (await getCart());
      const serverById = new Map(
        currentServerCart.items.map((item) => [item.productId, item])
      );

      for (const guestItem of guestItems) {
        const existing = serverById.get(guestItem.productId);

        if (!existing) {
          await addToCart({
            productId: guestItem.productId,
            quantity: Math.max(1, guestItem.quantity),
          });
          continue;
        }

        const mergedQuantity =
          existing.quantity + Math.max(1, guestItem.quantity);

        if (mergedQuantity !== existing.quantity) {
          await updateCartItem(guestItem.productId, mergedQuantity);
        }
      }

      clearGuestCartStorage();
      const mergedCart = await getCart();
      setCartState(set, mapServerCartToStoreItems(mergedCart));
    } finally {
      set({ isSyncing: false });
    }
  },
  resetState: () => {
    clearGuestCartStorage();
    set({ pendingProductIds: [] });
    setCartState(set, []);
  },
}));
