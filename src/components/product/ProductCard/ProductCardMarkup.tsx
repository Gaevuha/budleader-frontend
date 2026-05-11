import { memo, type ReactEventHandler, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Star } from "lucide-react";

import type { AppProduct } from "@/types/app";

import styles from "./ProductCard.module.css";
import {
  DEFAULT_GRID_IMAGE_SIZES,
  LIST_IMAGE_SIZES,
  PRIORITY_PRODUCT_CARD_IMAGE_QUALITY,
  PRODUCT_CARD_BLUR_DATA_URL,
  PRODUCT_CARD_IMAGE_QUALITY,
  RATING_STAR_INDEXES,
  type ProductCardViewMode,
} from "./productCardShared";

interface ProductCardMarkupProps {
  product: AppProduct;
  viewMode?: ProductCardViewMode;
  prioritizeImage?: boolean;
  gridImageSizes?: string;
  imageSrc: string;
  ratingValue: number;
  mediaActions?: ReactNode;
  footerActions?: ReactNode;
  listActions?: ReactNode;
  onImageError?: ReactEventHandler<HTMLImageElement>;
}

function ProductCardMarkupComponent({
  product,
  viewMode = "grid",
  prioritizeImage = false,
  gridImageSizes = DEFAULT_GRID_IMAGE_SIZES,
  imageSrc,
  ratingValue,
  mediaActions,
  footerActions,
  listActions,
  onImageError,
}: ProductCardMarkupProps) {
  const ratingFillPercent = `${(ratingValue / 5) * 100}%`;
  const hasStockCount = typeof product.stock === "number" && product.inStock;
  const productHref = `/product/${product.id}`;
  const imageLoading = prioritizeImage ? "eager" : "lazy";
  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : 0;

  if (viewMode === "list") {
    return (
      <div className={styles.listCard}>
        <div className={styles.listMainInfo}>
          <div className={styles.listMedia}>
            <div className={styles.listBadges}>
              {discount > 0 ? (
                <span className={styles.badgeDiscount}>-{discount}%</span>
              ) : null}
              {product.isNew ? (
                <span className={styles.badgeNew}>Новинка</span>
              ) : null}
              {product.isSale && !discount ? (
                <span className={styles.badgeSale}>Хіт продажів</span>
              ) : null}
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
                priority={prioritizeImage}
                fetchPriority={prioritizeImage ? "high" : "auto"}
                placeholder="blur"
                blurDataURL={PRODUCT_CARD_BLUR_DATA_URL}
                sizes={LIST_IMAGE_SIZES}
                quality={
                  prioritizeImage
                    ? PRIORITY_PRODUCT_CARD_IMAGE_QUALITY
                    : PRODUCT_CARD_IMAGE_QUALITY
                }
                loading={prioritizeImage ? undefined : imageLoading}
                onError={onImageError}
              />
            </Link>
          </div>

          <div className={styles.listName}>
            <Link href={productHref} className={styles.listTitle}>
              {product.name}
            </Link>
            <div className={styles.listBrand}>Бренд: {product.brand}</div>
            <div className={styles.listMeta}>Категорія: {product.category}</div>
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
            {hasStockCount ? (
              <div className={styles.listMeta}>
                В наявності: {product.stock} шт
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.listPriceSection}>
          <div className={styles.listPriceBlock}>
            {product.oldPrice ? (
              <span className={styles.listOldPrice}>
                {product.oldPrice.toLocaleString()} ₴
              </span>
            ) : null}
            <span
              className={`${styles.listPrice} ${
                discount > 0 ? styles.priceRed : ""
              }`}
            >
              {product.price.toLocaleString()} ₴
            </span>
          </div>

          {listActions ? (
            <div className={styles.listActionGroup}>{listActions}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.imageContainer}>
        <div className={styles.badges}>
          {discount > 0 ? (
            <span className={styles.badgeDiscount}>-{discount}%</span>
          ) : null}
          {product.isNew ? (
            <span className={styles.badgeNew}>Новинка</span>
          ) : null}
          {product.isSale && !discount ? (
            <span className={styles.badgeSale}>Хіт продажів</span>
          ) : null}
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
            priority={prioritizeImage}
            fetchPriority={prioritizeImage ? "high" : "auto"}
            placeholder="blur"
            blurDataURL={PRODUCT_CARD_BLUR_DATA_URL}
            sizes={gridImageSizes}
            quality={
              prioritizeImage
                ? PRIORITY_PRODUCT_CARD_IMAGE_QUALITY
                : PRODUCT_CARD_IMAGE_QUALITY
            }
            loading={prioritizeImage ? undefined : imageLoading}
            onError={onImageError}
          />
        </Link>

        {mediaActions}
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
            <span className={styles.ratingText}>{ratingValue.toFixed(1)}</span>
          </div>

          <div className={styles.metaGrid}>
            <span className={styles.metaItem}>
              Категорія: {product.category}
            </span>
            <span className={styles.metaItem}>Бренд: {product.brand}</span>
            {hasStockCount ? (
              <span className={styles.metaItem}>
                В наявності: {product.stock} шт
              </span>
            ) : null}
          </div>
        </Link>

        <div className={styles.footer}>
          <div className={styles.prices}>
            {product.oldPrice ? (
              <span className={styles.oldPrice}>
                {product.oldPrice.toLocaleString()} ₴
              </span>
            ) : null}
            <span
              className={`${styles.price} ${
                discount > 0 ? styles.priceRed : ""
              }`}
            >
              {product.price.toLocaleString()} ₴
            </span>
          </div>

          {footerActions}
        </div>
      </div>
    </div>
  );
}

export const ProductCardMarkup = memo(ProductCardMarkupComponent);
