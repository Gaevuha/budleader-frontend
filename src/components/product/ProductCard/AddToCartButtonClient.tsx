"use client";

import { memo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";

import {
  addToCartAction,
  removeFromCartAction,
} from "@/actions/commerceActions";
import { toast } from "@/components/UI/notifications/toast";
import { CART_QUERY_KEY } from "@/queries/queryKeys";
import { useAuthStore } from "@/store/auth/authStore";
import { useCartStore } from "@/store/cart/cartStore";

import styles from "./ProductCard.module.css";
import type { ProductCardActionProduct } from "./productCardShared";

interface AddToCartButtonClientProps {
  product: ProductCardActionProduct;
  variant: "grid" | "list";
}

export const AddToCartButtonClient = memo(function AddToCartButtonClient({
  product,
  variant,
}: AddToCartButtonClientProps) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInCart = useCartStore((state) =>
    state.cart.some(
      (item) => item.productId === product.id || item.id === product.id
    )
  );
  const isPending = useCartStore((state) =>
    state.pendingProductIds.includes(product.id)
  );
  const addOptimisticItem = useCartStore((state) => state.addOptimisticItem);
  const removeOptimisticItem = useCartStore(
    (state) => state.removeOptimisticItem
  );
  const replaceWithServerCart = useCartStore(
    (state) => state.replaceWithServerCart
  );
  const setCart = useCartStore((state) => state.setCart);
  const setPending = useCartStore((state) => state.setPending);

  const isDisabled = !product.inStock || isPending;

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (isDisabled) {
        return;
      }

      const previousItems = useCartStore.getState().cart;
      const wasInCart = isInCart;

      setPending(product.id, true);

      if (wasInCart) {
        removeOptimisticItem(product.id);
      } else {
        addOptimisticItem(product, 1);
      }

      if (!isAuthenticated) {
        setPending(product.id, false);
        toast.success(
          wasInCart ? "Товар видалено з кошика" : "Товар додано до кошика!"
        );
        return;
      }

      try {
        const serverCart = wasInCart
          ? await removeFromCartAction(product.id)
          : await addToCartAction({
              productId: product.id,
              quantity: 1,
            });

        queryClient.setQueryData(CART_QUERY_KEY, serverCart);
        replaceWithServerCart(serverCart);
        toast.success(
          wasInCart ? "Товар видалено з кошика" : "Товар додано до кошика!"
        );
      } catch {
        setCart(previousItems);
        toast.error("Не вдалося оновити кошик");
      } finally {
        setPending(product.id, false);
      }
    },
    [
      addOptimisticItem,
      isAuthenticated,
      isDisabled,
      isInCart,
      product,
      queryClient,
      removeOptimisticItem,
      replaceWithServerCart,
      setCart,
      setPending,
    ]
  );

  if (variant === "grid") {
    return (
      <button
        type="button"
        className={`${styles.cartBtn} ${isInCart ? styles.cartActive : ""}`}
        onClick={handleClick}
        disabled={isDisabled}
        title="Купити"
        aria-pressed={isInCart}
      >
        <ShoppingCart size={20} fill={isInCart ? "currentColor" : "none"} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.listActionBtn} ${styles.listActionPrimary} ${
        isInCart ? styles.listActionActive : ""
      }`}
      onClick={handleClick}
      disabled={isDisabled}
      title="Кошик"
      aria-label="Додати в кошик"
      aria-pressed={isInCart}
    >
      <ShoppingCart size={18} fill={isInCart ? "currentColor" : "none"} />
    </button>
  );
});