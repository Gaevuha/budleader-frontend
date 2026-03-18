"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getCategoryProductsCSR } from "@/services/apiClient";
import type { Category } from "@/types/category";
import styles from "./CatalogDropdown.module.css";

interface CatalogDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

interface DropdownProduct {
  id: string;
  name: string;
}

const DROPDOWN_RATE_LIMIT_BACKOFF_MS = 20000;
let productsRateLimitedUntil = 0;

const toDropdownProduct = (
  product: { id?: string; name?: string },
  fallbackPrefix: string
): DropdownProduct | null => {
  if (!product.name) {
    return null;
  }

  return {
    id: product.id ?? `${fallbackPrefix}-${product.name}`,
    name: product.name,
  };
};

export const CatalogDropdown = ({
  isOpen,
  onClose,
  categories,
}: CatalogDropdownProps) => {
  const [activeTab, setActiveTab] = useState<string>("");
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsByCategory, setProductsByCategory] = useState<
    Record<string, DropdownProduct[]>
  >({});

  useEffect(() => {
    if (categories.length > 0 && !activeTab) {
      setActiveTab(categories[0].id);
    }
  }, [categories, activeTab]);

  useEffect(() => {
    const loadCategoryProducts = async () => {
      if (!isOpen || !activeTab) {
        return;
      }

      if (productsByCategory[activeTab]) {
        return;
      }

      if (Date.now() < productsRateLimitedUntil) {
        return;
      }

      const activeCategory = categories.find(
        (category) => category.id === activeTab
      );
      if (!activeCategory) {
        return;
      }

      setIsProductsLoading(true);

      try {
        const products = (await getCategoryProductsCSR(activeCategory, 90))
          .map((product) => toDropdownProduct(product, activeTab))
          .filter((item): item is DropdownProduct => item !== null);

        setProductsByCategory((prev) => ({
          ...prev,
          [activeTab]: products,
        }));
      } catch (error: unknown) {
        if (
          (error as { response?: { status?: number } })?.response?.status ===
          429
        ) {
          productsRateLimitedUntil =
            Date.now() + DROPDOWN_RATE_LIMIT_BACKOFF_MS;
        }
      } finally {
        setIsProductsLoading(false);
      }
    };

    void loadCategoryProducts();
  }, [activeTab, categories, isOpen, productsByCategory]);

  const currentSubCats = useMemo(() => {
    return (
      categories.find((category) => category.id === activeTab)?.subcategories ??
      []
    );
  }, [categories, activeTab]);

  const activeCategory = useMemo(() => {
    return categories.find((category) => category.id === activeTab) ?? null;
  }, [categories, activeTab]);

  const categoryProducts = useMemo(() => {
    if (!activeCategory) {
      return [];
    }

    return productsByCategory[activeCategory.id] ?? [];
  }, [activeCategory, productsByCategory]);

  const productColumns = useMemo(() => {
    if (categoryProducts.length === 0) {
      return [[], [], []] as DropdownProduct[][];
    }

    const chunkSize = Math.ceil(categoryProducts.length / 3);
    return [0, 1, 2].map((index) =>
      categoryProducts.slice(index * chunkSize, (index + 1) * chunkSize)
    );
  }, [categoryProducts]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.dropdownContainer} onMouseLeave={onClose}>
      <div className={styles.sidebar}>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/catalog?category=${encodeURIComponent(
              cat.slug ?? cat.name
            )}`}
            onClick={onClose}
            className={`${styles.sidebarItem} ${
              activeTab === cat.id ? styles.active : ""
            }`}
            onMouseEnter={() => setActiveTab(cat.id)}
          >
            <span className={styles.catName}>{cat.name}</span>
            {activeTab === cat.id && (
              <ChevronRight size={16} className={styles.arrow} />
            )}
          </Link>
        ))}
      </div>

      <div className={styles.content}>
        {currentSubCats.length > 0 ? (
          <div className={styles.columns}>
            {[0, 1, 2].map((columnIndex) => (
              <div key={columnIndex} className={styles.column}>
                {currentSubCats
                  .slice(columnIndex * 3, columnIndex * 3 + 3)
                  .map((group, idx) => (
                    <div key={`${group.name}-${idx}`} className={styles.group}>
                      <h4 className={styles.groupTitle}>
                        <Link href="/catalog" onClick={onClose}>
                          {group.name}
                        </Link>
                      </h4>
                      <ul className={styles.list}>
                        {(group.links ?? []).map((item) => (
                          <li key={item}>
                            <Link href="/catalog" onClick={onClose}>
                              {item}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        ) : (
          <>
            <h4 className={styles.groupTitle}>{activeCategory?.name}</h4>
            {isProductsLoading ? (
              <p className={styles.emptyText}>Завантаження товарів...</p>
            ) : categoryProducts.length === 0 ? (
              <p className={styles.emptyText}>Немає товарів у цій категорії.</p>
            ) : (
              <div className={styles.columns}>
                {productColumns.map((column, idx) => (
                  <div key={idx} className={styles.column}>
                    <ul className={styles.list}>
                      {column.map((product) => (
                        <li key={product.id}>
                          <Link
                            href={`/product/${encodeURIComponent(product.id)}`}
                            onClick={onClose}
                          >
                            {product.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
