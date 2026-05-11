import { create, type StoreApi } from "zustand";

import { mapApiProductToAppProduct } from "@/services/api";
import { useAuthStore } from "@/store/auth/authStore";
import type { AppProduct } from "@/types/app";
import type { CartData } from "@/types/cart";

export const GUEST_CART_STORAGE_KEY = "guest_cart";

export interface CartItem extends AppProduct {
  productId: string;
  quantity: number;
}

type CommerceCartProductInput = Pick<
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

interface CartStore {
  items: CartItem[];
  cart: CartItem[];
  isSyncing: boolean;
  pendingProductIds: string[];

  hydrateGuestCart: () => void;
  setSyncing: (value: boolean) => void;
  setPending: (productId: string, isPending: boolean) => void;
  addOptimisticItem: (
    product: CommerceCartProductInput,
    quantity?: number
  ) => void;
  removeOptimisticItem: (productId: string) => void;
  setOptimisticQuantity: (productId: string, quantity: number) => void;
  replaceWithServerCart: (
    serverCart: CartData,
    fallbackItems?: CartItem[]
  ) => void;
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
  product: CommerceCartProductInput,
  quantity = 1,
  productId?: string
): CartItem => ({
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
  addOptimisticItem: (product, quantity = 1) => {
    const previousItems = get().cart;
    const normalizedProduct = normalizeCartItem(product, quantity);
    const nextItems = (() => {
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

    setCartState(set, nextItems);

    if (!useAuthStore.getState().isAuthenticated) {
      saveGuestCart(nextItems);
    }
  },
  removeOptimisticItem: (productId) => {
    const nextItems = get().cart.filter((item) => item.productId !== productId);

    setCartState(set, nextItems);

    if (!useAuthStore.getState().isAuthenticated) {
      saveGuestCart(nextItems);
    }
  },
  setOptimisticQuantity: (productId, quantity) => {
    const nextItems =
      quantity <= 0
        ? get().cart.filter((item) => item.productId !== productId)
        : get().cart.map((item) =>
            item.productId === productId
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          );

    setCartState(set, nextItems);

    if (!useAuthStore.getState().isAuthenticated) {
      saveGuestCart(nextItems);
    }
  },
  replaceWithServerCart: (serverCart, fallbackItems) => {
    setCartState(
      set,
      mapServerCartToStoreItems(serverCart, fallbackItems ?? get().cart)
    );
  },
  addToCart: async (product, quantity = 1) => {
    get().addOptimisticItem(product, quantity);
  },
  setCart: (items) => {
    setCartState(set, items);

    if (!useAuthStore.getState().isAuthenticated) {
      saveGuestCart(items);
    }
  },
  setQuantity: (id, quantity) => {
    get().setOptimisticQuantity(id, quantity);
  },
  removeFromCart: async (id) => {
    get().removeOptimisticItem(id);
  },
  clearCart: async () => {
    setCartState(set, []);

    if (!useAuthStore.getState().isAuthenticated) {
      clearGuestCartStorage();
    }
  },
  updateQuantity: async (productId, quantity) => {
    get().setOptimisticQuantity(productId, quantity);
  },
  syncWithServer: async (serverCart) => {
    if (!useAuthStore.getState().isAuthenticated || !serverCart) {
      return;
    }

    get().replaceWithServerCart(serverCart);
  },
  mergeGuestCart: async (serverCart) => {
    if (!useAuthStore.getState().isAuthenticated) {
      return;
    }

    clearGuestCartStorage();

    if (serverCart) {
      get().replaceWithServerCart(serverCart);
    }
  },
  resetState: () => {
    clearGuestCartStorage();
    set({ pendingProductIds: [] });
    setCartState(set, []);
  },
}));
