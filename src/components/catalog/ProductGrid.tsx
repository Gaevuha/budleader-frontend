"use client";

import { ConnectedProductCard } from "@/components/product/ProductCard/ConnectedProductCard";
import type { AppProduct } from "@/types/app";
import styles from "@/components/catalog/Catalog.module.css";
import homeStyles from "@/app/page.module.css";

const CATALOG_GRID_IMAGE_SIZES =
  "(min-width: 1440px) 237px, (min-width: 768px) calc((100vw - 68px) / 2), calc(100vw - 32px)";
const HOME_GRID_IMAGE_SIZES =
  "(min-width: 1440px) 331px, (min-width: 768px) calc((100vw - 66px) / 2), calc(100vw - 32px)";

interface ProductGridProps {
  products: AppProduct[];
  viewMode?: "grid" | "list";
  onResetFilters?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  variant?: "catalog" | "home";
}

export function ProductGrid({
  products,
  viewMode = "grid",
  onResetFilters,
  emptyTitle = "Товарів не знайдено",
  emptyDescription = "Спробуйте змінити критерії пошуку або очистити фільтри.",
  variant = "catalog",
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <h3>{emptyTitle}</h3>
        {emptyDescription ? <p>{emptyDescription}</p> : null}
        {onResetFilters ? (
          <button
            type="button"
            className={styles.resetBtn}
            onClick={onResetFilters}
          >
            Скинути фільтри
          </button>
        ) : null}
      </div>
    );
  }

  if (variant === "home") {
    return (
      <ul className={homeStyles.productGrid}>
        {products.map((product, index) => (
          <li key={product.id} className={homeStyles.productGridItem}>
            <ConnectedProductCard
              product={product}
              prioritizeImage={index === 0}
              gridImageSizes={HOME_GRID_IMAGE_SIZES}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={viewMode === "grid" ? styles.grid : styles.list}>
      {products.map((product, index) => (
        <li key={product.id} className={styles.productListItem}>
          <ConnectedProductCard
            product={product}
            viewMode={viewMode}
            prioritizeImage={index === 0}
            gridImageSizes={CATALOG_GRID_IMAGE_SIZES}
          />
        </li>
      ))}
    </ul>
  );
}
