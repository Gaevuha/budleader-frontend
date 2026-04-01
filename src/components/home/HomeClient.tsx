"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bike,
  CreditCard,
  Droplets,
  DoorOpen,
  Hammer,
  HardHat,
  Headphones,
  LayoutGrid,
  Lightbulb,
  Monitor,
  ShieldCheck,
  Shirt,
  Snowflake,
  Sprout,
  Tent,
  Truck,
  Utensils,
  Bath,
  Baby,
  ChevronsDown,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Container } from "@/components/layout/Container/Container";
import { ProductCard } from "@/components/product/ProductCard/ProductCard";
import { getCategoryProductsCSR } from "@/services/apiClient";
import type { AppProduct } from "@/types/app";
import type { Category } from "@/types/category";
import type { CategorySubcategoryLink } from "@/types/category";
import type { FeatureItem } from "@/types/content";
import styles from "@/app/page.module.css";
import { Hero } from "../hero/Hero";

interface HomeClientProps {
  initialCategories: Category[];
  initialProducts: AppProduct[];
}

interface CategoryProductLink {
  id: string;
  name: string;
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

const featureIcons = [Truck, ShieldCheck, CreditCard, Headphones];

const fallbackFeatures: FeatureItem[] = [
  {
    id: "delivery",
    title: "Швидка доставка",
    desc: "Відправка по Україні у найкоротші терміни.",
  },
  {
    id: "quality",
    title: "Гарантія якості",
    desc: "Працюємо тільки з перевіреними брендами.",
  },
  {
    id: "payment",
    title: "Зручна оплата",
    desc: "Оплата онлайн або при отриманні.",
  },
  {
    id: "support",
    title: "Підтримка 7 днів",
    desc: "Допоможемо з вибором і консультацією.",
  },
];

const pickCategoryIcon = (name: string): LucideIcon => {
  const normalized = name.toLowerCase();

  for (const rule of categoryIconRules) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.icon;
    }
  }

  return LayoutGrid;
};

const pickIcon = <T,>(icons: T[], index: number): T =>
  icons[index % icons.length];

export function HomeClient({
  initialCategories,
  initialProducts,
}: HomeClientProps) {
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);
  const collapsedCategoryCount = 15;
  const [activeCategoryId, setActiveCategoryId] = useState<string>("");
  const [loadingCategoryId, setLoadingCategoryId] = useState<string | null>(
    null
  );
  const [loadedCategoryLinks, setLoadedCategoryLinks] = useState<
    Record<string, CategoryProductLink[]>
  >({});

  const categories = initialCategories;
  const products = initialProducts;
  const features = fallbackFeatures;

  const visibleCategories = isCatalogExpanded
    ? categories
    : categories.slice(0, collapsedCategoryCount);

  useEffect(() => {
    if (visibleCategories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(visibleCategories[0].id);
    }
  }, [activeCategoryId, visibleCategories]);

  const newProducts = useMemo(() => {
    const flagged = products.filter((p) => p.isNew).slice(0, 4);
    if (flagged.length > 0) {
      return flagged;
    }

    return [...products]
      .sort((a, b) => {
        const aTime = Date.parse((a as { createdAt?: string }).createdAt ?? "");
        const bTime = Date.parse((b as { createdAt?: string }).createdAt ?? "");

        return (
          (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
        );
      })
      .slice(0, 4);
  }, [products]);

  const saleProducts = useMemo(
    () => products.filter((p) => p.isSale || p.oldPrice).slice(0, 4),
    [products]
  );

  const popularProducts = useMemo(() => products.slice(0, 4), [products]);

  const fallbackSubmenuByCategory = useMemo(() => {
    const byCategoryId: Record<string, CategoryProductLink[]> = {};

    categories.forEach((category) => {
      const target = [category.id, category.slug, category.name]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase());

      const names = products
        .filter((product) => {
          const productCategory = [
            product.category,
            product.categoryName,
            (product as { category?: { name?: string } }).category?.name,
          ]
            .filter((value): value is string => Boolean(value))
            .map((value) => value.toLowerCase());

          return productCategory.some((value) => target.includes(value));
        })
        .map((product) => ({
          id: product.id,
          name: product.name,
        }))
        .filter(
          (item, index, arr) =>
            arr.findIndex((entry) => entry.id === item.id) === index
        )
        .slice(0, 18);

      byCategoryId[category.id] = names;
    });

    return byCategoryId;
  }, [categories, products]);

  useEffect(() => {
    const loadCategoryProducts = async () => {
      if (!isCatalogExpanded || !activeCategoryId) {
        return;
      }

      if (loadedCategoryLinks[activeCategoryId]) {
        return;
      }

      const activeCategory = categories.find(
        (category) => category.id === activeCategoryId
      );

      if (!activeCategory || activeCategory.subcategories?.length) {
        return;
      }

      setLoadingCategoryId(activeCategoryId);

      try {
        const categoryProducts = await getCategoryProductsCSR(
          activeCategory,
          18
        );
        const categoryLinks = categoryProducts
          .map((product) => ({
            id: product.id,
            name: product.name,
          }))
          .filter(
            (item, index, arr) =>
              arr.findIndex((entry) => entry.id === item.id) === index
          )
          .slice(0, 18);

        setLoadedCategoryLinks((prev) => ({
          ...prev,
          [activeCategoryId]:
            categoryLinks.length > 0
              ? categoryLinks
              : fallbackSubmenuByCategory[activeCategoryId] ?? [],
        }));
      } catch {
        setLoadedCategoryLinks((prev) => ({
          ...prev,
          [activeCategoryId]: fallbackSubmenuByCategory[activeCategoryId] ?? [],
        }));
      } finally {
        setLoadingCategoryId((current) =>
          current === activeCategoryId ? null : current
        );
      }
    };

    void loadCategoryProducts();
  }, [
    activeCategoryId,
    categories,
    fallbackSubmenuByCategory,
    isCatalogExpanded,
    loadedCategoryLinks,
  ]);

  return (
    <div className={styles.page}>
      <section className={styles.heroSection}>
        <Container>
          <div className={styles.heroGrid}>
            <div className={styles.catalogContainer}>
              <aside
                className={`${styles.catalogSidebar} ${
                  isCatalogExpanded ? styles.expanded : ""
                }`}
                onMouseEnter={() => setIsCatalogExpanded(true)}
                onMouseLeave={() => setIsCatalogExpanded(false)}
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
                      const fallbackLinks =
                        loadedCategoryLinks[category.id] ??
                        fallbackSubmenuByCategory[category.id] ??
                        [];
                      const hasSubcategories =
                        Array.isArray(category.subcategories) &&
                        category.subcategories.length > 0;

                      return (
                        <li key={category.id} className={styles.catalogItem}>
                          <Link
                            href={categoryHref}
                            className={styles.catalogLink}
                            onMouseEnter={() =>
                              setActiveCategoryId(category.id)
                            }
                          >
                            <Icon
                              size={20}
                              className={styles.catalogLinkIcon}
                              strokeWidth={1.5}
                            />
                            <span className={styles.catalogLinkText}>
                              {category.name}
                            </span>
                            <ChevronRight
                              size={16}
                              className={styles.catalogArrow}
                            />
                          </Link>

                          <div className={styles.submenu}>
                            {hasSubcategories ? (
                              category.subcategories!.map(
                                (group, groupIndex) => (
                                  <div
                                    key={`${group.name}-${groupIndex}`}
                                    className={styles.submenuGroup}
                                  >
                                    <h4>
                                      <Link href={categoryHref}>
                                        {group.name}
                                      </Link>
                                    </h4>
                                    <ul className={styles.submenuList}>
                                      {(group.links ?? []).map(
                                        (rawItem, itemIndex) => {
                                          const item =
                                            toSubcategoryItem(rawItem);
                                          const href = `/catalog?category=${encodeURIComponent(
                                            item.id ?? category.id
                                          )}`;

                                          return (
                                            <li
                                              key={`${item.label}-${itemIndex}`}
                                            >
                                              <Link href={href}>
                                                {item.label}
                                              </Link>
                                            </li>
                                          );
                                        }
                                      )}
                                    </ul>
                                  </div>
                                )
                              )
                            ) : (
                              <div className={styles.submenuGroup}>
                                <h4>
                                  <Link href={categoryHref}>
                                    {category.name}
                                  </Link>
                                </h4>
                                {loadingCategoryId === category.id ? (
                                  <ul className={styles.submenuList}>
                                    <li>Завантаження товарів...</li>
                                  </ul>
                                ) : fallbackLinks.length > 0 ? (
                                  <ul className={styles.submenuList}>
                                    {fallbackLinks.map((item) => (
                                      <li key={item.id}>
                                        <Link
                                          href={`/product/${encodeURIComponent(
                                            item.id
                                          )}`}
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

                  {!isCatalogExpanded &&
                  categories.length > collapsedCategoryCount ? (
                    <div className={styles.catalogMoreIndicator} aria-hidden>
                      <ChevronsDown size={16} />
                    </div>
                  ) : null}
                </div>
              </aside>
            </div>

            <div className={styles.heroBannerWrapper}>
              <Hero />
            </div>
          </div>
        </Container>
      </section>

      <section className={styles.features}>
        <Container>
          <div className={styles.featuresGrid}>
            {features.map((feature, idx) => {
              const Icon = pickIcon(featureIcons, idx);

              return (
                <div key={feature.id} className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <Icon size={28} />
                  </div>
                  <div className={styles.featureText}>
                    <h3 className={styles.featureTitle}>{feature.title}</h3>
                    <p className={styles.featureDesc}>{feature.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {newProducts.length > 0 && (
        <section className={styles.productsSection}>
          <Container>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Новинки</h2>
              <Link href="/catalog?isNew=true" className={styles.viewAll}>
                Всі новинки <ArrowRight size={16} />
              </Link>
            </div>
            <div className={styles.productGrid}>
              {newProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {saleProducts.length > 0 && (
        <section className={styles.productsSection}>
          <Container>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Акції</h2>
              <Link href="/catalog?isSale=true" className={styles.viewAll}>
                Всі акції <ArrowRight size={16} />
              </Link>
            </div>
            <div className={styles.productGrid}>
              {saleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {popularProducts.length > 0 && (
        <section className={styles.productsSection}>
          <Container>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Популярні товари</h2>
              <Link href="/catalog" className={styles.viewAll}>
                Дивитись всі <ArrowRight size={16} />
              </Link>
            </div>
            <div className={styles.productGrid}>
              {popularProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </div>
  );
}
