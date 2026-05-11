"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  HydrationBoundary,
  type DehydratedState,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { unstable_batchedUpdates } from "react-dom";

import {
  mergeGuestCartAction,
  mergeGuestWishlistAction,
} from "@/actions/commerceActions";
import { USER_QUERY_KEY } from "@/queries/authQueries";
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
import { createQueryClient } from "@/store/queryClient";
import type { ThemeMode } from "@/types/app";
import type { User } from "@/types/auth";

interface ProvidersProps {
  children: ReactNode;
  initialTheme: ThemeMode;
  initialUser: User | null;
  dehydratedState?: DehydratedState;
}

interface PerfState {
  bootStart?: number;
  hydrationStart?: number;
  hydrationLogged?: boolean;
}

type PerfWindow = Window & {
  __blPerf?: PerfState;
};

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
  const replaceWithServerCart = useCartStore(
    (state) => state.replaceWithServerCart
  );
  const setCartSyncing = useCartStore((state) => state.setSyncing);
  const resetCartState = useCartStore((state) => state.resetState);
  const hydrateGuestWishlist = useWishlistStore(
    (state) => state.hydrateGuestWishlist
  );
  const replaceWithServerWishlist = useWishlistStore(
    (state) => state.replaceWithServerWishlist
  );
  const setWishlistSyncing = useWishlistStore((state) => state.setSyncing);
  const resetWishlistState = useWishlistStore((state) => state.resetState);
  const setTheme = useUIStore((state) => state.setTheme);
  const syncedUserIdRef = useRef<string | null>(null);
  const wasAuthenticatedRef = useRef(false);
  const sessionThemeKeyRef = useRef<string | null>(null);
  const hasScheduledDeferredRef = useRef(false);
  const [isDeferredReady, setIsDeferredReady] = useState(false);
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
  }, [initialTheme, resolvedAuthTheme, sessionKey, setTheme]);

  useEffect(() => {
    if (hasScheduledDeferredRef.current) {
      return;
    }

    hasScheduledDeferredRef.current = true;

    const startDeferred = () => {
      setIsDeferredReady(true);
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(startDeferred);

      return () => {
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(startDeferred, 0);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!isDeferredReady) {
      return;
    }

    const nextTheme =
      sessionKey === "guest"
        ? resolveClientThemeMode(initialTheme)
        : resolvedAuthTheme;

    persistThemeMode(nextTheme);
  }, [initialTheme, isDeferredReady, resolvedAuthTheme, sessionKey]);

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    ensureGuestCommerceTab();
    hydrateGuestCart();
    hydrateGuestWishlist();
  }, [hydrateGuestCart, hydrateGuestWishlist, isAuthenticated]);

  useEffect(() => {
    if (!isDeferredReady) {
      return;
    }

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
  }, [isDeferredReady, queryClient, resetCartState, resetWishlistState]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      syncedUserIdRef.current = null;
      return;
    }

    if (syncedUserIdRef.current === user.id) {
      return;
    }

    const syncCommerce = async () => {
      const guestCartItems = useCartStore.getState().cart;
      const guestWishlistIds = useWishlistStore
        .getState()
        .wishlist.map((item) => item.id)
        .filter((item): item is string => isMongoObjectId(item));

      if (guestCartItems.length === 0 && guestWishlistIds.length === 0) {
        syncedUserIdRef.current = user.id;
        return;
      }

      setCartSyncing(true);
      setWishlistSyncing(true);

      try {
        if (guestCartItems.length > 0) {
          const mergedCart = await mergeGuestCartAction(
            guestCartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            }))
          );

          queryClient.setQueryData(CART_QUERY_KEY, mergedCart);
          resetCartState();
          replaceWithServerCart(mergedCart, guestCartItems);
        }

        if (guestWishlistIds.length > 0) {
          const mergedWishlist = await mergeGuestWishlistAction(
            guestWishlistIds
          );

          unstable_batchedUpdates(() => {
            queryClient.setQueryData(WISHLIST_QUERY_KEY, mergedWishlist);
            replaceWithServerWishlist(mergedWishlist.items, {
              allowEmpty: true,
              clearGuestStorage: true,
              resetPending: true,
            });
          });
        }

        syncedUserIdRef.current = user.id;
      } catch {
        syncedUserIdRef.current = null;
      } finally {
        setCartSyncing(false);
        setWishlistSyncing(false);
      }
    };

    void syncCommerce();
  }, [
    isAuthenticated,
    queryClient,
    replaceWithServerCart,
    resetCartState,
    resetWishlistState,
    setCartSyncing,
    replaceWithServerWishlist,
    setWishlistSyncing,
    user?.id,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const serverCart = cartQuery.data;

    if (!serverCart?.items) {
      return;
    }

    replaceWithServerCart(serverCart);
  }, [cartQuery.data, isAuthenticated, replaceWithServerCart]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const serverWishlist = wishlistQuery.data?.items;
    if (!serverWishlist) {
      return;
    }

    replaceWithServerWishlist(serverWishlist, { allowEmpty: true });
  }, [isAuthenticated, replaceWithServerWishlist, wishlistQuery.data?.items]);

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
  dehydratedState,
}: ProvidersProps) {
  const [queryClient] = useState<QueryClient>(() => createQueryClient());
  const hasMarkedHydrationStartRef = useRef(false);

  if (!hasMarkedHydrationStartRef.current && typeof window !== "undefined") {
    hasMarkedHydrationStartRef.current = true;

    const perfWindow = window as PerfWindow;
    const perfState = perfWindow.__blPerf ?? {};

    perfWindow.__blPerf = perfState;
    perfState.hydrationStart = performance.now();
    performance.mark("app:hydration:start");

    console.debug("[perf] hydration start", {
      ms: Math.round(perfState.hydrationStart),
      path: window.location.pathname,
    });
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const perfWindow = window as PerfWindow;
    const perfState = perfWindow.__blPerf ?? {};
    const now = performance.now();

    perfWindow.__blPerf = perfState;

    if (perfState.hydrationLogged) {
      return;
    }

    perfState.hydrationLogged = true;

    performance.mark("app:hydration:end");

    try {
      performance.measure(
        "app:hydration",
        "app:hydration:start",
        "app:hydration:end"
      );
    } catch {
      // Intentionally ignore mark/measure mismatches in non-standard environments.
    }

    const hydrationStart = perfState.hydrationStart;
    const hydrationMs =
      typeof hydrationStart === "number" ? now - hydrationStart : null;
    const bootStart = perfState.bootStart;
    const bootMs = typeof bootStart === "number" ? now - bootStart : null;

    console.debug("[perf] hydration end", {
      ms: hydrationMs !== null ? Math.round(hydrationMs) : null,
      path: window.location.pathname,
    });

    console.debug("[perf] client js boot", {
      ms: bootMs !== null ? Math.round(bootMs) : null,
      path: window.location.pathname,
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <AppBootstrap initialTheme={initialTheme} initialUser={initialUser} />
        {children}
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
