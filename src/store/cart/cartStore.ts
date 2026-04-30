import { create, type StoreApi } from "zustand";

import {
  addToCart,
  clearCart as clearServerCart,
  getCart,
  mapApiProductToAppProduct,
  removeFromCart as removeFromServerCart,
  updateCartItem,
} from "@/services/api";
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

const shouldLogAuthenticatedCart = () =>
  process.env.NODE_ENV !== "production" &&
  useAuthStore.getState().isAuthenticated;

const logAuthenticatedCartState = (
  stage: string,
  details: Record<string, unknown>
) => {
  if (!shouldLogAuthenticatedCart()) {
    return;
  }

  console.groupCollapsed(`[cart][auth] ${stage}`);
  for (const [key, value] of Object.entries(details)) {
    console.log(key, value);
  }
  console.groupEnd();
};

const isMeaningfulName = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return (
    normalized.length > 0 &&
    normalized !== "товар" &&
    normalized !== "товар без назви"
  );
};

const isMeaningfulImage = (value: string | undefined): boolean => {
  if (!value) {
    return false;
  }

  const normalized = value.trim();
  return normalized.length > 0 && normalized !== "/img/not-img.webp";
};

const resolveMeaningfulStock = (
  primaryStock: number | undefined,
  fallbackStock: number | undefined
): number | undefined => {
  if (typeof primaryStock === "number" && Number.isFinite(primaryStock)) {
    return Math.max(0, primaryStock);
  }

  if (typeof fallbackStock === "number" && Number.isFinite(fallbackStock)) {
    return Math.max(0, fallbackStock);
  }

  return undefined;
};

const resolveCartFallbackItem = (
  item: CartData["items"][number],
  index: number,
  fallbackItems: CartItem[],
  fallbackByProductId: Map<string, CartItem>
): CartItem | undefined => {
  return (
    fallbackByProductId.get(item.productId) ??
    fallbackItems.find((fallbackItem) => fallbackItem.id === item.productId) ??
    fallbackItems[index]
  );
};

const mapServerCartToStoreItems = (
  serverCart: CartData,
  fallbackItems: CartItem[] = []
): CartItem[] => {
  const fallbackByProductId = new Map(
    fallbackItems.map((item) => [item.productId, item])
  );

  return serverCart.items.map((item, index) => {
    const fallbackItem = resolveCartFallbackItem(
      item,
      index,
      fallbackItems,
      fallbackByProductId
    );
    const mappedProduct = item.product
      ? mapApiProductToAppProduct(item.product) ?? {
          id: item.productId,
          name: item.product?.name ?? fallbackItem?.name ?? "Товар",
          price: item.price || fallbackItem?.price || 0,
          image:
            item.product?.image ?? fallbackItem?.image ?? "/img/not-img.webp",
          category: fallbackItem?.category ?? "Загальна",
          brand: fallbackItem?.brand ?? "Budleader",
          inStock: fallbackItem?.inStock ?? true,
        }
      : fallbackItem ?? {
          id: item.productId,
          name: "Товар",
          price: item.price,
          image: "/img/not-img.webp",
          category: "Загальна",
          brand: "Budleader",
          inStock: true,
        };

    const mergedProduct: AppProduct = {
      ...(fallbackItem ?? {}),
      ...mappedProduct,
      id: mappedProduct.id || fallbackItem?.id || item.productId,
      name: isMeaningfulName(mappedProduct.name)
        ? mappedProduct.name
        : fallbackItem?.name ?? "Товар",
      price:
        item.price > 0
          ? item.price
          : mappedProduct.price > 0
          ? mappedProduct.price
          : fallbackItem?.price ?? 0,
      stock: resolveMeaningfulStock(mappedProduct.stock, fallbackItem?.stock),
      image: isMeaningfulImage(mappedProduct.image)
        ? mappedProduct.image
        : fallbackItem?.image ?? "/img/not-img.webp",
      category: mappedProduct.category || fallbackItem?.category || "Загальна",
      brand: mappedProduct.brand || fallbackItem?.brand || "Budleader",
      inStock: mappedProduct.inStock ?? fallbackItem?.inStock ?? true,
    };

    return normalizeCartItem(
      mergedProduct,
      item.quantity,
      item.productId || mergedProduct.id
    );
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

      const previousItems = get().cart;
      const normalizedProduct = normalizeCartItem(product, quantity);
      const optimisticItems = (() => {
        const existing = previousItems.find(
          (item) => item.productId === product.id
        );

        if (!existing) {
          return [...previousItems, normalizedProduct];
        }

        return previousItems.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + Math.max(1, quantity),
              }
            : item
        );
      })();

      setCartState(set, optimisticItems);
      logAuthenticatedCartState("add optimistic", {
        productId: product.id,
        previousItems,
        optimisticItems,
      });

      try {
        const serverCart = await addToCart({
          productId: product.id,
          quantity: Math.max(1, quantity),
        });
        const mergedItems = mapServerCartToStoreItems(
          serverCart,
          optimisticItems
        );
        logAuthenticatedCartState("add server response", {
          productId: product.id,
          serverCart,
          mergedItems,
        });
        setCartState(set, mergedItems);
      } catch (error) {
        logAuthenticatedCartState("add rollback", {
          productId: product.id,
          error,
          rollbackItems: previousItems,
        });
        setCartState(set, previousItems);
        throw error;
      } finally {
        removePendingProductId(set, product.id);
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

      const previousItems = get().cart;
      const optimisticItems = previousItems.filter(
        (item) => item.productId !== id
      );
      setCartState(set, optimisticItems);
      logAuthenticatedCartState("remove optimistic", {
        productId: id,
        previousItems,
        optimisticItems,
      });

      try {
        const serverCart = await removeFromServerCart(id);
        const mergedItems = mapServerCartToStoreItems(
          serverCart,
          optimisticItems
        );
        logAuthenticatedCartState("remove server response", {
          productId: id,
          serverCart,
          mergedItems,
        });
        setCartState(set, mergedItems);
      } catch (error) {
        logAuthenticatedCartState("remove rollback", {
          productId: id,
          error,
          rollbackItems: previousItems,
        });
        setCartState(set, previousItems);
        throw error;
      } finally {
        removePendingProductId(set, id);
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

      const previousItems = get().cart;
      setCartState(set, []);
      logAuthenticatedCartState("clear optimistic", {
        previousItems,
      });

      try {
        const serverCart = await clearServerCart();
        const mergedItems = mapServerCartToStoreItems(serverCart);
        logAuthenticatedCartState("clear server response", {
          serverCart,
          mergedItems,
        });
        setCartState(set, mergedItems);
      } catch (error) {
        logAuthenticatedCartState("clear rollback", {
          error,
          rollbackItems: previousItems,
        });
        setCartState(set, previousItems);
        throw error;
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

    const previousItems = get().cart;
    const optimisticItems =
      quantity <= 0
        ? previousItems.filter((item) => item.productId !== productId)
        : previousItems.map((item) =>
            item.productId === productId
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          );

    setCartState(set, optimisticItems);
    logAuthenticatedCartState("update optimistic", {
      productId,
      quantity,
      previousItems,
      optimisticItems,
    });

    try {
      const serverCart =
        quantity <= 0
          ? await removeFromServerCart(productId)
          : await updateCartItem(productId, quantity);
      const mergedItems = mapServerCartToStoreItems(
        serverCart,
        optimisticItems
      );
      logAuthenticatedCartState("update server response", {
        productId,
        quantity,
        serverCart,
        mergedItems,
      });
      setCartState(set, mergedItems);
    } catch (error) {
      logAuthenticatedCartState("update rollback", {
        productId,
        quantity,
        error,
        rollbackItems: previousItems,
      });
      setCartState(set, previousItems);
      throw error;
    } finally {
      removePendingProductId(set, productId);
    }
  },
  syncWithServer: async (serverCart) => {
    if (!useAuthStore.getState().isAuthenticated) {
      return;
    }

    set({ isSyncing: true });

    try {
      const resolvedCart = serverCart ?? (await getCart());
      const mergedItems = mapServerCartToStoreItems(resolvedCart, get().cart);
      logAuthenticatedCartState("sync with server", {
        resolvedCart,
        mergedItems,
      });
      setCartState(set, mergedItems);
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
      setCartState(set, mapServerCartToStoreItems(mergedCart, get().cart));
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
