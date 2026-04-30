"use client";

import { useId } from "react";
import { Grid as GridIcon, List as ListIcon } from "lucide-react";

import styles from "@/components/catalog/Catalog.module.css";

interface CatalogToolbarProps {
  title: string;
  productsCount: number;
  sortOrder: string;
  onSortOrderChange: (value: string) => void;
  showViewToggle: boolean;
  viewMode: "grid" | "list";
  onViewModeChange: (value: "grid" | "list") => void;
}

export function CatalogToolbar({
  title,
  productsCount,
  sortOrder,
  onSortOrderChange,
  showViewToggle,
  viewMode,
  onViewModeChange,
}: CatalogToolbarProps) {
  const sortSelectId = useId();

  return (
    <div className={styles.toolbarWrap}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>{title}</h1>
        <span className={styles.count}>{productsCount} товарів</span>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.sortBlock}>
          <label htmlFor={sortSelectId} className={styles.sortLabel}>
            Сортування
          </label>
          <select
            id={sortSelectId}
            className={styles.sortSelect}
            value={sortOrder}
            onChange={(event) => onSortOrderChange(event.target.value)}
          >
            <option value="default">за замовчуванням</option>
            <option value="rating-desc">за популярністю</option>
            <option value="name">за назвою</option>
            <option value="price-asc">від дешевих до дорогих</option>
            <option value="price-desc">від дорогих до дешевих</option>
          </select>
        </div>

        {showViewToggle ? (
          <div className={styles.viewToggle}>
            <button
              type="button"
              className={`${styles.viewBtn} ${
                viewMode === "grid" ? styles.viewBtnActive : ""
              }`}
              onClick={() => onViewModeChange("grid")}
              aria-label="Показати товари сіткою"
              aria-pressed={viewMode === "grid"}
            >
              <GridIcon size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${
                viewMode === "list" ? styles.viewBtnActive : ""
              }`}
              onClick={() => onViewModeChange("list")}
              aria-label="Показати товари списком"
              aria-pressed={viewMode === "list"}
            >
              <ListIcon size={18} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
