"use client";

import dynamic from "next/dynamic";
import { memo, type MouseEventHandler, type ReactEventHandler } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Heart, Check, Star, Zap } from "lucide-react";
import type { AppProduct } from "@/types/app";
import styles from "./ProductCard.module.css";

const QuickOrderModal = dynamic(
  () =>
    import("@/components/UI/QuickOrderModal/QuickOrderModal").then(
      (module) => module.QuickOrderModal
    ),
  {
    ssr: false,
  }
);

const RATING_STAR_INDEXES = [0, 1, 2, 3, 4] as const;
export const DEFAULT_GRID_IMAGE_SIZES =
  "(min-width: 1440px) 331px, (min-width: 768px) calc((100vw - 66px) / 2), calc(100vw - 32px)";
const LIST_IMAGE_SIZES =
  "(min-width: 1440px) 140px, (min-width: 768px) 140px, 220px";
const PRODUCT_CARD_IMAGE_QUALITY = 52;
const PRIORITY_PRODUCT_CARD_IMAGE_QUALITY = 58;

export interface ProductCardProps {
  product: AppProduct;
  viewMode?: "grid" | "list";
  prioritizeImage?: boolean;
  gridImageSizes?: string;
  imageSrc: string;
  ratingValue: number;
  isWishlisted: boolean;
  isInCart: boolean;
  isWishlistDisabled: boolean;
  isCartDisabled: boolean;
  isQuickOrderDisabled: boolean;
  isQuickOrderOpen: boolean;
  onToggleWishlist: MouseEventHandler<HTMLButtonElement>;
  onAddToCart: MouseEventHandler<HTMLButtonElement>;
  onQuickOrder: MouseEventHandler<HTMLButtonElement>;
  onQuickOrderClose: () => void;
  onImageError: ReactEventHandler<HTMLImageElement>;
}

export const ProductCard = memo(function ProductCard({
  product,
  viewMode = "grid",
  prioritizeImage = false,
  gridImageSizes = DEFAULT_GRID_IMAGE_SIZES,
  imageSrc,
  ratingValue,
  isWishlisted,
  isInCart,
  isWishlistDisabled,
  isCartDisabled,
  isQuickOrderDisabled,
  isQuickOrderOpen,
  onToggleWishlist,
  onAddToCart,
  onQuickOrder,
  onQuickOrderClose,
  onImageError,
}: ProductCardProps) {
  const ratingFillPercent = `${(ratingValue / 5) * 100}%`;
  const hasStockCount = typeof product.stock === "number" && product.inStock;
  const productHref = `/product/${product.id}`;

  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

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
                  sizes={LIST_IMAGE_SIZES}
                  quality={
                    prioritizeImage
                      ? PRIORITY_PRODUCT_CARD_IMAGE_QUALITY
                      : PRODUCT_CARD_IMAGE_QUALITY
                  }
                  loading="lazy"
                  onError={onImageError}
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
                onClick={onQuickOrder}
                disabled={isQuickOrderDisabled}
                title="Швидке замовлення"
                aria-label="Швидке замовлення"
              >
                <Zap size={18} />
              </button>
              <button
                type="button"
                className={`${styles.listActionBtn} ${
                  isWishlisted ? styles.listActionActive : ""
                }`}
                onClick={onToggleWishlist}
                disabled={isWishlistDisabled}
                title="В обране"
                aria-label="Додати в обране"
                aria-pressed={isWishlisted}
              >
                <Heart
                  size={18}
                  fill={isWishlisted ? "currentColor" : "none"}
                />
              </button>
              <button
                type="button"
                className={`${styles.listActionBtn} ${
                  styles.listActionPrimary
                } ${isInCart ? styles.listActionActive : ""}`}
                onClick={onAddToCart}
                disabled={isCartDisabled}
                title="Кошик"
                aria-label="Додати в кошик"
                aria-pressed={isInCart}
              >
                <ShoppingCart
                  size={18}
                  fill={isInCart ? "currentColor" : "none"}
                />
              </button>
            </div>
          </div>
        </div>

        <QuickOrderModal
          isOpen={isQuickOrderOpen}
          onClose={onQuickOrderClose}
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
              sizes={gridImageSizes}
              quality={
                prioritizeImage
                  ? PRIORITY_PRODUCT_CARD_IMAGE_QUALITY
                  : PRODUCT_CARD_IMAGE_QUALITY
              }
              loading="lazy"
              onError={onImageError}
            />
          </Link>

          <button
            type="button"
            className={`${styles.wishlistBtn} ${
              isWishlisted ? styles.wishlistActive : ""
            }`}
            onClick={onToggleWishlist}
            disabled={isWishlistDisabled}
            title="В обране"
            aria-pressed={isWishlisted}
          >
            <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
          </button>

          <button
            type="button"
            className={styles.quickOrderBtn}
            onClick={onQuickOrder}
            disabled={isQuickOrderDisabled}
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
                isInCart ? styles.cartActive : ""
              }`}
              onClick={onAddToCart}
              disabled={isCartDisabled}
              title="Купити"
              aria-pressed={isInCart}
            >
              <ShoppingCart
                size={20}
                fill={isInCart ? "currentColor" : "none"}
              />
            </button>
          </div>
        </div>
      </div>

      <QuickOrderModal
        isOpen={isQuickOrderOpen}
        onClose={onQuickOrderClose}
        product={product}
      />
    </>
  );
});
