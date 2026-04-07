"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ReactPaginate from "react-paginate";

import { Container } from "@/components/layout/Container/Container";
import Loader from "@/components/UI/Loader/Loader";
import { CatalogFilters } from "./CatalogFilters";
import { CatalogToolbar } from "./CatalogToolbar";
import { ProductList } from "./ProductList";
import type { AppProduct } from "@/types/app";
import type { Pagination } from "@/types/api";
import type { Category } from "@/types/category";
import type { CategorySubcategoryLink } from "@/types/category";
import type { Product } from "@/types/product";
import { mapApiProductToAppProduct } from "@/services/api";
import { getProductsCSR } from "@/services/apiClient";
import { useDebounce } from "@/hooks/useDebounce";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import styles from "@/components/catalog/Catalog.module.css";

interface CatalogClientProps {
  categories: Category[];
  initialProducts: Product[];
  initialFilterProducts: Product[];
  initialBrandCounts?: Record<string, number>;
  initialPagination: Pagination | null;
  initialCategory?: string;
  initialBrands?: string[];
  initialIsNew?: boolean;
  initialIsSale?: boolean;
  initialSearch?: string;
}

interface PageChangeEvent {
  selected: number;
}

const DESKTOP_PAGE_LIMIT = 12;
const COMPACT_PAGE_LIMIT = 8;

const normalizeToken = (value: string): string =>
  decodeURIComponent(value).trim().toLowerCase();

const normalizeBrandLabel = (value: string): string => {
  return value.trim().replace(/\s+/g, " ");
};

const normalizeBrandKey = (value: string): string => {
  return normalizeBrandLabel(value).toLocaleLowerCase("uk");
};

const normalizeSearchText = (value: string): string => {
  return value.trim().toLocaleLowerCase("uk");
};

export function CatalogClient({
  categories,
  initialProducts,
  initialFilterProducts,
  initialBrandCounts,
  initialCategory = "",
  initialBrands = [],
  initialIsNew = false,
  initialIsSale = false,
  initialSearch = "",
}: CatalogClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isDesktop, isMobile, isTablet } = useBreakpoint();
  const isCompactLayout = isMobile || isTablet;
  const pageLimit = isDesktop ? DESKTOP_PAGE_LIMIT : COMPACT_PAGE_LIMIT;
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const searchTermRef = useRef(searchTerm);
  const urlSearchTerm = (searchParams.get("search") ?? "").trim();
  const isFirstSearchSyncRef = useRef(true);
  const prevUrlSearchRef = useRef(urlSearchTerm);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    searchTermRef.current = searchTerm;
  }, [searchTerm]);

  const initialProductsMapped = useMemo(
    () =>
      initialProducts
        .map((product) => mapApiProductToAppProduct(product))
        .filter((product): product is AppProduct => product !== null),
    [initialProducts]
  );
  const [compactProducts, setCompactProducts] = useState<AppProduct[]>(() =>
    initialProductsMapped.slice(0, COMPACT_PAGE_LIMIT)
  );
  const [compactVisibleCount, setCompactVisibleCount] =
    useState(COMPACT_PAGE_LIMIT);
  const [isLoadMorePending, setIsLoadMorePending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialBrands);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [isNewOnly, setIsNewOnly] = useState(initialIsNew);
  const [isSaleOnly, setIsSaleOnly] = useState(initialIsSale);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortOrder, setSortOrder] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showInitialLoader, setShowInitialLoader] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Effective server-side filters — may differ from URL params when the user
  // toggles isNew/isSale checkboxes in the sidebar.
  const [effectiveIsNew, setEffectiveIsNew] = useState(initialIsNew);
  const [effectiveIsSale, setEffectiveIsSale] = useState(initialIsSale);
  const [effectiveBrands, setEffectiveBrands] =
    useState<string[]>(initialBrands);
  const compactQueryStateKey = [
    initialCategory,
    effectiveBrands.join(","),
    effectiveIsNew ? "new" : "",
    effectiveIsSale ? "sale" : "",
    debouncedSearchTerm,
  ].join("|");

  useEffect(() => {
    const prevUrlSearch = prevUrlSearchRef.current;
    prevUrlSearchRef.current = urlSearchTerm;

    if (isFirstSearchSyncRef.current) {
      isFirstSearchSyncRef.current = false;
      return;
    }

    if (urlSearchTerm === searchTermRef.current.trim()) {
      return;
    }

    startTransition(() => {
      setSearchTerm(urlSearchTerm);

      // Reset filters only when user starts textual search: "" -> "query".
      if (!prevUrlSearch && urlSearchTerm.length > 0) {
        setSelectedBrands([]);
        setEffectiveBrands([]);
        setIsNewOnly(false);
        setIsSaleOnly(false);
        setEffectiveIsNew(false);
        setEffectiveIsSale(false);
        setInStockOnly(false);
        setMinPrice("");
        setMaxPrice("");
        setSortOrder("default");
      }

      setCurrentPage(1);
    });
  }, [urlSearchTerm]);

  const filterSourceProducts = useMemo(
    () =>
      initialFilterProducts
        .map((product) => mapApiProductToAppProduct(product))
        .filter((product): product is AppProduct => product !== null),
    [initialFilterProducts]
  );

  const buildLocalSearchResult = useCallback(
    (normalizedSearch: string) => {
      const matched = filterSourceProducts.filter((product) =>
        normalizeSearchText(product.name).includes(normalizedSearch)
      );

      const total = matched.length;
      const totalPages = Math.max(1, Math.ceil(total / pageLimit));
      const safePage = Math.min(Math.max(currentPage, 1), totalPages);
      const start = (safePage - 1) * pageLimit;

      return {
        products: matched.slice(start, start + pageLimit),
        pagination: {
          page: safePage,
          limit: pageLimit,
          total,
          totalPages,
        },
      };
    },
    [currentPage, filterSourceProducts, pageLimit]
  );

  const productsQuery = useQuery({
    queryKey: [
      "catalog-products",
      currentPage,
      pageLimit,
      initialCategory,
      effectiveBrands.join(","),
      effectiveIsNew,
      effectiveIsSale,
      debouncedSearchTerm,
    ],
    queryFn: async () => {
      const normalizedSearch = normalizeSearchText(debouncedSearchTerm);
      const canUseLocalSearchFallback =
        normalizedSearch.length > 0 && filterSourceProducts.length > 0;

      try {
        const result = await getProductsCSR({
          page: currentPage,
          limit: pageLimit,
          category: initialCategory || undefined,
          brand:
            effectiveBrands.length > 0 ? effectiveBrands.join(",") : undefined,
          isNew: effectiveIsNew || undefined,
          isSale: effectiveIsSale || undefined,
          search: debouncedSearchTerm || undefined,
        });

        if (canUseLocalSearchFallback && result.products.length === 0) {
          return buildLocalSearchResult(normalizedSearch);
        }

        return result;
      } catch {
        if (canUseLocalSearchFallback) {
          return buildLocalSearchResult(normalizedSearch);
        }

        throw new Error("Не вдалося завантажити товари каталогу");
      }
    },
    placeholderData: isDesktop ? keepPreviousData : undefined,
  });

  const products = useMemo(
    () => productsQuery.data?.products ?? [],
    [productsQuery.data?.products]
  );
  const pagination = useMemo(
    () => productsQuery.data?.pagination ?? null,
    [productsQuery.data?.pagination]
  );

  useEffect(() => {
    if (!showInitialLoader || productsQuery.isFetching) {
      return;
    }

    startTransition(() => {
      setShowInitialLoader(false);
    });
  }, [productsQuery.isFetching, showInitialLoader]);

  useEffect(() => {
    if (!isCompactLayout) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setCompactVisibleCount(COMPACT_PAGE_LIMIT);
      setIsLoadMorePending(false);
      setCurrentPage(1);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [compactQueryStateKey, isCompactLayout]);

  useEffect(() => {
    if (!isCompactLayout || !productsQuery.data) {
      return;
    }

    const queryPage = productsQuery.data.pagination?.page ?? currentPage;

    if (queryPage !== currentPage) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setCompactProducts((prev) => {
        const nextProducts = productsQuery.data?.products ?? [];

        if (currentPage === 1) {
          return nextProducts;
        }

        const knownIds = new Set(prev.map((product) => product.id));

        return [
          ...prev,
          ...nextProducts.filter((product) => !knownIds.has(product.id)),
        ];
      });
      setIsLoadMorePending(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [currentPage, isCompactLayout, productsQuery.data]);

  useEffect(() => {
    if (isDesktop) {
      const frameId = window.requestAnimationFrame(() => {
        setIsFiltersOpen(false);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    if (!isFiltersOpen) {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isDesktop, isFiltersOpen]);

  // Triggers a fresh server fetch for isNew/isSale — the DB fields
  // (isNewProduct, isOnSale) are not reliably present on all records, so
  // client-side re-filtering would silently drop all products.
  const handleIsNewChange = useCallback((value: boolean) => {
    setIsNewOnly(value);
    setEffectiveIsNew(value);
    setCurrentPage(1);
  }, []);

  const handleIsSaleChange = useCallback((value: boolean) => {
    setIsSaleOnly(value);
    setEffectiveIsSale(value);
    setCurrentPage(1);
  }, []);

  const handleInStockChange = useCallback((value: boolean) => {
    setInStockOnly(value);
    setCurrentPage(1);
  }, []);

  const facetSourceProducts = useMemo(() => {
    if (filterSourceProducts.length > 0) {
      return filterSourceProducts;
    }

    if (products.length > 0) {
      return products;
    }

    return initialProductsMapped;
  }, [filterSourceProducts, products, initialProductsMapped]);

  const brandFacets = useMemo(() => {
    const facets = new Map<string, { label: string; count: number }>();

    for (const product of facetSourceProducts) {
      if (!product.brand) {
        continue;
      }

      const label = normalizeBrandLabel(product.brand);
      const key = normalizeBrandKey(label);
      const current = facets.get(key);

      if (!current) {
        facets.set(key, { label, count: 1 });
        continue;
      }

      // Keep a readable casing if available while merging case variants.
      if (
        current.label === current.label.toUpperCase() &&
        label !== label.toUpperCase()
      ) {
        current.label = label;
      }

      current.count += 1;
    }

    return Array.from(facets.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "uk")
    );
  }, [facetSourceProducts]);

  const brands = useMemo(() => {
    return brandFacets.map((facet) => facet.label);
  }, [brandFacets]);

  const brandCounts = useMemo(() => {
    if (!initialBrandCounts || Object.keys(initialBrandCounts).length === 0) {
      return brandFacets.reduce<Record<string, number>>((acc, facet) => {
        acc[facet.label] = facet.count;
        return acc;
      }, {});
    }

    const backendByKey = Object.entries(initialBrandCounts).reduce<
      Record<string, number>
    >((acc, [label, count]) => {
      acc[normalizeBrandKey(label)] = count;
      return acc;
    }, {});

    return brandFacets.reduce<Record<string, number>>((acc, facet) => {
      const backendCount = backendByKey[normalizeBrandKey(facet.label)];
      acc[facet.label] =
        typeof backendCount === "number" ? backendCount : facet.count;
      return acc;
    }, {});
  }, [brandFacets, initialBrandCounts]);

  const priceBounds = useMemo(() => {
    const prices = facetSourceProducts
      .map((product) => product.price)
      .filter((price) => Number.isFinite(price));

    if (prices.length === 0) {
      return { min: null, max: null };
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [facetSourceProducts]);

  const filterCounts = useMemo(
    () => ({
      inStock: facetSourceProducts.filter((product) => product.inStock).length,
      isNew: facetSourceProducts.filter((product) => product.isNew).length,
      isSale: facetSourceProducts.filter(
        (product) => product.isSale || Boolean(product.oldPrice)
      ).length,
    }),
    [facetSourceProducts]
  );

  const hasLocalFilters =
    inStockOnly || minPrice.trim().length > 0 || maxPrice.trim().length > 0;

  const locallyFilteredProducts = useMemo(() => {
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;

    const source = hasLocalFilters ? facetSourceProducts : products;

    const base = source.filter((product) => {
      if (initialCategory) {
        const productCategory = normalizeToken(product.category ?? "");
        const productCategoryId = normalizeToken(product.categoryId ?? "");
        const categoryToken = normalizeToken(initialCategory);

        if (
          productCategory !== categoryToken &&
          productCategoryId !== categoryToken
        ) {
          return false;
        }
      }

      // isNew / isSale are handled server-side via effectiveIsNew / effectiveIsSale.
      // The DB fields (isNewProduct, isOnSale) may not be set on all records.

      if (inStockOnly && !product.inStock) {
        return false;
      }

      if (min !== null && !Number.isNaN(min) && product.price < min) {
        return false;
      }

      if (max !== null && !Number.isNaN(max) && product.price > max) {
        return false;
      }

      return true;
    });

    if (sortOrder === "price-asc") {
      return [...base].sort((a, b) => a.price - b.price);
    }

    if (sortOrder === "price-desc") {
      return [...base].sort((a, b) => b.price - a.price);
    }

    if (sortOrder === "name") {
      return [...base].sort((a, b) => a.name.localeCompare(b.name, "uk"));
    }

    return base;
  }, [
    facetSourceProducts,
    hasLocalFilters,
    initialCategory,
    inStockOnly,
    maxPrice,
    minPrice,
    products,
    sortOrder,
  ]);

  const derivedPagination = useMemo(() => {
    if (!hasLocalFilters) {
      return pagination;
    }

    const total = locallyFilteredProducts.length;
    const totalPages = Math.max(1, Math.ceil(total / DESKTOP_PAGE_LIMIT));

    return {
      page: Math.min(currentPage, totalPages),
      limit: DESKTOP_PAGE_LIMIT,
      total,
      totalPages,
    } satisfies Pagination;
  }, [
    currentPage,
    hasLocalFilters,
    locallyFilteredProducts.length,
    pagination,
  ]);

  const filteredProducts = useMemo(() => {
    if (!hasLocalFilters) {
      return locallyFilteredProducts;
    }

    const start = (currentPage - 1) * DESKTOP_PAGE_LIMIT;
    return locallyFilteredProducts.slice(start, start + DESKTOP_PAGE_LIMIT);
  }, [currentPage, hasLocalFilters, locallyFilteredProducts]);

  useEffect(() => {
    if (!hasLocalFilters) {
      return;
    }

    const totalPages = Math.max(
      1,
      Math.ceil(locallyFilteredProducts.length / DESKTOP_PAGE_LIMIT)
    );
    if (currentPage > totalPages) {
      startTransition(() => {
        setCurrentPage(totalPages);
      });
    }
  }, [currentPage, hasLocalFilters, locallyFilteredProducts.length]);

  const handleToggleBrand = useCallback((brand: string) => {
    setSelectedBrands((prev) => {
      const normalizedBrand = normalizeBrandLabel(brand);
      const next = prev.includes(normalizedBrand)
        ? prev.filter((item) => item !== normalizedBrand)
        : [...prev, normalizedBrand];

      setEffectiveBrands(next);
      setCurrentPage(1);

      return next;
    });
  }, []);

  const normalizeCatalogUrl = useCallback(
    (options?: { search?: string }) => {
      const query = new URLSearchParams();
      const nextSearch = options?.search ?? searchTerm;

      if (initialCategory) {
        query.set("category", initialCategory);
      }

      if (nextSearch.trim()) {
        query.set("search", nextSearch.trim());
      }

      const queryString = query.toString();
      const basePath = pathname || "/catalog";
      return queryString ? `${basePath}?${queryString}` : basePath;
    },
    [initialCategory, pathname, searchTerm]
  );

  const clearFilters = (options?: { clearSearch?: boolean }) => {
    const shouldClearSearch = options?.clearSearch ?? false;

    setSelectedBrands([]);
    setInStockOnly(false);
    setMinPrice("");
    setMaxPrice("");
    setIsNewOnly(false);
    setIsSaleOnly(false);

    setEffectiveBrands([]);
    setEffectiveIsNew(false);
    setEffectiveIsSale(false);
    setCurrentPage(1);

    if (shouldClearSearch) {
      setSearchTerm("");
    }

    router.replace(
      normalizeCatalogUrl({ search: shouldClearSearch ? "" : searchTerm }),
      { scroll: false }
    );
  };

  const handleMinPriceChange = useCallback(
    (value: string) => {
      // Price search starts a fresh filtering flow from page 1.
      setSelectedBrands([]);
      setInStockOnly(false);
      setIsNewOnly(false);
      setIsSaleOnly(false);
      setEffectiveBrands([]);
      setEffectiveIsNew(false);
      setEffectiveIsSale(false);
      setMinPrice(value);
      setCurrentPage(1);
      router.replace(normalizeCatalogUrl(), { scroll: false });
    },
    [normalizeCatalogUrl, router]
  );

  const handleMaxPriceChange = useCallback(
    (value: string) => {
      // Price search starts a fresh filtering flow from page 1.
      setSelectedBrands([]);
      setInStockOnly(false);
      setIsNewOnly(false);
      setIsSaleOnly(false);
      setEffectiveBrands([]);
      setEffectiveIsNew(false);
      setEffectiveIsSale(false);
      setMaxPrice(value);
      setCurrentPage(1);
      router.replace(normalizeCatalogUrl(), { scroll: false });
    },
    [normalizeCatalogUrl, router]
  );

  const breadcrumbSegments = (() => {
    if (!initialCategory) {
      if (searchTerm.trim()) {
        return [`Пошук: ${searchTerm.trim()}`];
      }

      if (initialIsNew) {
        return ["Новинки"];
      }

      if (initialIsSale) {
        return ["Акції"];
      }

      return ["Каталог"];
    }

    const token = normalizeToken(initialCategory);
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

    // Fallback for legacy links that can carry slug/name values instead of IDs.
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

    return [initialCategory];
  })();

  const effectivePagination = derivedPagination;
  const effectivePageCount = Math.max(1, effectivePagination?.totalPages ?? 1);
  const shouldShowPagination = isDesktop && effectivePageCount > 1;
  const compactDisplayedProducts = useMemo(() => {
    if (!isCompactLayout) {
      return [] as AppProduct[];
    }

    if (hasLocalFilters) {
      return locallyFilteredProducts.slice(0, compactVisibleCount);
    }

    return compactProducts;
  }, [
    compactProducts,
    compactVisibleCount,
    hasLocalFilters,
    isCompactLayout,
    locallyFilteredProducts,
  ]);
  const compactTotalProducts = hasLocalFilters
    ? locallyFilteredProducts.length
    : effectivePagination?.total ?? compactProducts.length;
  const canLoadMoreCompactProducts = isCompactLayout
    ? hasLocalFilters
      ? compactVisibleCount < locallyFilteredProducts.length
      : compactProducts.length < compactTotalProducts
    : false;
  const displayedProducts = isCompactLayout
    ? compactDisplayedProducts
    : filteredProducts;
  const isCatalogLoading = isDesktop
    ? showInitialLoader
    : showInitialLoader && compactProducts.length === 0;

  const handlePageChange = ({ selected }: PageChangeEvent) => {
    const nextPage = selected + 1;
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLoadMore = () => {
    if (!isCompactLayout || isLoadMorePending) {
      return;
    }

    if (hasLocalFilters) {
      setIsLoadMorePending(true);

      window.setTimeout(() => {
        setCompactVisibleCount((prev) => prev + COMPACT_PAGE_LIMIT);
        setIsLoadMorePending(false);
      }, 300);

      return;
    }

    if (compactProducts.length >= compactTotalProducts) {
      return;
    }

    setIsLoadMorePending(true);
    setCurrentPage((prev) => prev + 1);
  };

  return (
    <Container className={styles.container}>
      <div className={styles.breadcrumbs}>
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
      </div>

      <div className={styles.layout}>
        <CatalogFilters
          brands={brands}
          brandCounts={brandCounts}
          isDesktop={isDesktop}
          isOpen={isFiltersOpen}
          selectedBrands={selectedBrands}
          onToggleBrand={handleToggleBrand}
          inStockOnly={inStockOnly}
          onInStockChange={handleInStockChange}
          isNewOnly={isNewOnly}
          onIsNewChange={handleIsNewChange}
          isSaleOnly={isSaleOnly}
          onIsSaleChange={handleIsSaleChange}
          minPrice={minPrice}
          maxPrice={maxPrice}
          minAvailablePrice={priceBounds.min}
          maxAvailablePrice={priceBounds.max}
          inStockCount={filterCounts.inStock}
          isNewCount={filterCounts.isNew}
          isSaleCount={filterCounts.isSale}
          onMinPriceChange={handleMinPriceChange}
          onMaxPriceChange={handleMaxPriceChange}
          onClose={() => setIsFiltersOpen(false)}
          onReset={clearFilters}
        />

        <main className={styles.main}>
          {!isDesktop ? (
            <div className={styles.mobileActionsRow}>
              <button
                type="button"
                className={styles.mobileFiltersBtn}
                onClick={() => setIsFiltersOpen(true)}
                aria-expanded={isFiltersOpen}
                aria-controls="catalog-filters"
              >
                Фільтр
              </button>
              <span className={styles.mobileResultsCount}>
                {effectivePagination?.total ?? displayedProducts.length} товарів
              </span>
            </div>
          ) : null}

          <CatalogToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            productsCount={
              effectivePagination?.total ?? displayedProducts.length
            }
            title={breadcrumbSegments[breadcrumbSegments.length - 1]}
          />

          {isCatalogLoading ? (
            <div className={styles.pageLoader} role="status" aria-live="polite">
              <Loader />
            </div>
          ) : (
            <>
              <ProductList
                products={displayedProducts}
                viewMode={viewMode}
                onResetFilters={() => clearFilters({ clearSearch: true })}
              />

              {isCompactLayout && canLoadMoreCompactProducts ? (
                <div className={styles.loadMoreWrap}>
                  <button
                    type="button"
                    className={styles.loadMoreButton}
                    onClick={handleLoadMore}
                    disabled={isLoadMorePending}
                  >
                    {isLoadMorePending ? (
                      <span
                        className={styles.loadMoreLoader}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span>
                      {isLoadMorePending ? "Завантаження..." : "Показати ще"}
                    </span>
                  </button>
                </div>
              ) : null}

              {shouldShowPagination && (
                <ReactPaginate
                  breakLabel="..."
                  nextLabel="Далі"
                  previousLabel="Назад"
                  onPageChange={handlePageChange}
                  pageRangeDisplayed={3}
                  marginPagesDisplayed={1}
                  pageCount={effectivePageCount}
                  forcePage={currentPage - 1}
                  containerClassName={styles.pagination}
                  pageClassName={styles.pageItem}
                  pageLinkClassName={styles.pageLink}
                  previousClassName={styles.pageItem}
                  previousLinkClassName={styles.pageLink}
                  nextClassName={styles.pageItem}
                  nextLinkClassName={styles.pageLink}
                  breakClassName={styles.pageItem}
                  breakLinkClassName={styles.pageLink}
                  activeClassName={styles.pageItemActive}
                  disabledClassName={styles.pageItemDisabled}
                />
              )}
            </>
          )}
        </main>
      </div>
    </Container>
  );
}
