"use client";

import { Grid as GridIcon, List as ListIcon } from "lucide-react";

import styles from "@/components/catalog/Catalog.module.css";

interface CatalogToolbarProps {
  title: string;
  productsCount: number;
  sortOrder: string;
  onSortOrderChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (value: "grid" | "list") => void;
}

export function CatalogToolbar({
  title,
  productsCount,
  sortOrder,
  onSortOrderChange,
  viewMode,
  onViewModeChange,
}: CatalogToolbarProps) {
  return (
    <div className={styles.toolbarWrap}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>{title}</h1>
        <span className={styles.count}>{productsCount} товарів</span>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.sortBlock}>
          <label className={styles.sortLabel}>Сортування</label>
          <select
            className={styles.sortSelect}
            value={sortOrder}
            onChange={(event) => onSortOrderChange(event.target.value)}
          >
            <option value="default">за замовчуванням</option>
            <option value="name">за назвою</option>
            <option value="price-asc">від дешевих до дорогих</option>
            <option value="price-desc">від дорогих до дешевих</option>
          </select>
        </div>

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${
              viewMode === "grid" ? styles.viewBtnActive : ""
            }`}
            onClick={() => onViewModeChange("grid")}
          >
            <GridIcon size={18} />
          </button>
          <button
            className={`${styles.viewBtn} ${
              viewMode === "list" ? styles.viewBtnActive : ""
            }`}
            onClick={() => onViewModeChange("list")}
          >
            <ListIcon size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
