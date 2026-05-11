import type { AppProduct } from "@/types/app";
import { PRODUCT_PLACEHOLDER_SRC } from "@/utils/media";

export type ProductCardViewMode = "grid" | "list";

export type ProductCardActionProduct = Pick<
  AppProduct,
  | "id"
  | "name"
  | "price"
  | "image"
  | "category"
  | "brand"
  | "inStock"
  | "oldPrice"
  | "stock"
  | "isNew"
  | "isSale"
>;

type RatingSource = AppProduct & {
  averageRating?: unknown;
  avgRating?: unknown;
  ratingAvg?: unknown;
  characteristics?: { rating?: unknown };
};

const KNOWN_BROKEN_IMAGE_TOKEN = "catalog-placeholder";

export const RATING_STAR_INDEXES = [0, 1, 2, 3, 4] as const;
export const DEFAULT_GRID_IMAGE_SIZES =
  "(min-width: 1440px) 331px, (min-width: 768px) calc((100vw - 66px) / 2), calc(100vw - 32px)";
export const LIST_IMAGE_SIZES =
  "(min-width: 1440px) 140px, (min-width: 768px) 140px, 220px";
export const PRODUCT_CARD_IMAGE_QUALITY = 52;
export const PRIORITY_PRODUCT_CARD_IMAGE_QUALITY = 58;
export const PRODUCT_CARD_BLUR_DATA_URL =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%23f1f5f9'/%3E%3Crect x='2' y='2' width='12' height='12' rx='2' fill='%23e2e8f0'/%3E%3C/svg%3E";

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

export const resolveRatingValue = (product: AppProduct): number => {
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

export const resolveImageSrc = (product: Pick<AppProduct, "image">): string => {
  const normalizedImageSrc = (product.image ?? "").trim();
  const isKnownBrokenPlaceholder = normalizedImageSrc
    .toLowerCase()
    .includes(KNOWN_BROKEN_IMAGE_TOKEN);

  return normalizedImageSrc.length > 0 && !isKnownBrokenPlaceholder
    ? normalizedImageSrc
    : PRODUCT_PLACEHOLDER_SRC;
};

export const createActionProduct = (
  product: AppProduct
): ProductCardActionProduct => ({
  id: product.id,
  name: product.name,
  price: product.price,
  image: product.image,
  category: product.category,
  brand: product.brand,
  inStock: product.inStock,
  oldPrice: product.oldPrice,
  stock: product.stock,
  isNew: product.isNew,
  isSale: product.isSale,
});
