"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Funnel } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import { loadMoreProductsAction } from "@/actions/catalogActions";
import Loader from "@/components/UI/Loader/Loader";
import { toast } from "@/components/UI/notifications/toast";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useDebounce } from "@/hooks/useDebounce";
import { USER_QUERY_KEY, useUser } from "@/queries/authQueries";
import {
  getApiErrorMessage,
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
import styles from "./Catalog.module.css";
import { CatalogToolbar } from "./CatalogToolbar";

const CatalogPagination = dynamic(
  () => import("./Pagination").then((module) => module.Pagination),
  { ssr: false }
);

const CatalogProductList = dynamic(
  () => import("./ProductList").then((module) => module.ProductList),
  { ssr: false }
);

const CatalogFilters = dynamic(
  () => import("./CatalogFilters").then((module) => module.CatalogFilters),
  {
    ssr: false,
    loading: () => <div className={styles.filtersPlaceholder} aria-hidden />,
  }
);

interface CatalogClientProps {
  children: ReactNode;
  initialProducts: AppProduct[];
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
  pageTitle: string;
  productsCount: number;
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
  children,
  initialProducts,
  brands,
  brandCounts,
  priceBounds,
  filterCounts,
  pagination,
  currentPage,
  pageTitle,
  productsCount,
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
  const [loadedProducts, setLoadedProducts] = useState(initialProducts);
  const [loadedPage, setLoadedPage] = useState(currentPage);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasClientRenderedResults, setHasClientRenderedResults] =
    useState(false);
  const [guestViewMode, setGuestViewMode] = useState<CatalogViewMode>(
    () => readStoredCatalogViewMode() ?? DEFAULT_CATALOG_VIEW_MODE
  );
  const [pendingViewMode, setPendingViewMode] =
    useState<CatalogViewMode | null>(null);
  const [isIdleReady, setIsIdleReady] = useState(false);
  const hasScheduledIdleReadyRef = useRef(false);
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
    setLoadedProducts(initialProducts);
    setLoadedPage(currentPage);
    setIsLoadingMore(false);
    setHasClientRenderedResults(false);
  }, [
    currentPage,
    initialProducts,
    inStockOnly,
    isNewOnly,
    isSaleOnly,
    maxPrice,
    minPrice,
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
    if (hasScheduledIdleReadyRef.current) {
      return;
    }

    hasScheduledIdleReadyRef.current = true;

    const markReady = () => {
      setIsIdleReady(true);
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(markReady);

      return () => {
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(markReady, 0);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!isIdleReady) {
      return;
    }

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
    isIdleReady,
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

      if (nextViewMode !== "grid") {
        setHasClientRenderedResults(true);
      }

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
  const shouldUseLoadMore = !isDesktop;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const shouldShowPagination = !shouldUseLoadMore && totalPages > 1;
  const hasMorePages = shouldUseLoadMore && loadedPage < totalPages;

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
    if (isDesktop || isLoadingMore || !hasMorePages) {
      return;
    }

    const nextPage = loadedPage + 1;
    const apiSort = createApiSortParams(sortOrder);

    setIsLoadingMore(true);

    try {
      const response = await loadMoreProductsAction({
        page: nextPage,
        limit: pagination?.limit ?? (initialProducts.length || 12),
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
      setHasClientRenderedResults(true);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Не вдалося завантажити більше товарів")
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    hasMorePages,
    inStockOnly,
    initialProducts.length,
    isDesktop,
    isLoadingMore,
    isNewOnly,
    isSaleOnly,
    loadedPage,
    maxPrice,
    minPrice,
    pagination?.limit,
    searchTerm,
    selectedBrands,
    selectedCategory,
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
  const shouldRenderServerResults =
    !hasClientRenderedResults && viewMode === "grid";

  return (
    <div className={styles.layout}>
      <CatalogFilters
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
          title={pageTitle}
        />

        {shouldRenderServerResults ? (
          children
        ) : (
          <CatalogProductList
            products={loadedProducts}
            viewMode={viewMode}
            onResetFilters={() => clearFilters({ clearSearch: true })}
          />
        )}

        {shouldShowPagination ? (
          <CatalogPagination
            pageCount={totalPages}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        ) : null}

        {shouldUseLoadMore && hasMorePages ? (
          <div className={styles.loadMoreWrapper}>
            {isLoadingMore ? (
              <div className={styles.loadMorePending}>
                <Loader className={styles.loader} />
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
  );
}
