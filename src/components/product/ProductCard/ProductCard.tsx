"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingCart, Heart, Check, Star, Zap } from "lucide-react";
import type { AppProduct } from "@/types/app";
import styles from "./ProductCard.module.css";
import { toast } from "@/components/UI/notifications/toast";
import { PRODUCT_PLACEHOLDER_SRC } from "@/utils/media";
import { useCartStore } from "@/store/cart/cartStore";
import { useWishlistStore } from "@/store/wishlist/wishlistStore";
import { toFiniteNumber } from "@/services/api";
import { useAuthStore } from "@/store/auth/authStore";
import { CART_QUERY_KEY } from "@/queries/cartQueries";
import { WISHLIST_QUERY_KEY } from "@/queries/wishlistQueries";
import { QuickOrderModal } from "@/components/UI/QuickOrderModal/QuickOrderModal";

const RATING_STAR_INDEXES = [0, 1, 2, 3, 4] as const;

interface ProductCardProps {
  product: AppProduct;
  viewMode?: "grid" | "list";
}

export const ProductCard = ({
  product,
  viewMode = "grid",
}: ProductCardProps) => {
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
  const wishlistIsSyncing = useWishlistStore((state) => state.isSyncing);
  const [isCartActionPending, setIsCartActionPending] = useState(false);
  const [isWishlistActionPending, setIsWishlistActionPending] = useState(false);
  const [optimisticInCart, setOptimisticInCart] = useState<boolean | null>(
    null
  );
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
  const [failedImageSrcMap, setFailedImageSrcMap] = useState<
    Record<string, true>
  >({});
  const normalizedImageSrc = (product.image ?? "").trim();
  const isKnownBrokenPlaceholder = normalizedImageSrc
    .toLowerCase()
    .includes("catalog-placeholder");
  const resolvedImageSrc =
    normalizedImageSrc.length > 0 && !isKnownBrokenPlaceholder
      ? normalizedImageSrc
      : PRODUCT_PLACEHOLDER_SRC;
  const imageSrc = failedImageSrcMap[resolvedImageSrc]
    ? PRODUCT_PLACEHOLDER_SRC
    : resolvedImageSrc;

  const isWishlistedUi = wishlistItems.some((item) => item.id === product.id);
  const actualIsInCartUi = cartItems.some(
    (item) => item.productId === product.id || item.id === product.id
  );
  const isInCartUi =
    optimisticInCart !== null && optimisticInCart !== actualIsInCartUi
      ? optimisticInCart
      : actualIsInCartUi;
  const ratingSource = product as AppProduct & {
    averageRating?: unknown;
    avgRating?: unknown;
    ratingAvg?: unknown;
    characteristics?: { rating?: unknown };
  };
  const rawRating =
    toFiniteNumber(ratingSource.rating) ??
    toFiniteNumber(ratingSource.averageRating) ??
    toFiniteNumber(ratingSource.avgRating) ??
    toFiniteNumber(ratingSource.ratingAvg) ??
    toFiniteNumber(ratingSource.characteristics?.rating) ??
    0;
  const ratingValue = Math.max(0, Math.min(5, rawRating));
  const ratingFillPercent = `${(ratingValue / 5) * 100}%`;
  const hasStockCount = typeof product.stock === "number" && product.inStock;
  const productHref = `/product/${product.id}`;

  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

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
        await addCartItem(product as AppProduct, 1);
      }

      if (isAuthenticated) {
        await queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
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
  };

  const handleToggleWishlist = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    const wasWishlisted = isWishlistedUi;
    setIsWishlistActionPending(true);

    try {
      await toggleWishlistItem(product as AppProduct);

      if (isAuthenticated) {
        await queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
      }
    } catch {
      toast.error("Не вдалося оновити список бажань");
      return;
    } finally {
      setIsWishlistActionPending(false);
    }

    toast.success(wasWishlisted ? "Видалено з обраного" : "Додано до обраного");
  };

  const handleQuickOrder = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (isAuthenticated) {
      try {
        await addCartItem(product as AppProduct, 1);
        await queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      } catch {
        toast.error("Не вдалося додати товар у кошик");
        return;
      }

      toast.success("Товар додано до кошика!");
      return;
    }

    setIsQuickOrderOpen(true);
  };

  if (viewMode === "list") {
    return (
      <>
        <div className={styles.listCard}>
          <div className={styles.listMainInfo}>
            <div className={styles.listMedia}>
              <div className={styles.listBadges}>
                {discount > 0 && (
                  <span className={styles.badgeDiscount}>-{discount}%</span>
                )}
                {product.isNew && (
                  <span className={styles.badgeNew}>Новинка</span>
                )}
                {product.isSale && !discount && (
                  <span className={styles.badgeSale}>Хіт продажів</span>
                )}
              </div>

              <Link
                href={productHref}
                className={styles.listImageLink}
                aria-label={`Перейти до товару ${product.name}`}
              >
                <Image
                  src={imageSrc}
                  alt={product.name}
                  className={styles.listImage}
                  fill
                  sizes="(max-width: 767px) 50vw, 140px"
                  unoptimized
                  onError={() => {
                    setFailedImageSrcMap((prev) => {
                      if (prev[resolvedImageSrc]) {
                        return prev;
                      }

                      return {
                        ...prev,
                        [resolvedImageSrc]: true,
                      };
                    });
                  }}
                />
              </Link>
            </div>

            <div className={styles.listName}>
              <Link href={productHref} className={styles.listTitle}>
                {product.name}
              </Link>
              <div className={styles.listBrand}>Бренд: {product.brand}</div>
              <div className={styles.listMeta}>
                Категорія: {product.category}
              </div>
              <div className={styles.listRatingWrap}>
                <div className={styles.ratingStars}>
                  <div className={styles.ratingStarsBase}>
                    {RATING_STAR_INDEXES.map((index) => (
                      <Star key={`list-base-${index}`} size={12} />
                    ))}
                  </div>
                  <div
                    className={styles.ratingStarsFill}
                    style={{ width: ratingFillPercent }}
                  >
                    {RATING_STAR_INDEXES.map((index) => (
                      <Star
                        key={`list-fill-${index}`}
                        size={12}
                        fill="currentColor"
                      />
                    ))}
                  </div>
                </div>
                <span className={styles.ratingText}>
                  {ratingValue.toFixed(1)}
                </span>
              </div>
              {hasStockCount && (
                <div className={styles.listMeta}>
                  В наявності: {product.stock} шт
                </div>
              )}
            </div>
          </div>

          <div className={styles.listPriceSection}>
            <div className={styles.listPriceBlock}>
              {product.oldPrice && (
                <span className={styles.listOldPrice}>
                  {product.oldPrice.toLocaleString()} ₴
                </span>
              )}
              <span
                className={`${styles.listPrice} ${
                  discount > 0 ? styles.priceRed : ""
                }`}
              >
                {product.price.toLocaleString()} ₴
              </span>
            </div>

            <div className={styles.listActionGroup}>
              <button
                type="button"
                className={styles.listActionBtn}
                onClick={handleQuickOrder}
                disabled={!product.inStock}
                title="Швидке замовлення"
                aria-label="Швидке замовлення"
              >
                <Zap size={18} />
              </button>
              <button
                type="button"
                className={`${styles.listActionBtn} ${
                  isWishlistedUi ? styles.listActionActive : ""
                }`}
                onClick={handleToggleWishlist}
                disabled={isWishlistActionPending || wishlistIsSyncing}
                title="В обране"
                aria-label="Додати в обране"
                aria-pressed={isWishlistedUi}
              >
                <Heart
                  size={18}
                  fill={isWishlistedUi ? "currentColor" : "none"}
                />
              </button>
              <button
                type="button"
                className={`${styles.listActionBtn} ${
                  styles.listActionPrimary
                } ${isInCartUi ? styles.listActionActive : ""}`}
                onClick={handleAddToCart}
                disabled={!product.inStock}
                title="Кошик"
                aria-label="Додати в кошик"
                aria-pressed={isInCartUi}
              >
                <ShoppingCart
                  size={18}
                  fill={isInCartUi ? "currentColor" : "none"}
                />
              </button>
            </div>
          </div>
        </div>

        <QuickOrderModal
          isOpen={isQuickOrderOpen}
          onClose={() => setIsQuickOrderOpen(false)}
          product={product}
        />
      </>
    );
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.imageContainer}>
          <div className={styles.badges}>
            {discount > 0 && (
              <span className={styles.badgeDiscount}>-{discount}%</span>
            )}
            {product.isNew && <span className={styles.badgeNew}>Новинка</span>}
            {product.isSale && !discount && (
              <span className={styles.badgeSale}>Хіт продажів</span>
            )}
          </div>

          <Link
            href={productHref}
            className={styles.imageLink}
            aria-label={`Перейти до товару ${product.name}`}
          >
            <Image
              src={imageSrc}
              alt={product.name}
              className={styles.image}
              fill
              sizes="(max-width: 768px) 100vw, 25vw"
              unoptimized
              onError={() => {
                setFailedImageSrcMap((prev) => {
                  if (prev[resolvedImageSrc]) {
                    return prev;
                  }

                  return {
                    ...prev,
                    [resolvedImageSrc]: true,
                  };
                });
              }}
            />
          </Link>

          <button
            type="button"
            className={`${styles.wishlistBtn} ${
              isWishlistedUi ? styles.wishlistActive : ""
            }`}
            onClick={handleToggleWishlist}
            disabled={isWishlistActionPending || wishlistIsSyncing}
            title="В обране"
            aria-pressed={isWishlistedUi}
          >
            <Heart size={20} fill={isWishlistedUi ? "currentColor" : "none"} />
          </button>

          <button
            type="button"
            className={styles.quickOrderBtn}
            onClick={handleQuickOrder}
            disabled={!product.inStock}
            title="Швидке замовлення"
          >
            <Zap className={styles.buttonIcon} />
            <span>Швидке замовлення</span>
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.stockStatus}>
            {product.inStock ? (
              <span className={styles.inStock}>
                <Check size={14} /> В наявності
              </span>
            ) : (
              <span className={styles.outOfStock}>Очікується</span>
            )}
          </div>

          <Link href={productHref} className={styles.contentLink}>
            <h3 className={styles.title}>{product.name}</h3>

            <div className={styles.ratingWrap}>
              <div className={styles.ratingStars}>
                <div className={styles.ratingStarsBase}>
                  {RATING_STAR_INDEXES.map((index) => (
                    <Star key={`base-${index}`} size={14} />
                  ))}
                </div>
                <div
                  className={styles.ratingStarsFill}
                  style={{ width: ratingFillPercent }}
                >
                  {RATING_STAR_INDEXES.map((index) => (
                    <Star key={`fill-${index}`} size={14} fill="currentColor" />
                  ))}
                </div>
              </div>
              <span className={styles.ratingText}>
                {ratingValue.toFixed(1)}
              </span>
            </div>

            <div className={styles.metaGrid}>
              <span className={styles.metaItem}>
                Категорія: {product.category}
              </span>
              <span className={styles.metaItem}>Бренд: {product.brand}</span>
              {hasStockCount && (
                <span className={styles.metaItem}>
                  В наявності: {product.stock} шт
                </span>
              )}
            </div>
          </Link>

          <div className={styles.footer}>
            <div className={styles.prices}>
              {product.oldPrice && (
                <span className={styles.oldPrice}>
                  {product.oldPrice.toLocaleString()} ₴
                </span>
              )}
              <span
                className={`${styles.price} ${
                  discount > 0 ? styles.priceRed : ""
                }`}
              >
                {product.price.toLocaleString()} ₴
              </span>
            </div>

            <button
              type="button"
              className={`${styles.cartBtn} ${
                isInCartUi ? styles.cartActive : ""
              }`}
              onClick={handleAddToCart}
              disabled={!product.inStock}
              title="Купити"
              aria-pressed={isInCartUi}
            >
              <ShoppingCart
                size={20}
                fill={isInCartUi ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>
      </div>

      <QuickOrderModal
        isOpen={isQuickOrderOpen}
        onClose={() => setIsQuickOrderOpen(false)}
        product={product}
      />
    </>
  );
};
