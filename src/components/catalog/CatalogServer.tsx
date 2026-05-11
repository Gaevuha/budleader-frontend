import Link from "next/link";

import { Container } from "@/components/layout/Container/Container";
import type { AppProduct } from "@/types/app";
import type { Pagination } from "@/types/api";
import type { Category, CategorySubcategoryLink } from "@/types/category";

import styles from "./Catalog.module.css";
import { CatalogClient } from "./CatalogClient";
import { ProductGrid } from "./ProductGrid";

interface CatalogServerProps {
  categories: Category[];
  products: AppProduct[];
  brands: string[];
  brandCounts: Record<string, number>;
  priceBounds: {
    min: number | null;
    max: number | null;
  };
  filterCounts: {
    inStock: number;
    isNew: number;
    isSale: number;
  };
  pagination: Pagination | null;
  currentPage: number;
  selectedCategory?: string;
  selectedBrands?: string[];
  searchTerm?: string;
  sortOrder?: string;
  isNewOnly?: boolean;
  isSaleOnly?: boolean;
  minPrice?: string;
  maxPrice?: string;
  inStockOnly?: boolean;
}

const normalizeToken = (value: string): string =>
  decodeURIComponent(value).trim().toLowerCase();

const buildBreadcrumbSegments = ({
  categories,
  selectedCategory,
  searchTerm,
  isNewOnly,
  isSaleOnly,
}: {
  categories: Category[];
  selectedCategory: string;
  searchTerm: string;
  isNewOnly: boolean;
  isSaleOnly: boolean;
}): string[] => {
  if (!selectedCategory) {
    if (searchTerm.trim()) {
      return [`Пошук: ${searchTerm.trim()}`];
    }

    if (isNewOnly) {
      return ["Новинки"];
    }

    if (isSaleOnly) {
      return ["Акції"];
    }

    return ["Каталог"];
  }

  const token = normalizeToken(selectedCategory);
  const categoryById = categories.find(
    (category) => normalizeToken(category.id) === token
  );

  if (categoryById) {
    return [categoryById.name];
  }

  for (const category of categories) {
    for (const subgroup of category.subcategories ?? []) {
      for (const rawLink of subgroup.links ?? []) {
        const item =
          typeof rawLink === "string"
            ? { id: null, label: rawLink }
            : {
                id:
                  (rawLink as CategorySubcategoryLink).id ??
                  (rawLink as CategorySubcategoryLink)._id ??
                  null,
                label:
                  (rawLink as CategorySubcategoryLink).name ??
                  (rawLink as CategorySubcategoryLink).title ??
                  "Підкатегорія",
              };

        if (item.id && normalizeToken(item.id) === token) {
          const subgroupName = subgroup.name?.trim();
          const isGenericSubgroup = subgroupName === "Підкатегорії";

          return isGenericSubgroup
            ? [category.name, item.label]
            : [category.name, subgroup.name, item.label];
        }
      }
    }
  }

  for (const category of categories) {
    if (
      normalizeToken(category.name) === token ||
      normalizeToken(category.slug ?? "") === token
    ) {
      return [category.name];
    }

    for (const subgroup of category.subcategories ?? []) {
      for (const rawLink of subgroup.links ?? []) {
        const label =
          typeof rawLink === "string"
            ? rawLink
            : rawLink.name ?? rawLink.title ?? "";

        if (normalizeToken(label) === token) {
          const subgroupName = subgroup.name?.trim();
          const isGenericSubgroup = subgroupName === "Підкатегорії";

          return isGenericSubgroup
            ? [category.name, label]
            : [category.name, subgroup.name, label];
        }
      }
    }
  }

  return [selectedCategory];
};

export function CatalogServer({
  categories,
  products,
  brands,
  brandCounts,
  priceBounds,
  filterCounts,
  pagination,
  currentPage,
  selectedCategory = "",
  selectedBrands = [],
  searchTerm = "",
  sortOrder = "default",
  isNewOnly = false,
  isSaleOnly = false,
  minPrice = "",
  maxPrice = "",
  inStockOnly = false,
}: CatalogServerProps) {
  const breadcrumbSegments = buildBreadcrumbSegments({
    categories,
    selectedCategory,
    searchTerm,
    isNewOnly,
    isSaleOnly,
  });
  const pageTitle =
    breadcrumbSegments[breadcrumbSegments.length - 1] ?? "Каталог";
  const productsCount =
    typeof pagination?.total === "number" && pagination.total > 0
      ? pagination.total
      : products.length;

  return (
    <section className="brand-page-section" data-tone="compact">
      <Container className={styles.pageContent}>
        <nav className={styles.breadcrumbs} aria-label="breadcrumb">
          <Link href="/">Головна</Link>
          <span>/</span>
          {breadcrumbSegments.map((segment, index) => (
            <span key={`${segment}-${index}`}>
              <span
                className={
                  index === breadcrumbSegments.length - 1
                    ? styles.currentCrumb
                    : undefined
                }
              >
                {segment}
              </span>
              {index < breadcrumbSegments.length - 1 ? <span> / </span> : null}
            </span>
          ))}
        </nav>

        <section className={styles.catalogSection}>
          <div className={styles.container}>
            <CatalogClient
              initialProducts={products}
              brands={brands}
              brandCounts={brandCounts}
              priceBounds={priceBounds}
              filterCounts={filterCounts}
              pagination={pagination}
              currentPage={currentPage}
              pageTitle={pageTitle}
              productsCount={productsCount}
              selectedCategory={selectedCategory}
              selectedBrands={selectedBrands}
              searchTerm={searchTerm}
              sortOrder={sortOrder}
              isNewOnly={isNewOnly}
              isSaleOnly={isSaleOnly}
              minPrice={minPrice}
              maxPrice={maxPrice}
              inStockOnly={inStockOnly}
            >
              <ProductGrid
                products={products}
                emptyActionHref="/catalog"
                emptyActionLabel="Скинути фільтри"
              />
            </CatalogClient>
          </div>
        </section>
      </Container>
    </section>
  );
}
