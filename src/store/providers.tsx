"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  addToCartCSR,
  addToWishlistCSR,
  getCartCSR,
  getWishlistCSR,
} from "@/services/apiClient";
import { mapApiProductToAppProduct } from "@/services/api";
import { useAuthStore } from "@/store/auth/authStore";
import { useCartStore } from "@/store/cart/cartStore";
import { useWishlistStore } from "@/store/wishlist/wishlistStore";

interface ProvidersProps {
  children: ReactNode;
}

let bootstrapStarted = false;

function AppBootstrap() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const localCart = useCartStore((state) => state.cart);
  const setCart = useCartStore((state) => state.setCart);
  const localWishlist = useWishlistStore((state) => state.wishlist);
  const setWishlist = useWishlistStore((state) => state.setWishlist);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (bootstrapStarted) {
      return;
    }

    bootstrapStarted = true;

    const init = async () => {
      try {
        await initializeAuth();
      } catch {
        // User is not authenticated or session is expired.
      }
    };

    void init();
  }, [initializeAuth]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    // initializeAuth already performs the initial me() call, so this effect is
    // only a safe fallback when user data is still missing.
    if (user?.id) {
      return;
    }

    void fetchMe().catch(() => {
      // Session errors are handled in authStore; avoid unhandled runtime errors.
    });
  }, [accessToken, fetchMe, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      syncedUserIdRef.current = null;
      return;
    }

    if (syncedUserIdRef.current === user.id) {
      return;
    }

    syncedUserIdRef.current = user.id;

    const syncCommerce = async () => {
      for (const item of localCart) {
        try {
          await addToCartCSR({
            productId: item.id,
            quantity: Math.max(1, item.quantity),
          });
        } catch {
          // Continue syncing remaining items even if one item fails.
        }
      }

      for (const item of localWishlist) {
        try {
          await addToWishlistCSR(item.id);
        } catch {
          // Item may already exist on server.
        }
      }

      try {
        const [serverCart, serverWishlist] = await Promise.all([
          getCartCSR(),
          getWishlistCSR(),
        ]);

        const normalizedCart = serverCart.items.map((item) => ({
          ...(item.product
            ? mapApiProductToAppProduct(item.product) ?? {
                id: item.productId,
                name: "Товар",
                price: item.price,
                image: "",
                category: "Загальна",
                brand: "Budleader",
                inStock: true,
              }
            : {
                id: item.productId,
                name: "Товар",
                price: item.price,
                image: "",
                category: "Загальна",
                brand: "Budleader",
                inStock: true,
              }),
          quantity: item.quantity,
        }));

        setCart(normalizedCart);
        setWishlist(serverWishlist.items);
      } catch {
        // Keep local state if server sync fetch fails.
      }
    };

    void syncCommerce();
  }, [
    isAuthenticated,
    localCart,
    localWishlist,
    setCart,
    setWishlist,
    user?.id,
  ]);

  return null;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppBootstrap />
      {children}
    </QueryClientProvider>
  );
}
