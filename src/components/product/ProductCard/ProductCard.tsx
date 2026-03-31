"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Heart, Check, Star } from "lucide-react";
import type { AppProduct } from "@/types/app";
import styles from "./ProductCard.module.css";
import { toast } from "sonner";
import { PRODUCT_PLACEHOLDER_SRC } from "@/utils/media";
import { useCartStore } from "@/store/cart/cartStore";
import { useWishlistStore } from "@/store/wishlist/wishlistStore";
import { toFiniteNumber } from "@/services/api";
import { useAuthStore } from "@/store/auth/authStore";
import {
  useAddToCartMutation,
  useCartQuery,
  useRemoveFromCartMutation,
} from "@/queries/cartQueries";
import {
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useWishlistQuery,
} from "@/queries/wishlistQueries";
import { QuickOrderModal } from "@/components/UI/QuickOrderModal/QuickOrderModal";

interface ProductCardProps {
  product: AppProduct;
  viewMode?: "grid" | "list";
}

export const ProductCard = ({
  product,
  viewMode = "grid",
}: ProductCardProps) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = Boolean(accessToken);
  const localCart = useCartStore((state) => state.cart);
  const addToCartLocal = useCartStore((state) => state.addToCart);
  const removeFromCartLocal = useCartStore((state) => state.removeFromCart);
  const wishlistLocal = useWishlistStore((state) => state.wishlist);
  const toggleWishlistLocal = useWishlistStore((state) => state.toggleWishlist);
  const addToCartMutation = useAddToCartMutation();
  const removeFromCartMutation = useRemoveFromCartMutation();
  const cartQuery = useCartQuery(isAuthenticated);
  const addToWishlistMutation = useAddToWishlistMutation();
  const removeFromWishlistMutation = useRemoveFromWishlistMutation();
  const wishlistQuery = useWishlistQuery(isAuthenticated);
  const [optimisticInCart, setOptimisticInCart] = useState<boolean | null>(
    null
  );
  const [optimisticWishlisted, setOptimisticWishlisted] = useState<
    boolean | null
  >(null);
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

  const serverWishlist = wishlistQuery.data?.items ?? [];
  const serverCartItems = cartQuery.data?.items ?? [];
  const effectiveWishlist = isAuthenticated ? serverWishlist : wishlistLocal;
  const isWishlisted = effectiveWishlist.some((item) => item.id === product.id);
  const isInCart = isAuthenticated
    ? serverCartItems.some(
        (item) => item.productId === product.id || item.id === product.id
      )
    : localCart.some((item) => item.id === product.id);
  const isWishlistedUi = optimisticWishlisted ?? isWishlisted;
  const isInCartUi = optimisticInCart ?? isInCart;
  const articleDigits = (product.id ?? "").replace(/\D/g, "");
  const articleCode =
    articleDigits.length > 0
      ? articleDigits.slice(0, 6)
      : (product.id ?? "").slice(0, 6);
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

  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  useEffect(() => {
    setOptimisticInCart(null);
  }, [isInCart]);

  useEffect(() => {
    setOptimisticWishlisted(null);
  }, [isWishlisted]);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();

    const wasInCart = isInCartUi;
    const cartEntry = serverCartItems.find(
      (item) => item.productId === product.id || item.id === product.id
    );
    const removeProductId = cartEntry?.productId ?? product.id;

    if (isAuthenticated) {
      setOptimisticInCart(!wasInCart);

      try {
        if (wasInCart) {
          await removeFromCartMutation.mutateAsync(removeProductId);
          removeFromCartLocal(product.id);
        } else {
          await addToCartMutation.mutateAsync({
            productId: product.id,
            quantity: 1,
          });
          addToCartLocal(product as AppProduct);
        }
      } catch {
        setOptimisticInCart(wasInCart);
        toast.error("Не вдалося оновити кошик");
        return;
      }
    } else {
      if (wasInCart) {
        removeFromCartLocal(product.id);
      } else {
        addToCartLocal(product as AppProduct);
      }
    }

    toast.success(
      wasInCart ? "Товар видалено з кошика" : "Товар додано до кошика!"
    );
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();

    const wasWishlisted = isWishlistedUi;

    if (isAuthenticated) {
      setOptimisticWishlisted(!wasWishlisted);

      try {
        if (wasWishlisted) {
          await removeFromWishlistMutation.mutateAsync(product.id);
        } else {
          await addToWishlistMutation.mutateAsync(product.id);
        }

        toggleWishlistLocal(product as AppProduct);
      } catch {
        setOptimisticWishlisted(wasWishlisted);
        toast.error("Не вдалося оновити список бажань");
        return;
      }
    } else {
      toggleWishlistLocal(product as AppProduct);
    }

    toast.success(wasWishlisted ? "Видалено з обраного" : "Додано до обраного");
  };

  const handleQuickOrder = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (isAuthenticated) {
      try {
        await addToCartMutation.mutateAsync({
          productId: product.id,
          quantity: 1,
        });
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
      <div className={styles.listCard}>
        <div className={styles.listMainInfo}>
          <div className={styles.listName}>
            <Link href={`/product/${product.id}`} className={styles.listTitle}>
              {product.name}
            </Link>
            <div className={styles.listBrand}>Бренд: {product.brand}</div>
            <div className={styles.listMeta}>Категорія: {product.category}</div>
            <div className={styles.listMeta}>Арт: {articleCode}</div>
            <div className={styles.listRatingWrap}>
              <div className={styles.ratingStars}>
                <div className={styles.ratingStarsBase}>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <Star key={`list-base-${index}`} size={12} />
                  ))}
                </div>
                <div
                  className={styles.ratingStarsFill}
                  style={{ width: ratingFillPercent }}
                >
                  {[0, 1, 2, 3, 4].map((index) => (
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
          <span className={styles.listPrice}>
            {product.price.toFixed(2)} грн
          </span>
          <span className={styles.listUnit}>шт</span>
          <button className={styles.listAddBtn} onClick={handleAddToCart}>
            Додати
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Link href={`/product/${product.id}`} className={styles.card}>
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

          <button
            className={`${styles.wishlistBtn} ${
              isWishlistedUi ? styles.wishlistActive : ""
            }`}
            onClick={handleToggleWishlist}
            title="В обране"
          >
            <Heart size={20} fill={isWishlistedUi ? "currentColor" : "none"} />
          </button>

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

          <button
            className={styles.quickOrderBtn}
            onClick={handleQuickOrder}
            disabled={!product.inStock}
            title="Швидке замовлення"
          >
            Швидке замовлення
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
            <span className={styles.sku}>Арт: {articleCode}</span>
          </div>

          <h3 className={styles.title}>{product.name}</h3>

          <div className={styles.ratingWrap}>
            <div className={styles.ratingStars}>
              <div className={styles.ratingStarsBase}>
                {[0, 1, 2, 3, 4].map((index) => (
                  <Star key={`base-${index}`} size={14} />
                ))}
              </div>
              <div
                className={styles.ratingStarsFill}
                style={{ width: ratingFillPercent }}
              >
                {[0, 1, 2, 3, 4].map((index) => (
                  <Star key={`fill-${index}`} size={14} fill="currentColor" />
                ))}
              </div>
            </div>
            <span className={styles.ratingText}>{ratingValue.toFixed(1)}</span>
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
              className={`${styles.cartBtn} ${
                isInCartUi ? styles.cartActive : ""
              }`}
              onClick={handleAddToCart}
              disabled={!product.inStock}
              title="Купити"
            >
              <ShoppingCart
                size={20}
                fill={isInCartUi ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>
      </Link>

      <QuickOrderModal
        isOpen={isQuickOrderOpen}
        onClose={() => setIsQuickOrderOpen(false)}
        product={product}
      />
    </>
  );
};
