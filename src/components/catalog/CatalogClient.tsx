"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactPaginate from "react-paginate";

import { Container } from "@/components/layout/Container/Container";
import { CatalogFilters } from "./CatalogFilters";
import { CatalogToolbar } from "./CatalogToolbar";
import { ProductList } from "./ProductList";
import type { AppProduct } from "@/types/app";
import type { Pagination } from "@/types/api";
import type { Product } from "@/types/product";
import { mapApiProductToAppProduct } from "@/services/api";
import { getProductsCSR } from "@/services/apiClient";
import styles from "@/components/catalog/Catalog.module.css";

interface CatalogClientProps {
  initialProducts: Product[];
  initialFilterProducts: Product[];
  initialPagination: Pagination | null;
  initialCategory?: string;
  initialBrands?: string[];
  initialIsNew?: boolean;
  initialIsSale?: boolean;
}

interface PageChangeEvent {
  selected: number;
}

const PAGE_LIMIT = 12;

const normalizeToken = (value: string): string =>
  decodeURIComponent(value).trim().toLowerCase();

export function CatalogClient({
  initialProducts,
  initialFilterProducts,
  initialPagination,
  initialCategory = "",
  initialBrands = [],
  initialIsNew = false,
  initialIsSale = false,
}: CatalogClientProps) {
  const firstPageProducts = useMemo(
    () =>
      initialProducts
        .map((product) => mapApiProductToAppProduct(product))
        .filter((product): product is AppProduct => product !== null),
    [initialProducts]
  );

  const [products, setProducts] = useState<AppProduct[]>(firstPageProducts);
  const [pagination, setPagination] = useState<Pagination | null>(
    initialPagination
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isPageLoading, setIsPageLoading] = useState(false);

  // Effective server-side filters — may differ from URL params when the user
  // toggles isNew/isSale checkboxes in the sidebar.
  const [effectiveIsNew, setEffectiveIsNew] = useState(initialIsNew);
  const [effectiveIsSale, setEffectiveIsSale] = useState(initialIsSale);
  const [effectiveBrands, setEffectiveBrands] =
    useState<string[]>(initialBrands);
  // Incremented to force re-fetch when page stays at 1 but effective filters change.
  const [refreshKey, setRefreshKey] = useState(0);

  // Only pre-seed page 1 cache from SSR when no server-side filters are active.
  // If filters are active (isNew/isSale), the SSR data is already filtered and
  // correct, so we can safely seed the cache.
  const pageCacheRef = useRef<Map<number, AppProduct[]>>(
    new Map([[1, firstPageProducts]])
  );

  useEffect(() => {
    pageCacheRef.current.set(1, firstPageProducts);
    setProducts(firstPageProducts);
    setPagination(initialPagination);
    setCurrentPage(1);
    setSelectedBrands(initialBrands);
    setEffectiveBrands(initialBrands);
    setIsNewOnly(initialIsNew);
    setIsSaleOnly(initialIsSale);
    setEffectiveIsNew(initialIsNew);
    setEffectiveIsSale(initialIsSale);
  }, [
    firstPageProducts,
    initialPagination,
    initialBrands,
    initialIsNew,
    initialIsSale,
  ]);

  useEffect(() => {
    let isCancelled = false;

    const loadPage = async () => {
      // Check cache first — for page 1 this is pre-populated with SSR data.
      // When effective filters change the cache is cleared before this runs.
      const cachedPage = pageCacheRef.current.get(currentPage);
      if (cachedPage) {
        setProducts(cachedPage);
        return;
      }

      try {
        setIsPageLoading(true);

        const { products: nextProducts, pagination: nextPagination } =
          await getProductsCSR({
            page: currentPage,
            limit: PAGE_LIMIT,
            category: initialCategory || undefined,
            brand:
              effectiveBrands.length > 0
                ? effectiveBrands.join(",")
                : undefined,
            isNew: effectiveIsNew || undefined,
            isSale: effectiveIsSale || undefined,
          });

        if (isCancelled) {
          return;
        }

        pageCacheRef.current.set(currentPage, nextProducts);
        setProducts(nextProducts);
        setPagination(nextPagination ?? null);
      } catch (err) {
        console.error("[CatalogClient] page", currentPage, "load error:", err);
        if (!isCancelled) {
          setProducts([]);
        }
      } finally {
        if (!isCancelled) {
          setIsPageLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      isCancelled = true;
    };
  }, [
    currentPage,
    refreshKey,
    initialCategory,
    initialPagination,
    effectiveBrands,
    effectiveIsNew,
    effectiveIsSale,
  ]);

  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialBrands);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [isNewOnly, setIsNewOnly] = useState(initialIsNew);
  const [isSaleOnly, setIsSaleOnly] = useState(initialIsSale);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortOrder, setSortOrder] = useState("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Triggers a fresh server fetch for isNew/isSale — the DB fields
  // (isNewProduct, isOnSale) are not reliably present on all records, so
  // client-side re-filtering would silently drop all products.
  const handleIsNewChange = useCallback((value: boolean) => {
    setIsNewOnly(value);
    pageCacheRef.current.clear();
    setEffectiveIsNew(value);
    setCurrentPage(1);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleIsSaleChange = useCallback((value: boolean) => {
    setIsSaleOnly(value);
    pageCacheRef.current.clear();
    setEffectiveIsSale(value);
    setCurrentPage(1);
    setRefreshKey((k) => k + 1);
  }, []);

  const filterSourceProducts = useMemo(
    () =>
      initialFilterProducts
        .map((product) => mapApiProductToAppProduct(product))
        .filter((product): product is AppProduct => product !== null),
    [initialFilterProducts]
  );

  const brands = useMemo(() => {
    return Array.from(
      new Set(
        filterSourceProducts
          .map((product) => product.brand)
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b, "uk"));
  }, [filterSourceProducts]);

  const brandCounts = useMemo(() => {
    return filterSourceProducts.reduce<Record<string, number>>(
      (acc, product) => {
        if (!product.brand) {
          return acc;
        }

        acc[product.brand] = (acc[product.brand] ?? 0) + 1;
        return acc;
      },
      {}
    );
  }, [filterSourceProducts]);

  const priceBounds = useMemo(() => {
    const prices = filterSourceProducts
      .map((product) => product.price)
      .filter((price) => Number.isFinite(price));

    if (prices.length === 0) {
      return { min: null, max: null };
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [filterSourceProducts]);

  const filterCounts = useMemo(
    () => ({
      inStock: filterSourceProducts.filter((product) => product.inStock).length,
      isNew: filterSourceProducts.filter((product) => product.isNew).length,
      isSale: filterSourceProducts.filter(
        (product) => product.isSale || Boolean(product.oldPrice)
      ).length,
    }),
    [filterSourceProducts]
  );

  const filteredProducts = useMemo(() => {
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;

    const base = products.filter((product) => {
      if (initialCategory) {
        const productCategory = normalizeToken(product.category ?? "");
        const categoryToken = normalizeToken(initialCategory);

        if (productCategory !== categoryToken) {
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
  }, [products, initialCategory, inStockOnly, minPrice, maxPrice, sortOrder]);

  const handleToggleBrand = useCallback((brand: string) => {
    setSelectedBrands((prev) => {
      const next = prev.includes(brand)
        ? prev.filter((item) => item !== brand)
        : [...prev, brand];

      pageCacheRef.current.clear();
      setEffectiveBrands(next);
      setCurrentPage(1);
      setRefreshKey((k) => k + 1);

      return next;
    });
  }, []);

  const clearFilters = () => {
    setSelectedBrands(initialBrands);
    setInStockOnly(false);
    setMinPrice("");
    setMaxPrice("");
    setIsNewOnly(initialIsNew);
    setIsSaleOnly(initialIsSale);

    const isBrandChanged =
      selectedBrands.length !== initialBrands.length ||
      selectedBrands.some((brand) => !initialBrands.includes(brand));

    if (
      isBrandChanged ||
      effectiveIsNew !== initialIsNew ||
      effectiveIsSale !== initialIsSale
    ) {
      pageCacheRef.current.clear();
      pageCacheRef.current.set(1, firstPageProducts);
      setEffectiveBrands(initialBrands);
      setEffectiveIsNew(initialIsNew);
      setEffectiveIsSale(initialIsSale);
      setProducts(firstPageProducts);
      setPagination(initialPagination);
      setCurrentPage(1);
    }
  };

  const breadcrumbTail = useMemo(() => {
    if (initialCategory) {
      return initialCategory;
    }

    if (initialIsNew) {
      return "Новинки";
    }

    if (initialIsSale) {
      return "Акції";
    }

    return "";
  }, [initialCategory, initialIsNew, initialIsSale]);

  const pageCount = Math.max(1, pagination?.totalPages ?? 1);
  const shouldShowPagination = pageCount > 1;

  // For debugging: track render state
  // Commented out to keep console clean during normal operation

  const handlePageChange = ({ selected }: PageChangeEvent) => {
    const nextPage = selected + 1;
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Container className={styles.container}>
      <div className={styles.breadcrumbs}>
        <Link href="/">Головна</Link>
        <span>/</span>
        {breadcrumbTail ? (
          <>
            <Link href="/catalog">Каталог</Link>
            <span>/</span>
            <span className={styles.currentCrumb}>{breadcrumbTail}</span>
          </>
        ) : (
          <span className={styles.currentCrumb}>Каталог</span>
        )}
      </div>

      <div className={styles.layout}>
        <CatalogFilters
          brands={brands}
          brandCounts={brandCounts}
          selectedBrands={selectedBrands}
          onToggleBrand={handleToggleBrand}
          inStockOnly={inStockOnly}
          onInStockChange={setInStockOnly}
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
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onReset={clearFilters}
        />

        <main className={styles.main}>
          <CatalogToolbar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            productsCount={pagination?.total ?? filteredProducts.length}
            title={
              initialCategory
                ? `Каталог: ${initialCategory}`
                : "Каталог товарів"
            }
          />

          {isPageLoading && (
            <div className={styles.pageLoader} role="status" aria-live="polite">
              Завантаження сторінки...
            </div>
          )}

          <ProductList
            products={filteredProducts}
            viewMode={viewMode}
            onResetFilters={clearFilters}
          />

          {shouldShowPagination && (
            <ReactPaginate
              breakLabel="..."
              nextLabel="Далі"
              previousLabel="Назад"
              onPageChange={handlePageChange}
              pageRangeDisplayed={3}
              marginPagesDisplayed={1}
              pageCount={pageCount}
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
        </main>
      </div>
    </Container>
  );
}
