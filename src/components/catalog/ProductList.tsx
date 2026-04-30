"use client";

import { ConnectedProductCard } from "@/components/product/ProductCard/ConnectedProductCard";
import type { AppProduct } from "@/types/app";
import styles from "@/components/catalog/Catalog.module.css";

interface ProductListProps {
  products: AppProduct[];
  viewMode: "grid" | "list";
  onResetFilters: () => void;
}

const renderProductListItem = (
  product: AppProduct,
  viewMode: ProductListProps["viewMode"],
  prioritizeImage: boolean
) => {
  return (
    <li key={product.id} className={styles.productListItem}>
      <ConnectedProductCard
        product={product}
        viewMode={viewMode}
        prioritizeImage={prioritizeImage}
      />
    </li>
  );
};

export function ProductList({
  products,
  viewMode,
  onResetFilters,
}: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <h3>Товарів не знайдено</h3>
        <p>Спробуйте змінити критерії пошуку або очистити фільтри.</p>
        <button
          type="button"
          className={styles.resetBtn}
          onClick={onResetFilters}
        >
          Скинути фільтри
        </button>
      </div>
    );
  }

  return (
    <ul className={viewMode === "grid" ? styles.grid : styles.list}>
      {products.map((product, index) =>
        renderProductListItem(product, viewMode, index === 0)
      )}
    </ul>
  );
}
