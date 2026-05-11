"use client";

import { memo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { unstable_batchedUpdates } from "react-dom";

import { toggleWishlistAction } from "@/actions/commerceActions";
import { toast } from "@/components/UI/notifications/toast";
import { WISHLIST_QUERY_KEY } from "@/queries/queryKeys";
import type { WishlistResult } from "@/services/api";
import { useAuthStore } from "@/store/auth/authStore";
import { useWishlistStore } from "@/store/wishlist/wishlistStore";

import styles from "./ProductCard.module.css";
import type { ProductCardActionProduct } from "./productCardShared";

interface WishlistButtonClientProps {
  product: ProductCardActionProduct;
  variant: "grid" | "list";
}

export const WishlistButtonClient = memo(function WishlistButtonClient({
  product,
  variant,
}: WishlistButtonClientProps) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isWishlisted = useWishlistStore((state) =>
    state.wishlist.some((item) => item.id === product.id)
  );
  const isPending = useWishlistStore((state) =>
    state.pendingProductIds.includes(product.id)
  );
  const addOptimisticItem = useWishlistStore(
    (state) => state.addOptimisticItem
  );
  const removeOptimisticItem = useWishlistStore(
    (state) => state.removeOptimisticItem
  );
  const setPending = useWishlistStore((state) => state.setPending);
  const setWishlist = useWishlistStore((state) => state.setWishlist);
  const replaceWithServerWishlist = useWishlistStore(
    (state) => state.replaceWithServerWishlist
  );

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (isPending) {
        return;
      }

      const previousWishlist = useWishlistStore.getState().wishlist;
      const previousWishlistQuery =
        queryClient.getQueryData<WishlistResult>(WISHLIST_QUERY_KEY);
      const wasWishlisted = isWishlisted;

      setPending(product.id, true);

      if (wasWishlisted) {
        removeOptimisticItem(product.id);
      } else {
        addOptimisticItem(product);
      }

      if (!isAuthenticated) {
        setPending(product.id, false);
        toast.success(
          wasWishlisted ? "Видалено з обраного" : "Додано до обраного"
        );
        return;
      }

      try {
        const serverWishlist = await toggleWishlistAction(
          product.id,
          !wasWishlisted
        );

        let didApplyServerWishlist = false;

        unstable_batchedUpdates(() => {
          queryClient.setQueryData(WISHLIST_QUERY_KEY, serverWishlist);
          didApplyServerWishlist = replaceWithServerWishlist(
            serverWishlist.items,
            { allowEmpty: true }
          );
        });

        if (!didApplyServerWishlist) {
          throw new Error(
            "Wishlist sync requires a confirmed full server state"
          );
        }

        toast.success(
          wasWishlisted ? "Видалено з обраного" : "Додано до обраного"
        );
      } catch {
        unstable_batchedUpdates(() => {
          if (previousWishlistQuery) {
            queryClient.setQueryData(WISHLIST_QUERY_KEY, previousWishlistQuery);
          }

          setWishlist(previousWishlist);
        });
        toast.error("Не вдалося оновити список бажань");
      } finally {
        setPending(product.id, false);
      }
    },
    [
      addOptimisticItem,
      isAuthenticated,
      isPending,
      isWishlisted,
      product,
      queryClient,
      replaceWithServerWishlist,
      removeOptimisticItem,
      setPending,
      setWishlist,
    ]
  );

  if (variant === "grid") {
    return (
      <button
        type="button"
        className={`${styles.wishlistBtn} ${
          isWishlisted ? styles.wishlistActive : ""
        }`}
        onClick={handleClick}
        disabled={isPending}
        title="В обране"
        aria-pressed={isWishlisted}
      >
        <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.listActionBtn} ${
        isWishlisted ? styles.listActionActive : ""
      }`}
      onClick={handleClick}
      disabled={isPending}
      title="В обране"
      aria-label="Додати в обране"
      aria-pressed={isWishlisted}
    >
      <Heart size={18} fill={isWishlisted ? "currentColor" : "none"} />
    </button>
  );
});
