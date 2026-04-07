"use client";

import { ChevronDown, X } from "lucide-react";
import { useState } from "react";

import styles from "@/components/catalog/Catalog.module.css";

interface CatalogFiltersProps {
  brands: string[];
  brandCounts: Record<string, number>;
  isDesktop: boolean;
  isOpen: boolean;
  selectedBrands: string[];
  onToggleBrand: (brand: string) => void;
  inStockOnly: boolean;
  onInStockChange: (value: boolean) => void;
  isNewOnly: boolean;
  onIsNewChange: (value: boolean) => void;
  isSaleOnly: boolean;
  onIsSaleChange: (value: boolean) => void;
  minPrice: string;
  maxPrice: string;
  minAvailablePrice: number | null;
  maxAvailablePrice: number | null;
  inStockCount: number;
  isNewCount: number;
  isSaleCount: number;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onClose: () => void;
  onReset: () => void;
}

export function CatalogFilters({
  brands,
  brandCounts,
  isDesktop,
  isOpen,
  selectedBrands,
  onToggleBrand,
  inStockOnly,
  onInStockChange,
  isNewOnly,
  onIsNewChange,
  isSaleOnly,
  onIsSaleChange,
  minPrice,
  maxPrice,
  minAvailablePrice,
  maxAvailablePrice,
  inStockCount,
  isNewCount,
  isSaleCount,
  onMinPriceChange,
  onMaxPriceChange,
  onClose,
  onReset,
}: CatalogFiltersProps) {
  const [opened, setOpened] = useState<string[]>([
    "price",
    "availability",
    "brand",
    "special",
  ]);

  const toggle = (key: string) => {
    setOpened((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  return (
    <>
      {!isDesktop && isOpen ? (
        <button
          type="button"
          className={styles.overlay}
          aria-label="Закрити фільтри"
          onClick={onClose}
        />
      ) : null}

      <aside
        id="catalog-filters"
        className={`${styles.sidebar} ${
          isOpen || isDesktop ? styles.sidebarOpen : ""
        }`}
        role={!isDesktop ? "dialog" : undefined}
        aria-modal={!isDesktop ? "true" : undefined}
        aria-label="Фільтри каталогу"
      >
        <div className={styles.sidebarHeader}>
          <h3>Фільтри</h3>
          {!isDesktop ? (
            <button
              type="button"
              className={styles.closeFiltersBtn}
              onClick={onClose}
              aria-label="Закрити фільтри"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>

        <div className={styles.filterAccordionList}>
          <section className={styles.filterSection}>
            <button
              type="button"
              className={styles.filterHeader}
              onClick={() => toggle("price")}
            >
              Ціна, грн
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${
                  opened.includes("price") ? styles.open : ""
                }`}
              />
            </button>
            {opened.includes("price") && (
              <div className={styles.filterBody}>
                <div className={styles.priceInputs}>
                  <input
                    className={styles.priceInput}
                    type="number"
                    min={0}
                    placeholder={
                      minAvailablePrice !== null
                        ? `Від ${Math.floor(minAvailablePrice)}`
                        : "Від"
                    }
                    value={minPrice}
                    onChange={(event) => onMinPriceChange(event.target.value)}
                  />
                  <input
                    className={styles.priceInput}
                    type="number"
                    min={0}
                    placeholder={
                      maxAvailablePrice !== null
                        ? `До ${Math.ceil(maxAvailablePrice)}`
                        : "До"
                    }
                    value={maxPrice}
                    onChange={(event) => onMaxPriceChange(event.target.value)}
                  />
                </div>
              </div>
            )}
          </section>

          <section className={styles.filterSection}>
            <button
              type="button"
              className={styles.filterHeader}
              onClick={() => toggle("availability")}
            >
              Наявність
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${
                  opened.includes("availability") ? styles.open : ""
                }`}
              />
            </button>
            {opened.includes("availability") && (
              <div className={styles.filterBody}>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(event) => onInStockChange(event.target.checked)}
                  />
                  <span className={styles.checkboxLabelText}>
                    Лише в наявності
                  </span>
                  <span className={styles.optionCount}>{inStockCount}</span>
                </label>
              </div>
            )}
          </section>

          <section className={styles.filterSection}>
            <button
              type="button"
              className={styles.filterHeader}
              onClick={() => toggle("brand")}
            >
              Бренд
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${
                  opened.includes("brand") ? styles.open : ""
                }`}
              />
            </button>
            {opened.includes("brand") && (
              <div className={styles.filterBody}>
                {brands.length > 0 ? (
                  brands.map((brand) => (
                    <label key={brand} className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => onToggleBrand(brand)}
                      />
                      <span className={styles.checkboxLabelText}>{brand}</span>
                      <span className={styles.optionCount}>
                        {brandCounts[brand] ?? 0}
                      </span>
                    </label>
                  ))
                ) : (
                  <span className={styles.emptyFilterText}>
                    Немає доступних брендів
                  </span>
                )}
              </div>
            )}
          </section>

          <section className={styles.filterSection}>
            <button
              type="button"
              className={styles.filterHeader}
              onClick={() => toggle("special")}
            >
              Спеціальні пропозиції
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${
                  opened.includes("special") ? styles.open : ""
                }`}
              />
            </button>
            {opened.includes("special") && (
              <div className={styles.filterBody}>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={isNewOnly}
                    onChange={(event) => onIsNewChange(event.target.checked)}
                  />
                  <span className={styles.checkboxLabelText}>Новинки</span>
                  <span className={styles.optionCount}>{isNewCount}</span>
                </label>
                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={isSaleOnly}
                    onChange={(event) => onIsSaleChange(event.target.checked)}
                  />
                  <span className={styles.checkboxLabelText}>Акції</span>
                  <span className={styles.optionCount}>{isSaleCount}</span>
                </label>
              </div>
            )}
          </section>
        </div>

        <div className={styles.sidebarFooter}>
          <button type="button" className={styles.clearBtn} onClick={onReset}>
            Очистити
          </button>
          {!isDesktop ? (
            <button type="button" className={styles.applyBtn} onClick={onClose}>
              Показати товари
            </button>
          ) : null}
        </div>
      </aside>
    </>
  );
}
