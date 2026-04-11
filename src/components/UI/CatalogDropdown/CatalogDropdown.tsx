"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { Category } from "@/types/category";
import type { CategorySubcategoryLink } from "@/types/category";
import styles from "./CatalogDropdown.module.css";

interface CatalogDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

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
  const resolvedActiveTab = activeTab || categories[0]?.id || "";

  const currentSubCats = useMemo(() => {
    return (
      categories.find((category) => category.id === resolvedActiveTab)
        ?.subcategories ?? []
    );
  }, [categories, resolvedActiveTab]);

  const subcategoriesWithLinks = useMemo(() => {
    return currentSubCats.filter(
      (group) => Array.isArray(group.links) && group.links.length > 0
    );
  }, [currentSubCats]);

  const activeCategory = useMemo(() => {
    return (
      categories.find((category) => category.id === resolvedActiveTab) ?? null
    );
  }, [categories, resolvedActiveTab]);

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
              resolvedActiveTab === cat.id ? styles.active : ""
            }`}
            onMouseEnter={() => setActiveTab(cat.id)}
          >
            <span className={styles.catName}>{cat.name}</span>
            {resolvedActiveTab === cat.id && (
              <ChevronRight size={16} className={styles.arrow} />
            )}
          </Link>
        ))}
      </div>

      <div className={styles.content}>
        {subcategoriesWithLinks.length > 0 ? (
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
          <div className={styles.group}>
            <h4 className={styles.groupTitle}>{activeCategory?.name}</h4>
            <p className={styles.emptyText}>
              Перейдіть у категорію, щоб переглянути всі товари.
            </p>
            {activeCategory ? (
              <Link
                href={`/catalog?category=${encodeURIComponent(
                  activeCategory.id
                )}`}
                onClick={onClose}
                className={styles.groupTitle}
              >
                Дивитися товари категорії
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
