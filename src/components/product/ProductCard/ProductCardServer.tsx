import type { AppProduct } from "@/types/app";

import { AddToCartButtonClient } from "./AddToCartButtonClient";
import { ProductCardMarkup } from "./ProductCardMarkup";
import { QuickOrderButtonClient } from "./QuickOrderButtonClient";
import { WishlistButtonClient } from "./WishlistButtonClient";
import {
  DEFAULT_GRID_IMAGE_SIZES,
  createActionProduct,
  resolveImageSrc,
  resolveRatingValue,
  type ProductCardViewMode,
} from "./productCardShared";

interface ProductCardServerProps {
  product: AppProduct;
  viewMode?: ProductCardViewMode;
  prioritizeImage?: boolean;
  gridImageSizes?: string;
}

export function ProductCardServer({
  product,
  viewMode = "grid",
  prioritizeImage = false,
  gridImageSizes = DEFAULT_GRID_IMAGE_SIZES,
}: ProductCardServerProps) {
  const actionProduct = createActionProduct(product);

  return (
    <ProductCardMarkup
      product={product}
      viewMode={viewMode}
      prioritizeImage={prioritizeImage}
      gridImageSizes={gridImageSizes}
      imageSrc={resolveImageSrc(product)}
      ratingValue={resolveRatingValue(product)}
      mediaActions={
        viewMode === "grid" ? (
          <>
            <WishlistButtonClient product={actionProduct} variant="grid" />
            <QuickOrderButtonClient product={actionProduct} variant="grid" />
          </>
        ) : undefined
      }
      footerActions={
        viewMode === "grid" ? (
          <AddToCartButtonClient product={actionProduct} variant="grid" />
        ) : undefined
      }
      listActions={
        viewMode === "list" ? (
          <>
            <QuickOrderButtonClient product={actionProduct} variant="list" />
            <WishlistButtonClient product={actionProduct} variant="list" />
            <AddToCartButtonClient product={actionProduct} variant="list" />
          </>
        ) : undefined
      }
    />
  );
}
