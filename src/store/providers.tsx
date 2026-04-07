"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";

import { USER_QUERY_KEY } from "@/queries/authQueries";
import {
  addToCartCSR,
  addToWishlistCSR,
  resetCommerceRequestCache,
} from "@/services/apiClient";
import {
  type AuthBroadcastEvent,
  createAuthBroadcastChannel,
} from "@/services/authBroadcast";
import { useCartQuery } from "@/queries/cartQueries";
import { useUser } from "@/queries/authQueries";
import { useWishlistQuery } from "@/queries/wishlistQueries";
import { mapApiProductToAppProduct } from "@/services/api";
import { useCartStore } from "@/store/cart/cartStore";
import { useWishlistStore } from "@/store/wishlist/wishlistStore";
import { CART_QUERY_KEY } from "@/queries/cartQueries";
import { WISHLIST_QUERY_KEY } from "@/queries/wishlistQueries";

interface ProvidersProps {
  children: ReactNode;
}

function AppBootstrap() {
  const queryClient = useQueryClient();
  const userQuery = useUser();
  const user = userQuery.data;
  const isAuthenticated = Boolean(user);
  const localCart = useCartStore((state) => state.cart);
  const setCart = useCartStore((state) => state.setCart);
  const clearCart = useCartStore((state) => state.clearCart);
  const localWishlist = useWishlistStore((state) => state.wishlist);
  const setWishlist = useWishlistStore((state) => state.setWishlist);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);
  const syncedUserIdRef = useRef<string | null>(null);
  const wasAuthenticatedRef = useRef(false);
  const cartQuery = useCartQuery(isAuthenticated);
  const wishlistQuery = useWishlistQuery(isAuthenticated);

  useEffect(() => {
    const channel = createAuthBroadcastChannel();

    if (!channel) {
      return;
    }

    const handleMessage = (event: MessageEvent<AuthBroadcastEvent>) => {
      const payload = event.data;

      if (!payload || typeof payload !== "object") {
        return;
      }

      if (payload.type === "logout" || payload.type === "logout-all") {
        queryClient.setQueryData(USER_QUERY_KEY, null);
        queryClient.removeQueries({ queryKey: CART_QUERY_KEY });
        queryClient.removeQueries({ queryKey: WISHLIST_QUERY_KEY });
        clearCart();
        clearWishlist();
        syncedUserIdRef.current = null;
        wasAuthenticatedRef.current = false;
        return;
      }

      void queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    };

    channel.addEventListener("message", handleMessage);

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
    };
  }, [clearCart, clearWishlist, queryClient]);

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

      resetCommerceRequestCache();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY }),
      ]);
    };

    void syncCommerce();
  }, [isAuthenticated, localCart, localWishlist, queryClient, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const serverItems = cartQuery.data?.items;
    if (!serverItems) {
      return;
    }

    const normalizedCart = serverItems.map((item) => ({
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
  }, [cartQuery.data?.items, isAuthenticated, setCart]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const serverWishlist = wishlistQuery.data?.items;
    if (!serverWishlist) {
      return;
    }

    setWishlist(serverWishlist);
  }, [isAuthenticated, setWishlist, wishlistQuery.data?.items]);

  useEffect(() => {
    if (isAuthenticated) {
      wasAuthenticatedRef.current = true;
      return;
    }

    // If a logged-in session existed, local persisted commerce state may
    // contain mirrored server data and should be cleared on logout.
    if (wasAuthenticatedRef.current) {
      clearCart();
      clearWishlist();
      syncedUserIdRef.current = null;
      wasAuthenticatedRef.current = false;
    }
  }, [clearCart, clearWishlist, isAuthenticated]);

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
