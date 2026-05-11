import Link from "next/link";
import { ProductCardServer } from "@/components/product/ProductCard/ProductCardServer";
import type { AppProduct } from "@/types/app";
import styles from "@/components/catalog/Catalog.module.css";
import homeStyles from "@/app/page.module.css";

const ABOVE_THE_FOLD_PRODUCT_COUNT = 2;

const CATALOG_GRID_IMAGE_SIZES =
  "(min-width: 1440px) 237px, (min-width: 768px) calc((100vw - 68px) / 2), calc(100vw - 32px)";
const HOME_GRID_IMAGE_SIZES =
  "(min-width: 1440px) 331px, (min-width: 768px) calc((100vw - 66px) / 2), calc(100vw - 32px)";

interface ProductGridProps {
  products: AppProduct[];
  viewMode?: "grid" | "list";
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
  variant?: "catalog" | "home";
}

export function ProductGrid({
  products,
  viewMode = "grid",
  emptyTitle = "Товарів не знайдено",
  emptyDescription = "Спробуйте змінити критерії пошуку або очистити фільтри.",
  emptyActionHref,
  emptyActionLabel = "Скинути фільтри",
  variant = "catalog",
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <h3>{emptyTitle}</h3>
        {emptyDescription ? <p>{emptyDescription}</p> : null}
        {emptyActionHref ? (
          <Link href={emptyActionHref} className={styles.resetBtn}>
            {emptyActionLabel}
          </Link>
        ) : null}
      </div>
    );
  }

  if (variant === "home") {
    return (
      <ul className={homeStyles.productGrid}>
        {products.map((product, index) => (
          <li key={product.id} className={homeStyles.productGridItem}>
            <ProductCardServer
              product={product}
              prioritizeImage={index < ABOVE_THE_FOLD_PRODUCT_COUNT}
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
          <ProductCardServer
            product={product}
            viewMode={viewMode}
            prioritizeImage={index < ABOVE_THE_FOLD_PRODUCT_COUNT}
            gridImageSizes={CATALOG_GRID_IMAGE_SIZES}
          />
        </li>
      ))}
    </ul>
  );
}
