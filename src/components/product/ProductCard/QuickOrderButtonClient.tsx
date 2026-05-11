"use client";

import { memo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Zap } from "lucide-react";

import { addToCartAction } from "@/actions/commerceActions";
import { toast } from "@/components/UI/notifications/toast";
import { CART_QUERY_KEY } from "@/queries/queryKeys";
import { useAuthStore } from "@/store/auth/authStore";
import { useCartStore } from "@/store/cart/cartStore";
import { useModalStore } from "@/store/ui/modalStore";

import styles from "./ProductCard.module.css";
import type { ProductCardActionProduct } from "./productCardShared";

interface QuickOrderButtonClientProps {
  product: ProductCardActionProduct;
  variant: "grid" | "list";
}

export const QuickOrderButtonClient = memo(function QuickOrderButtonClient({
  product,
  variant,
}: QuickOrderButtonClientProps) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isPending = useCartStore((state) =>
    state.pendingProductIds.includes(product.id)
  );
  const addOptimisticItem = useCartStore((state) => state.addOptimisticItem);
  const replaceWithServerCart = useCartStore(
    (state) => state.replaceWithServerCart
  );
  const setCart = useCartStore((state) => state.setCart);
  const setPending = useCartStore((state) => state.setPending);
  const openModal = useModalStore((state) => state.openModal);

  const isDisabled = !product.inStock || isPending;

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (isDisabled) {
        return;
      }

      if (!isAuthenticated) {
        openModal({
          type: "quickOrder",
          productId: product.id,
          productName: product.name,
        });
        return;
      }

      const previousItems = useCartStore.getState().cart;

      setPending(product.id, true);
      addOptimisticItem(product, 1);

      try {
        const serverCart = await addToCartAction({
          productId: product.id,
          quantity: 1,
        });

        queryClient.setQueryData(CART_QUERY_KEY, serverCart);
        replaceWithServerCart(serverCart);
        toast.success("Товар додано до кошика!");
      } catch {
        setCart(previousItems);
        toast.error("Не вдалося додати товар у кошик");
      } finally {
        setPending(product.id, false);
      }
    },
    [
      addOptimisticItem,
      isAuthenticated,
      isDisabled,
      openModal,
      product,
      queryClient,
      replaceWithServerCart,
      setCart,
      setPending,
    ]
  );

  if (variant === "grid") {
    return (
      <button
        type="button"
        className={styles.quickOrderBtn}
        onClick={handleClick}
        disabled={isDisabled}
        title="Швидке замовлення"
      >
        <Zap className={styles.buttonIcon} />
        <span>Швидке замовлення</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={styles.listActionBtn}
      onClick={handleClick}
      disabled={isDisabled}
      title="Швидке замовлення"
      aria-label="Швидке замовлення"
    >
      <Zap size={18} />
    </button>
  );
});