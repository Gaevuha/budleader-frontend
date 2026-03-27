"use client";

import { ProductCard } from "@/components/product/ProductCard/ProductCard";
import type { AppProduct } from "@/types/app";
import styles from "@/components/catalog/Catalog.module.css";

interface ProductListProps {
  products: AppProduct[];
  viewMode: "grid" | "list";
  onResetFilters: () => void;
}

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
        <button className={styles.resetBtn} onClick={onResetFilters}>
          Скинути фільтри
        </button>
      </div>
    );
  }

  return (
    <div className={viewMode === "grid" ? styles.grid : styles.list}>
      {products.map((product) => (
        <div key={product.id}>
          <ProductCard product={product} viewMode={viewMode} />
        </div>
      ))}
    </div>
  );
}
