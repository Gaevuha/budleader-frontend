"use client";

import { AnimatePresence, motion } from "framer-motion";

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
      <AnimatePresence>
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{
              duration: 0.18,
              delay: Math.min(index * 0.025, 0.25),
            }}
          >
            <ProductCard product={product} viewMode={viewMode} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
