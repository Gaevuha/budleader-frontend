"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";

import { USER_QUERY_KEY } from "@/queries/authQueries";
import { resetCommerceRequestCache } from "@/services/apiClient";
import {
  type AuthBroadcastEvent,
  createAuthBroadcastChannel,
} from "@/services/authBroadcast";
import { useCartQuery } from "@/queries/cartQueries";
import { useUser } from "@/queries/authQueries";
import { useWishlistQuery } from "@/queries/wishlistQueries";
import { GUEST_CART_STORAGE_KEY, useCartStore } from "@/store/cart/cartStore";
import { useUIStore } from "@/store/ui/uiStore";
import {
  GUEST_WISHLIST_STORAGE_KEY,
  useWishlistStore,
} from "@/store/wishlist/wishlistStore";
import { CART_QUERY_KEY } from "@/queries/cartQueries";
import { WISHLIST_QUERY_KEY } from "@/queries/wishlistQueries";
import {
  applyThemeToDocument,
  persistThemeMode,
  resolveClientThemeMode,
} from "@/services/themePreference";
import type { ThemeMode } from "@/types/app";
import type { User } from "@/types/auth";

interface ProvidersProps {
  children: ReactNode;
  initialTheme: ThemeMode;
  initialUser: User | null;
}

const isMongoObjectId = (value: string): boolean =>
  /^[a-f0-9]{24}$/i.test(value);

const GUEST_COMMERCE_TAB_KEY = "guest_commerce_tab_id";

const ensureGuestCommerceTab = () => {
  if (typeof window === "undefined") {
    return;
  }

  const existingTabId = window.sessionStorage.getItem(GUEST_COMMERCE_TAB_KEY);

  if (existingTabId) {
    return;
  }

  window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  window.localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY);
  window.sessionStorage.setItem(
    GUEST_COMMERCE_TAB_KEY,
    window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
  );
};

function AppBootstrap({
  initialTheme,
  initialUser,
}: {
  initialTheme: ThemeMode;
  initialUser: User | null;
}) {
  const queryClient = useQueryClient();
  const userQuery = useUser({ initialData: initialUser });
  const user = userQuery.data;
  const isAuthenticated = Boolean(user);
  const hydrateGuestCart = useCartStore((state) => state.hydrateGuestCart);
  const syncCartWithServer = useCartStore((state) => state.syncWithServer);
  const mergeGuestCart = useCartStore((state) => state.mergeGuestCart);
  const resetCartState = useCartStore((state) => state.resetState);
  const hydrateGuestWishlist = useWishlistStore(
    (state) => state.hydrateGuestWishlist
  );
  const syncWishlistWithServer = useWishlistStore(
    (state) => state.syncWithServer
  );
  const mergeGuestWishlist = useWishlistStore(
    (state) => state.mergeGuestWishlist
  );
  const resetWishlistState = useWishlistStore((state) => state.resetState);
  const setTheme = useUIStore((state) => state.setTheme);
  const syncedUserIdRef = useRef<string | null>(null);
  const wasAuthenticatedRef = useRef(false);
  const sessionThemeKeyRef = useRef<string | null>(null);
  const cartQuery = useCartQuery(isAuthenticated);
  const wishlistQuery = useWishlistQuery(isAuthenticated);
  const userTheme = user?.theme;
  const sessionKey = user?.id ?? "guest";
  const resolvedAuthTheme = userTheme ?? initialTheme;

  useEffect(() => {
    const didSessionChange = sessionThemeKeyRef.current !== sessionKey;

    if (didSessionChange) {
      sessionThemeKeyRef.current = sessionKey;
    }

    const nextTheme =
      sessionKey === "guest"
        ? resolveClientThemeMode(initialTheme)
        : resolvedAuthTheme;

    setTheme(nextTheme);
    applyThemeToDocument(nextTheme);
    persistThemeMode(nextTheme);
  }, [initialTheme, resolvedAuthTheme, sessionKey, setTheme]);

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    ensureGuestCommerceTab();
    hydrateGuestCart();
    hydrateGuestWishlist();
  }, [hydrateGuestCart, hydrateGuestWishlist, isAuthenticated]);

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
        resetCartState();
        resetWishlistState();
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
  }, [queryClient, resetCartState, resetWishlistState]);

  useEffect(() => {
    const isWishlistReadyForSync =
      wishlistQuery.isFetched || (wishlistQuery.data?.items?.length ?? 0) === 0;

    if (!isAuthenticated || !user?.id) {
      syncedUserIdRef.current = null;
      return;
    }

    if (!isWishlistReadyForSync) {
      return;
    }

    if (syncedUserIdRef.current === user.id) {
      return;
    }

    syncedUserIdRef.current = user.id;

    const syncCommerce = async () => {
      await mergeGuestCart(cartQuery.data ?? null);

      const safeServerWishlist = (wishlistQuery.data?.items ?? []).filter(
        (item) => isMongoObjectId(item.id)
      );

      await mergeGuestWishlist(safeServerWishlist);

      resetCommerceRequestCache();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY }),
      ]);
    };

    void syncCommerce();
  }, [
    isAuthenticated,
    cartQuery.data,
    queryClient,
    user?.id,
    mergeGuestCart,
    mergeGuestWishlist,
    wishlistQuery.data,
    wishlistQuery.data?.items,
    wishlistQuery.isFetched,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const serverItems = cartQuery.data?.items;
    if (!serverItems) {
      return;
    }

    void syncCartWithServer(cartQuery.data ?? null);
  }, [cartQuery.data, isAuthenticated, syncCartWithServer]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const serverWishlist = wishlistQuery.data?.items;
    if (!serverWishlist) {
      return;
    }

    void syncWishlistWithServer(serverWishlist);
  }, [isAuthenticated, syncWishlistWithServer, wishlistQuery.data?.items]);

  useEffect(() => {
    if (isAuthenticated) {
      wasAuthenticatedRef.current = true;
      return;
    }

    // If a logged-in session existed, local persisted commerce state may
    // contain mirrored server data and should be cleared on logout.
    if (wasAuthenticatedRef.current) {
      resetCartState();
      resetWishlistState();
      hydrateGuestCart();
      hydrateGuestWishlist();
      syncedUserIdRef.current = null;
      wasAuthenticatedRef.current = false;
    }
  }, [
    hydrateGuestCart,
    hydrateGuestWishlist,
    isAuthenticated,
    resetCartState,
    resetWishlistState,
  ]);

  return null;
}

export function Providers({
  children,
  initialTheme,
  initialUser,
}: ProvidersProps) {
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
      <AppBootstrap initialTheme={initialTheme} initialUser={initialUser} />
      {children}
    </QueryClientProvider>
  );
}
