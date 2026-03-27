"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getCategoryProductsCSR } from "@/services/apiClient";
import type { Category } from "@/types/category";
import type { CategorySubcategoryLink } from "@/types/category";
import styles from "./CatalogDropdown.module.css";

interface CatalogDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

interface DropdownProduct {
  id: string;
  name: string;
  subgroupName: string;
  subgroupId: string | null;
}

const DROPDOWN_RATE_LIMIT_BACKOFF_MS = 20000;
let productsRateLimitedUntil = 0;

const toDropdownProduct = (
  product: {
    id?: string;
    name?: string;
    subcategory?: string;
    category?: string;
    categoryId?: string;
  },
  fallbackPrefix: string
): DropdownProduct | null => {
  if (!product.name) {
    return null;
  }

  return {
    id: product.id ?? `${fallbackPrefix}-${product.name}`,
    name: product.name,
    subgroupName: product.subcategory ?? product.category ?? "Товари",
    subgroupId: product.categoryId ?? null,
  };
};

const toSubcategoryItem = (
  item: string | CategorySubcategoryLink
): { label: string; id: string | null } => {
  if (typeof item === "string") {
    return {
      label: item,
      id: null,
    };
  }

  return {
    label: item.name ?? item.title ?? "Підкатегорія",
    id: item.id ?? item._id ?? null,
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
          .map((product) =>
            toDropdownProduct(
              product as {
                id?: string;
                name?: string;
                subcategory?: string;
                category?: string;
                categoryId?: string;
              },
              activeTab
            )
          )
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

  const subcategoriesWithLinks = useMemo(() => {
    return currentSubCats.filter(
      (group) => Array.isArray(group.links) && group.links.length > 0
    );
  }, [currentSubCats]);

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

  const groupedProducts = useMemo(() => {
    const groups = categoryProducts.reduce<Record<string, DropdownProduct[]>>(
      (acc, product) => {
        const key = product.subgroupName.trim() || "Товари";
        if (!acc[key]) {
          acc[key] = [];
        }

        // Keep a compact mega-menu list for each subgroup.
        if (acc[key].length < 12) {
          acc[key].push(product);
        }

        return acc;
      },
      {}
    );

    return Object.entries(groups).map(([name, items]) => ({
      name,
      subgroupId: items[0]?.subgroupId ?? null,
      items,
    }));
  }, [categoryProducts]);

  const groupedProductColumns = useMemo(() => {
    if (groupedProducts.length === 0) {
      return [[], [], []] as Array<
        Array<{
          name: string;
          subgroupId: string | null;
          items: DropdownProduct[];
        }>
      >;
    }

    const chunkSize = Math.ceil(groupedProducts.length / 3);
    return [0, 1, 2].map((index) =>
      groupedProducts.slice(index * chunkSize, (index + 1) * chunkSize)
    );
  }, [groupedProducts]);

  const hasGenericSubcategoriesGroup = useMemo(() => {
    return (
      subcategoriesWithLinks.length === 1 &&
      subcategoriesWithLinks[0].name.trim() === "Підкатегорії"
    );
  }, [subcategoriesWithLinks]);

  const shouldRenderGroupedProducts =
    groupedProducts.length > 0 &&
    (subcategoriesWithLinks.length === 0 || hasGenericSubcategoriesGroup);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.dropdownContainer} onMouseLeave={onClose}>
      <div className={styles.sidebar}>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/catalog?category=${encodeURIComponent(cat.id)}`}
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
        {shouldRenderGroupedProducts ? (
          <div className={styles.columns}>
            {groupedProductColumns.map((column, columnIndex) => (
              <div key={columnIndex} className={styles.column}>
                {column.map((group, groupIndex) => (
                  <div
                    key={`${group.name}-${groupIndex}`}
                    className={styles.group}
                  >
                    <h4 className={styles.groupTitle}>
                      <Link
                        href={
                          group.subgroupId
                            ? `/catalog?category=${encodeURIComponent(
                                group.subgroupId
                              )}`
                            : activeCategory
                            ? `/catalog?category=${encodeURIComponent(
                                activeCategory.id
                              )}`
                            : "/catalog"
                        }
                        onClick={onClose}
                      >
                        {group.name}
                      </Link>
                    </h4>
                    <ul className={styles.list}>
                      {group.items.map((product) => (
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
            ))}
          </div>
        ) : subcategoriesWithLinks.length > 0 ? (
          <div className={styles.columns}>
            {[0, 1, 2].map((columnIndex) => (
              <div key={columnIndex} className={styles.column}>
                {subcategoriesWithLinks
                  .slice(columnIndex * 3, columnIndex * 3 + 3)
                  .map((group, idx) => (
                    <div key={`${group.name}-${idx}`} className={styles.group}>
                      <h4 className={styles.groupTitle}>
                        <Link
                          href={
                            activeCategory
                              ? `/catalog?category=${encodeURIComponent(
                                  activeCategory.id
                                )}`
                              : "/catalog"
                          }
                          onClick={onClose}
                        >
                          {group.name}
                        </Link>
                      </h4>
                      <ul className={styles.list}>
                        {(group.links ?? []).map((rawItem, itemIndex) => {
                          const item = toSubcategoryItem(rawItem);
                          const categoryParam = item.id ?? activeCategory?.id;

                          return (
                            <li key={`${item.label}-${itemIndex}`}>
                              <Link
                                href={
                                  categoryParam
                                    ? `/catalog?category=${encodeURIComponent(
                                        categoryParam
                                      )}`
                                    : "/catalog"
                                }
                                onClick={onClose}
                              >
                                {item.label}
                              </Link>
                            </li>
                          );
                        })}
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
