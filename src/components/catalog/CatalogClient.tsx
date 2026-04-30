"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Funnel } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Container } from "@/components/layout/Container/Container";
import Loader from "@/components/UI/Loader/Loader";
import { toast } from "@/components/UI/notifications/toast";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useDebounce } from "@/hooks/useDebounce";
import { USER_QUERY_KEY, useUser } from "@/queries/authQueries";
import {
  getApiErrorMessage,
  getProductsCSR,
  updateCatalogViewPreferenceCSR,
} from "@/services/api";
import {
  DEFAULT_CATALOG_VIEW_MODE,
  persistCatalogViewMode,
  readStoredCatalogViewMode,
} from "@/services/catalogViewPreference";
import type { AppProduct, CatalogViewMode } from "@/types/app";
import type { Pagination } from "@/types/api";
import type { User } from "@/types/auth";
import type { Category, CategorySubcategoryLink } from "@/types/category";
import styles from "./Catalog.module.css";
import { Filters } from "./Filters";
import { CatalogToolbar } from "./CatalogToolbar";
import { ProductGrid } from "./ProductGrid";

const CatalogPagination = dynamic(
  () => import("./Pagination").then((module) => module.Pagination),
  { ssr: false }
);

const MOBILE_CATALOG_PAGE_SIZE = 8;

interface CatalogClientProps {
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

const normalizeBrandLabel = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

const normalizePriceParam = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return trimmed;
};

const createSortParams = (sortOrder: string) => {
  if (!sortOrder || sortOrder === "default") {
    return { sort: null, order: null };
  }

  if (sortOrder === "rating-desc") {
    return { sort: "rating-desc", order: null };
  }

  return { sort: sortOrder, order: null };
};

const createApiSortParams = (sortOrder: string) => {
  if (!sortOrder || sortOrder === "default") {
    return { sort: undefined, order: undefined };
  }

  if (sortOrder === "rating-desc") {
    return { sort: "rating", order: "desc" };
  }

  return { sort: sortOrder, order: undefined };
};

const mergeUniqueProducts = (
  currentProducts: AppProduct[],
  nextProducts: AppProduct[]
) => {
  const seenIds = new Set(currentProducts.map((product) => product.id));
  const merged = [...currentProducts];

  for (const product of nextProducts) {
    if (!product.id || seenIds.has(product.id)) {
      continue;
    }

    seenIds.add(product.id);
    merged.push(product);
  }

  return merged;
};

export function CatalogClient({
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
}: CatalogClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isDesktop } = useBreakpoint();
  const { data: currentUser } = useUser();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [draftMinPrice, setDraftMinPrice] = useState(minPrice);
  const [draftMaxPrice, setDraftMaxPrice] = useState(maxPrice);
  const [loadedProducts, setLoadedProducts] = useState(products);
  const [loadedPage, setLoadedPage] = useState(currentPage);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [guestViewMode, setGuestViewMode] = useState<CatalogViewMode>(
    () => readStoredCatalogViewMode() ?? DEFAULT_CATALOG_VIEW_MODE
  );
  const [pendingViewMode, setPendingViewMode] =
    useState<CatalogViewMode | null>(null);
  const debouncedMinPrice = useDebounce(draftMinPrice, 600);
  const debouncedMaxPrice = useDebounce(draftMaxPrice, 600);

  const persistedViewMode =
    currentUser?.catalogViewMode ?? guestViewMode ?? DEFAULT_CATALOG_VIEW_MODE;
  const viewMode = pendingViewMode ?? persistedViewMode;

  useEffect(() => {
    setDraftMinPrice(minPrice);
  }, [minPrice]);

  useEffect(() => {
    setDraftMaxPrice(maxPrice);
  }, [maxPrice]);

  useEffect(() => {
    if (isDesktop) {
      setLoadedProducts(products);
      setLoadedPage(currentPage);
    } else {
      setLoadedProducts(products.slice(0, MOBILE_CATALOG_PAGE_SIZE));
      setLoadedPage(1);
    }

    setIsLoadingMore(false);
  }, [
    currentPage,
    isDesktop,
    inStockOnly,
    isNewOnly,
    isSaleOnly,
    maxPrice,
    minPrice,
    products,
    searchTerm,
    selectedBrands,
    selectedCategory,
    sortOrder,
  ]);

  const buildCatalogUrl = useCallback(
    (
      updates: Record<string, string | null>,
      options?: { resetPage?: boolean }
    ) => {
      const query = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (!value) {
          query.delete(key);
        } else {
          query.set(key, value);
        }
      }

      if (options?.resetPage ?? true) {
        query.delete("page");
      }

      const queryString = query.toString();
      return queryString ? `${pathname}?${queryString}` : pathname;
    },
    [pathname, searchParams]
  );

  const handleNavigate = useCallback(
    (
      updates: Record<string, string | null>,
      options?: { resetPage?: boolean; scroll?: boolean }
    ) => {
      router.push(buildCatalogUrl(updates, options), {
        scroll: options?.scroll ?? false,
      });
    },
    [buildCatalogUrl, router]
  );

  useEffect(() => {
    const nextMinPrice = normalizePriceParam(debouncedMinPrice);
    const nextMaxPrice = normalizePriceParam(debouncedMaxPrice);
    const currentMinPrice = normalizePriceParam(minPrice);
    const currentMaxPrice = normalizePriceParam(maxPrice);

    if (nextMinPrice === currentMinPrice && nextMaxPrice === currentMaxPrice) {
      return;
    }

    handleNavigate({
      minPrice: nextMinPrice,
      maxPrice: nextMaxPrice,
    });
  }, [
    debouncedMaxPrice,
    debouncedMinPrice,
    handleNavigate,
    maxPrice,
    minPrice,
  ]);

  const handleViewModeChange = useCallback(
    async (nextViewMode: CatalogViewMode) => {
      if (nextViewMode === viewMode) {
        return;
      }

      const previousViewMode = persistedViewMode;

      setPendingViewMode(nextViewMode);
      setGuestViewMode(nextViewMode);
      persistCatalogViewMode(nextViewMode);

      if (!currentUser) {
        setPendingViewMode(null);
        return;
      }

      try {
        const response = await updateCatalogViewPreferenceCSR(nextViewMode);

        setPendingViewMode(null);
        persistCatalogViewMode(response.catalogViewMode);
        queryClient.setQueryData<User | null>(USER_QUERY_KEY, {
          ...currentUser,
          catalogViewMode: response.catalogViewMode,
        });
      } catch {
        setPendingViewMode(null);
        setGuestViewMode(previousViewMode);
        persistCatalogViewMode(previousViewMode);
        toast.error("Не вдалося зберегти вигляд каталогу");
      }
    },
    [currentUser, persistedViewMode, queryClient, viewMode]
  );

  const displayedProducts = useMemo(() => {
    const min = normalizePriceParam(draftMinPrice);
    const max = normalizePriceParam(draftMaxPrice);
    const minValue = min ? Number(min) : null;
    const maxValue = max ? Number(max) : null;

    const filtered = loadedProducts.filter((product) => {
      if (inStockOnly && !product.inStock) {
        return false;
      }

      if (minValue !== null && product.price < minValue) {
        return false;
      }

      if (maxValue !== null && product.price > maxValue) {
        return false;
      }

      return true;
    });

    if (sortOrder === "price-asc") {
      return [...filtered].sort((left, right) => left.price - right.price);
    }

    if (sortOrder === "price-desc") {
      return [...filtered].sort((left, right) => right.price - left.price);
    }

    if (sortOrder === "name") {
      return [...filtered].sort((left, right) =>
        left.name.localeCompare(right.name, "uk")
      );
    }

    return filtered;
  }, [draftMaxPrice, draftMinPrice, inStockOnly, loadedProducts, sortOrder]);

  const hasClientSideFilters =
    inStockOnly ||
    draftMinPrice.trim().length > 0 ||
    draftMaxPrice.trim().length > 0;
  const productsCount = hasClientSideFilters
    ? displayedProducts.length
    : typeof pagination?.total === "number" && pagination.total > 0
    ? pagination.total
    : displayedProducts.length;
  const shouldUseLoadMore = !isDesktop;
  const totalPages = shouldUseLoadMore
    ? Math.max(
        1,
        Math.ceil(
          (pagination?.total ?? displayedProducts.length) /
            MOBILE_CATALOG_PAGE_SIZE
        )
      )
    : Math.max(1, pagination?.totalPages ?? 1);
  const shouldShowPagination =
    !shouldUseLoadMore && !hasClientSideFilters && totalPages > 1;
  const hasMorePages = !hasClientSideFilters && loadedPage < totalPages;

  const handleToggleBrand = useCallback(
    (brand: string) => {
      const normalizedBrand = normalizeBrandLabel(brand);
      const nextBrands = selectedBrands.includes(normalizedBrand)
        ? selectedBrands.filter((item) => item !== normalizedBrand)
        : [...selectedBrands, normalizedBrand];

      handleNavigate({
        brand: nextBrands.length > 0 ? nextBrands.join(",") : null,
      });
    },
    [handleNavigate, selectedBrands]
  );

  const handleSortOrderChange = useCallback(
    (value: string) => {
      const nextSort = createSortParams(value);

      handleNavigate({
        sort: nextSort.sort,
        order: nextSort.order,
      });
    },
    [handleNavigate]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      handleNavigate(
        {
          page: page > 1 ? String(page) : null,
        },
        { resetPage: false, scroll: true }
      );
    },
    [handleNavigate]
  );

  const handleLoadMore = useCallback(async () => {
    if (isDesktop || hasClientSideFilters || isLoadingMore || !hasMorePages) {
      return;
    }

    const nextPage = loadedPage + 1;
    const apiSort = createApiSortParams(sortOrder);

    setIsLoadingMore(true);

    try {
      const response = await getProductsCSR({
        page: nextPage,
        limit: shouldUseLoadMore
          ? MOBILE_CATALOG_PAGE_SIZE
          : pagination?.limit ?? (products.length || 12),
        category: selectedCategory || undefined,
        brand: selectedBrands.length > 0 ? selectedBrands.join(",") : undefined,
        isNew: isNewOnly || undefined,
        isSale: isSaleOnly || undefined,
        search: searchTerm.trim() || undefined,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        inStock: inStockOnly || undefined,
        sort: apiSort.sort,
        order: apiSort.order,
      });

      setLoadedProducts((currentProducts) =>
        mergeUniqueProducts(currentProducts, response.products)
      );
      setLoadedPage(nextPage);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Не вдалося завантажити більше товарів")
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    hasClientSideFilters,
    hasMorePages,
    inStockOnly,
    isDesktop,
    isLoadingMore,
    isNewOnly,
    isSaleOnly,
    loadedPage,
    maxPrice,
    minPrice,
    pagination?.limit,
    products.length,
    searchTerm,
    selectedBrands,
    selectedCategory,
    shouldUseLoadMore,
    sortOrder,
  ]);

  const handleIsNewChange = useCallback(
    (value: boolean) => {
      handleNavigate({ isNew: value ? "true" : null });
    },
    [handleNavigate]
  );

  const handleIsSaleChange = useCallback(
    (value: boolean) => {
      handleNavigate({ isSale: value ? "true" : null });
    },
    [handleNavigate]
  );

  const handleInStockChange = useCallback(
    (value: boolean) => {
      handleNavigate({ inStock: value ? "true" : null });
    },
    [handleNavigate]
  );

  const handleMinPriceChange = useCallback((value: string) => {
    setDraftMinPrice(value);
  }, []);

  const handleMaxPriceChange = useCallback((value: string) => {
    setDraftMaxPrice(value);
  }, []);

  const clearFilters = useCallback(
    (options?: { clearSearch?: boolean }) => {
      setDraftMinPrice("");
      setDraftMaxPrice("");

      handleNavigate({
        brand: null,
        isNew: null,
        isSale: null,
        minPrice: null,
        maxPrice: null,
        inStock: null,
        sort: null,
        order: null,
        search: options?.clearSearch ? null : searchTerm.trim() || null,
      });
    },
    [handleNavigate, searchTerm]
  );

  const breadcrumbSegments = (() => {
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
  })();

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
            <div className={styles.layout}>
              <Filters
                brands={brands}
                brandCounts={brandCounts}
                isOpen={isFiltersOpen}
                selectedBrands={selectedBrands}
                onToggleBrand={handleToggleBrand}
                inStockOnly={inStockOnly}
                onInStockChange={handleInStockChange}
                isNewOnly={isNewOnly}
                onIsNewChange={handleIsNewChange}
                isSaleOnly={isSaleOnly}
                onIsSaleChange={handleIsSaleChange}
                minPrice={draftMinPrice}
                maxPrice={draftMaxPrice}
                minAvailablePrice={priceBounds.min}
                maxAvailablePrice={priceBounds.max}
                inStockCount={filterCounts.inStock}
                isNewCount={filterCounts.isNew}
                isSaleCount={filterCounts.isSale}
                onMinPriceChange={handleMinPriceChange}
                onMaxPriceChange={handleMaxPriceChange}
                onClose={() => setIsFiltersOpen(false)}
                onReset={() => clearFilters()}
              />

              <main className={styles.main}>
                <div className={styles.mobileActionsRow}>
                  <button
                    type="button"
                    className={styles.mobileFiltersBtn}
                    onClick={() => setIsFiltersOpen(true)}
                    aria-expanded={isFiltersOpen}
                    aria-controls="catalog-filters"
                  >
                    <Funnel size={16} aria-hidden="true" />
                    Фільтр
                  </button>
                </div>

                <CatalogToolbar
                  showViewToggle
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                  sortOrder={sortOrder}
                  onSortOrderChange={handleSortOrderChange}
                  productsCount={productsCount}
                  title={breadcrumbSegments[breadcrumbSegments.length - 1]}
                />

                <ProductGrid
                  products={displayedProducts}
                  viewMode={viewMode}
                  onResetFilters={() => clearFilters({ clearSearch: true })}
                />

                {shouldShowPagination ? (
                  <CatalogPagination
                    pageCount={totalPages}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                  />
                ) : null}

                {shouldUseLoadMore && hasMorePages ? (
                  <div className={styles.loadMoreWrap}>
                    {isLoadingMore ? (
                      <div className={styles.loadMorePending}>
                        <Loader className={styles.loadMoreLoader} />
                        <span className={styles.visuallyHidden}>
                          Завантаження додаткових товарів
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.loadMoreButton}
                        onClick={handleLoadMore}
                      >
                        Показати ще
                      </button>
                    )}
                  </div>
                ) : null}
              </main>
            </div>
          </div>
        </section>
      </Container>
    </section>
  );
}
