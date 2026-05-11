"use client";

import Link from "next/link";
import {
  Bath,
  Bike,
  ChevronsDown,
  ChevronRight,
  DoorOpen,
  Droplets,
  Hammer,
  HardHat,
  Baby,
  LayoutGrid,
  Lightbulb,
  Monitor,
  Shirt,
  Snowflake,
  Sprout,
  Tent,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Category, CategorySubcategoryLink } from "@/types/category";
import styles from "@/app/page.module.css";

interface CategoriesListProps {
  categories: Category[];
  fallbackSubmenuByCategory: Record<
    string,
    Array<{ id: string; name: string }>
  >;
  isExpanded: boolean;
}

const COLLAPSED_CATEGORY_COUNT = 14;

const categoryIconRules: Array<{ icon: LucideIcon; keywords: string[] }> = [
  { icon: Droplets, keywords: ["водопост", "опален", "каналіз", "сантех"] },
  { icon: Bath, keywords: ["ванн"] },
  { icon: Monitor, keywords: ["побут", "технік", "електро"] },
  { icon: Utensils, keywords: ["посуд", "кухн"] },
  { icon: Sprout, keywords: ["сад", "город", "рослин", "насін"] },
  { icon: Hammer, keywords: ["інструмент", "витрат", "ремонт"] },
  { icon: Bike, keywords: ["вело"] },
  { icon: DoorOpen, keywords: ["двер", "фурнітур"] },
  { icon: HardHat, keywords: ["будів"] },
  { icon: Lightbulb, keywords: ["світл", "ламп"] },
  { icon: Snowflake, keywords: ["зим", "новоріч"] },
  { icon: Shirt, keywords: ["текстил", "одяг", "взут"] },
  { icon: Tent, keywords: ["відпоч", "туризм", "кемп"] },
  { icon: Baby, keywords: ["діт", "дит"] },
];

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

const pickCategoryIcon = (name: string): LucideIcon => {
  const normalized = name.toLowerCase();

  for (const rule of categoryIconRules) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.icon;
    }
  }

  return LayoutGrid;
};

export function CategoriesList({
  categories,
  fallbackSubmenuByCategory,
  isExpanded,
}: CategoriesListProps) {
  const visibleCategories = isExpanded
    ? categories
    : categories.slice(0, COLLAPSED_CATEGORY_COUNT);

  return (
    <aside
      className={`${styles.catalogSidebar} ${
        isExpanded ? styles.expanded : ""
      }`}
    >
      <div className={styles.catalogHeader}>
        <LayoutGrid size={20} />
        <span>Каталог товарів</span>
      </div>
      <div className={styles.catalogListWrapper}>
        <ul className={styles.catalogList}>
          {visibleCategories.map((category) => {
            const Icon = pickCategoryIcon(category.name);
            const categoryHref = `/catalog?category=${encodeURIComponent(
              category.id
            )}`;
            const fallbackLinks = fallbackSubmenuByCategory[category.id] ?? [];
            const hasSubcategories =
              Array.isArray(category.subcategories) &&
              category.subcategories.length > 0;

            return (
              <li key={category.id} className={styles.catalogItem}>
                <Link href={categoryHref} className={styles.catalogLink}>
                  <Icon
                    size={20}
                    className={styles.catalogLinkIcon}
                    strokeWidth={1.5}
                  />
                  <span className={styles.catalogLinkText}>
                    {category.name}
                  </span>
                  <ChevronRight size={16} className={styles.catalogArrow} />
                </Link>

                <div className={styles.submenu}>
                  {hasSubcategories ? (
                    category.subcategories!.map((group, groupIndex) => (
                      <div
                        key={`${group.name}-${groupIndex}`}
                        className={styles.submenuGroup}
                      >
                        <h4>
                          <Link href={categoryHref}>{group.name}</Link>
                        </h4>
                        <ul className={styles.submenuList}>
                          {(group.links ?? []).map((rawItem, itemIndex) => {
                            const item = toSubcategoryItem(rawItem);
                            const href = `/catalog?category=${encodeURIComponent(
                              item.id ?? category.id
                            )}`;

                            return (
                              <li key={`${item.label}-${itemIndex}`}>
                                <Link href={href}>{item.label}</Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <div className={styles.submenuGroup}>
                      <h4>
                        <Link href={categoryHref}>{category.name}</Link>
                      </h4>
                      {fallbackLinks.length > 0 ? (
                        <ul className={styles.submenuList}>
                          {fallbackLinks.map((item) => (
                            <li key={item.id}>
                              <Link
                                href={`/product/${encodeURIComponent(item.id)}`}
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <ul className={styles.submenuList}>
                          <li>
                            <Link href={categoryHref}>
                              Дивитися товари категорії
                            </Link>
                          </li>
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {!isExpanded && categories.length > COLLAPSED_CATEGORY_COUNT ? (
          <div className={styles.catalogMoreIndicator} aria-hidden>
            <ChevronsDown size={16} />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
