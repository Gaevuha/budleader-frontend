"use client";

import { ChevronDown, X } from "lucide-react";
import { useId, useState } from "react";

import styles from "@/components/catalog/Catalog.module.css";

interface CatalogFiltersProps {
  brands: string[];
  brandCounts: Record<string, number>;
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
  const filtersTitleId = useId();
  const pricePanelId = useId();
  const availabilityPanelId = useId();
  const brandPanelId = useId();
  const specialPanelId = useId();
  const minPriceInputId = useId();
  const maxPriceInputId = useId();
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
      {isOpen ? (
        <button
          type="button"
          className={styles.overlay}
          aria-label="Закрити фільтри"
          onClick={onClose}
        />
      ) : null}

      <aside
        id="catalog-filters"
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
        role={isOpen ? "dialog" : undefined}
        aria-modal={isOpen ? "true" : undefined}
        aria-labelledby={filtersTitleId}
      >
        <div className={styles.sidebarHeader}>
          <h3 id={filtersTitleId}>Фільтри</h3>
          <button
            type="button"
            className={styles.closeFiltersBtn}
            onClick={onClose}
            aria-label="Закрити фільтри"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.filterAccordionList}>
          <section className={styles.filterSection}>
            <button
              type="button"
              className={styles.filterHeader}
              onClick={() => toggle("price")}
              aria-expanded={opened.includes("price")}
              aria-controls={pricePanelId}
            >
              Ціна, грн
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${
                  opened.includes("price") ? styles.open : ""
                }`}
                aria-hidden="true"
              />
            </button>
            {opened.includes("price") && (
              <div id={pricePanelId} className={styles.filterBody}>
                <div className={styles.priceInputs}>
                  <label
                    htmlFor={minPriceInputId}
                    className={styles.visuallyHidden}
                  >
                    Мінімальна ціна
                  </label>
                  <input
                    id={minPriceInputId}
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
                  <label
                    htmlFor={maxPriceInputId}
                    className={styles.visuallyHidden}
                  >
                    Максимальна ціна
                  </label>
                  <input
                    id={maxPriceInputId}
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
              aria-expanded={opened.includes("availability")}
              aria-controls={availabilityPanelId}
            >
              Наявність
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${
                  opened.includes("availability") ? styles.open : ""
                }`}
                aria-hidden="true"
              />
            </button>
            {opened.includes("availability") && (
              <div id={availabilityPanelId} className={styles.filterBody}>
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
              aria-expanded={opened.includes("brand")}
              aria-controls={brandPanelId}
            >
              Бренд
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${
                  opened.includes("brand") ? styles.open : ""
                }`}
                aria-hidden="true"
              />
            </button>
            {opened.includes("brand") && (
              <div id={brandPanelId} className={styles.filterBody}>
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
              aria-expanded={opened.includes("special")}
              aria-controls={specialPanelId}
            >
              Спеціальні пропозиції
              <ChevronDown
                size={16}
                className={`${styles.chevron} ${
                  opened.includes("special") ? styles.open : ""
                }`}
                aria-hidden="true"
              />
            </button>
            {opened.includes("special") && (
              <div id={specialPanelId} className={styles.filterBody}>
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
          <button type="button" className={styles.applyBtn} onClick={onClose}>
            Показати товари
          </button>
        </div>
      </aside>
    </>
  );
}
