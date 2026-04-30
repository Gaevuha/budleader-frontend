"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { toast } from "@/components/UI/notifications/toast";
import { WISHLIST_QUERY_KEY } from "@/queries/wishlistQueries";
import { toFiniteNumber } from "@/services/api";
import { useAuthStore } from "@/store/auth/authStore";
import { useCartStore } from "@/store/cart/cartStore";
import { useWishlistStore } from "@/store/wishlist/wishlistStore";
import type { AppProduct } from "@/types/app";
import { PRODUCT_PLACEHOLDER_SRC } from "@/utils/media";

import {
  DEFAULT_GRID_IMAGE_SIZES,
  ProductCard,
  type ProductCardProps,
} from "./ProductCard";

interface ConnectedProductCardProps {
  product: AppProduct;
  viewMode?: "grid" | "list";
  prioritizeImage?: boolean;
  gridImageSizes?: string;
}

type RatingSource = AppProduct & {
  averageRating?: unknown;
  avgRating?: unknown;
  ratingAvg?: unknown;
  characteristics?: { rating?: unknown };
};

const resolveRatingValue = (product: AppProduct): number => {
  const ratingSource = product as RatingSource;
  const rawRating =
    toFiniteNumber(ratingSource.rating) ??
    toFiniteNumber(ratingSource.averageRating) ??
    toFiniteNumber(ratingSource.avgRating) ??
    toFiniteNumber(ratingSource.ratingAvg) ??
    toFiniteNumber(ratingSource.characteristics?.rating) ??
    0;

  return Math.max(0, Math.min(5, rawRating));
};

const resolveImageSrc = (product: AppProduct, imageFailed: boolean): string => {
  const normalizedImageSrc = (product.image ?? "").trim();
  const isKnownBrokenPlaceholder = normalizedImageSrc
    .toLowerCase()
    .includes("catalog-placeholder");
  const resolvedImageSrc =
    normalizedImageSrc.length > 0 && !isKnownBrokenPlaceholder
      ? normalizedImageSrc
      : PRODUCT_PLACEHOLDER_SRC;

  return imageFailed ? PRODUCT_PLACEHOLDER_SRC : resolvedImageSrc;
};

export function ConnectedProductCard({
  product,
  viewMode = "grid",
  prioritizeImage = false,
  gridImageSizes = DEFAULT_GRID_IMAGE_SIZES,
}: ConnectedProductCardProps) {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const cartItems = useCartStore((state) => state.cart);
  const addCartItem = useCartStore((state) => state.addToCart);
  const removeCartItem = useCartStore((state) => state.removeFromCart);
  const isCartProductPending = useCartStore((state) =>
    state.pendingProductIds.includes(product.id)
  );
  const wishlistItems = useWishlistStore((state) => state.wishlist);
  const toggleWishlistItem = useWishlistStore((state) => state.toggleWishlist);
  const isWishlistProductPending = useWishlistStore((state) =>
    state.pendingProductIds.includes(product.id)
  );
  const [isCartActionPending, setIsCartActionPending] = useState(false);
  const [isWishlistActionPending, setIsWishlistActionPending] = useState(false);
  const [optimisticInCart, setOptimisticInCart] = useState<boolean | null>(
    null
  );
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    setOptimisticInCart(null);
    setIsQuickOrderOpen(false);
  }, [product.id, product.image]);

  const isWishlistedUi = wishlistItems.some((item) => item.id === product.id);
  const actualIsInCartUi = cartItems.some(
    (item) => item.productId === product.id || item.id === product.id
  );
  const isInCartUi =
    optimisticInCart !== null && optimisticInCart !== actualIsInCartUi
      ? optimisticInCart
      : actualIsInCartUi;

  const handleAddToCart: ProductCardProps["onAddToCart"] = useCallback(
    async (event) => {
      event.preventDefault();

      if (isCartActionPending || isCartProductPending) {
        return;
      }

      const wasInCart = isInCartUi;
      setOptimisticInCart(!wasInCart);
      setIsCartActionPending(true);

      try {
        if (wasInCart) {
          await removeCartItem(product.id);
        } else {
          await addCartItem(product, 1);
        }

        setOptimisticInCart(null);
      } catch {
        setOptimisticInCart(wasInCart);
        toast.error("Не вдалося оновити кошик");
        return;
      } finally {
        setIsCartActionPending(false);
      }

      toast.success(
        wasInCart ? "Товар видалено з кошика" : "Товар додано до кошика!"
      );
    },
    [
      addCartItem,
      isCartActionPending,
      isCartProductPending,
      isInCartUi,
      product,
      removeCartItem,
    ]
  );

  const handleToggleWishlist: ProductCardProps["onToggleWishlist"] =
    useCallback(
      async (event) => {
        event.preventDefault();

        const wasWishlisted = isWishlistedUi;
        setIsWishlistActionPending(true);

        try {
          await toggleWishlistItem(product);

          if (isAuthenticated) {
            await queryClient.invalidateQueries({
              queryKey: WISHLIST_QUERY_KEY,
            });
          }
        } catch {
          toast.error("Не вдалося оновити список бажань");
          return;
        } finally {
          setIsWishlistActionPending(false);
        }

        toast.success(
          wasWishlisted ? "Видалено з обраного" : "Додано до обраного"
        );
      },
      [
        isAuthenticated,
        isWishlistedUi,
        product,
        queryClient,
        toggleWishlistItem,
      ]
    );

  const handleQuickOrder: ProductCardProps["onQuickOrder"] = useCallback(
    async (event) => {
      event.preventDefault();

      if (isAuthenticated) {
        try {
          await addCartItem(product, 1);
        } catch {
          toast.error("Не вдалося додати товар у кошик");
          return;
        }

        toast.success("Товар додано до кошика!");
        return;
      }

      setIsQuickOrderOpen(true);
    },
    [addCartItem, isAuthenticated, product]
  );

  const handleQuickOrderClose = useCallback(() => {
    setIsQuickOrderOpen(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageFailed(true);
  }, []);

  return (
    <ProductCard
      product={product}
      viewMode={viewMode}
      prioritizeImage={prioritizeImage}
      gridImageSizes={gridImageSizes}
      imageSrc={resolveImageSrc(product, imageFailed)}
      ratingValue={resolveRatingValue(product)}
      isWishlisted={isWishlistedUi}
      isInCart={isInCartUi}
      isWishlistDisabled={isWishlistActionPending || isWishlistProductPending}
      isCartDisabled={
        !product.inStock || isCartActionPending || isCartProductPending
      }
      isQuickOrderDisabled={!product.inStock}
      isQuickOrderOpen={isQuickOrderOpen}
      onToggleWishlist={handleToggleWishlist}
      onAddToCart={handleAddToCart}
      onQuickOrder={handleQuickOrder}
      onQuickOrderClose={handleQuickOrderClose}
      onImageError={handleImageError}
    />
  );
}
