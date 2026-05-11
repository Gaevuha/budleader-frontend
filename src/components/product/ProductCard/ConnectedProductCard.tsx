"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";

import type { AppProduct } from "@/types/app";
import { PRODUCT_PLACEHOLDER_SRC } from "@/utils/media";

import {
  DEFAULT_GRID_IMAGE_SIZES,
  createActionProduct,
  resolveRatingValue,
} from "./productCardShared";
import { AddToCartButtonClient } from "./AddToCartButtonClient";
import { ProductCardMarkup } from "./ProductCardMarkup";
import { QuickOrderButtonClient } from "./QuickOrderButtonClient";
import { WishlistButtonClient } from "./WishlistButtonClient";

interface ConnectedProductCardProps {
  product: AppProduct;
  viewMode?: "grid" | "list";
  prioritizeImage?: boolean;
  gridImageSizes?: string;
}

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

function ConnectedProductCardComponent({
  product,
  viewMode = "grid",
  prioritizeImage = false,
  gridImageSizes = DEFAULT_GRID_IMAGE_SIZES,
}: ConnectedProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const actionProduct = useMemo(() => createActionProduct(product), [product]);
  const imageSrc = useMemo(
    () => resolveImageSrc(product, imageFailed),
    [imageFailed, product]
  );
  const ratingValue = useMemo(() => resolveRatingValue(product), [product]);

  const mediaActions = useMemo(
    () =>
      viewMode === "grid" ? (
        <>
          <WishlistButtonClient product={actionProduct} variant="grid" />
          <QuickOrderButtonClient product={actionProduct} variant="grid" />
        </>
      ) : undefined,
    [actionProduct, viewMode]
  );

  const footerActions = useMemo(
    () =>
      viewMode === "grid" ? (
        <AddToCartButtonClient product={actionProduct} variant="grid" />
      ) : undefined,
    [actionProduct, viewMode]
  );

  const listActions = useMemo(
    () =>
      viewMode === "list" ? (
        <>
          <QuickOrderButtonClient product={actionProduct} variant="list" />
          <WishlistButtonClient product={actionProduct} variant="list" />
          <AddToCartButtonClient product={actionProduct} variant="list" />
        </>
      ) : undefined,
    [actionProduct, viewMode]
  );

  useEffect(() => {
    setImageFailed(false);
  }, [product.id, product.image]);

  const handleImageError = useCallback(() => {
    setImageFailed(true);
  }, []);

  return (
    <ProductCardMarkup
      product={product}
      viewMode={viewMode}
      prioritizeImage={prioritizeImage}
      gridImageSizes={gridImageSizes}
      imageSrc={imageSrc}
      ratingValue={ratingValue}
      mediaActions={mediaActions}
      footerActions={footerActions}
      listActions={listActions}
      onImageError={handleImageError}
    />
  );
}

export const ConnectedProductCard = memo(ConnectedProductCardComponent);
