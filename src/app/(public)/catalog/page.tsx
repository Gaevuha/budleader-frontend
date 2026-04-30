import { cache } from "react";
import type { Metadata } from "next";

import { CatalogClient } from "@/components/catalog/CatalogClient";
import { mapApiProductToAppProduct } from "@/services/api";
import { getCategories, getProductsSSR } from "@/services/apiServer";
import type { AppProduct } from "@/types/app";

interface CatalogPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    brand?: string;
    isNew?: string;
    isSale?: string;
    search?: string;
    sort?: string;
    order?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
  }>;
}

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Каталог | Будлідер",
  description: "Каталог товарів інтернет-магазину Будлідер",
};

const FACET_PRODUCTS_PAGE_LIMIT = 100;

const normalizeSearchText = (value: string): string =>
  value.trim().toLocaleLowerCase("uk");

const normalizePriceParam = (value: string | undefined): string => {
  const trimmed = (value ?? "").trim();

  if (!trimmed) {
    return "";
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "";
  }

  return trimmed;
};

const loadFirstPageProducts = async (params: {
  page: number;
  category?: string;
  brand?: string;
  isNew?: boolean;
  isSale?: boolean;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  sort?: string;
  order?: "asc" | "desc" | string;
}) => {
  try {
    return await getProductsSSR({
      limit: 12,
      ...params,
    });
  } catch {
    return {
      products: [],
      pagination: null,
    };
  }
};

const loadFacetProducts = async (params: {
  category?: string;
  brand?: string;
  isNew?: boolean;
  isSale?: boolean;
  search?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
}) => {
  try {
    const firstPage = await getProductsSSR({
      page: 1,
      limit: FACET_PRODUCTS_PAGE_LIMIT,
      ...params,
    });

    const totalPages = Math.max(1, firstPage.pagination?.totalPages ?? 1);

    if (totalPages === 1) {
      return firstPage.products;
    }

    const allProducts = [...firstPage.products];

    // Fetch remaining pages sequentially to keep brand counts complete
    // without recreating the earlier parallel burst that triggered 429s.
    for (let page = 2; page <= totalPages; page += 1) {
      const response = await getProductsSSR({
        page,
        limit: FACET_PRODUCTS_PAGE_LIMIT,
        ...params,
      });

      if (response.products.length === 0) {
        continue;
      }

      allProducts.push(...response.products);
    }

    return allProducts;
  } catch {
    return [];
  }
};

const decodeValue = (value: string | undefined): string =>
  value ? decodeURIComponent(value) : "";

const parsePositiveInt = (value: string | undefined, fallback = 1): number => {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeBrandLabel = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

const buildCatalogFacets = (products: AppProduct[]) => {
  const brandFacets = new Map<string, { label: string; count: number }>();

  for (const product of products) {
    if (product.brand) {
      const label = normalizeBrandLabel(product.brand);
      const key = label.toLocaleLowerCase("uk");
      const existing = brandFacets.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        brandFacets.set(key, { label, count: 1 });
      }
    }
  }

  const brands = Array.from(brandFacets.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "uk")
  );

  const prices = products
    .map((product) => product.price)
    .filter((price) => Number.isFinite(price));

  return {
    brands: brands.map((brand) => brand.label),
    brandCounts: brands.reduce<Record<string, number>>((acc, brand) => {
      acc[brand.label] = brand.count;
      return acc;
    }, {}),
    priceBounds:
      prices.length > 0
        ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
          }
        : { min: null, max: null },
    filterCounts: {
      inStock: products.filter((product) => product.inStock).length,
      isNew: products.filter((product) => product.isNew).length,
      isSale: products.filter(
        (product) => product.isSale || Boolean(product.oldPrice)
      ).length,
    },
  };
};

const getCachedCategories = cache(async () => getCategories());

const getCachedCatalogProducts = cache(
  async (
    page: number,
    category: string,
    brand: string,
    isNew: boolean,
    isSale: boolean,
    search: string,
    minPrice: string,
    maxPrice: string,
    inStock: boolean,
    sort: string,
    order: string
  ) =>
    loadFirstPageProducts({
      page,
      category: category || undefined,
      brand: brand || undefined,
      isNew: isNew || undefined,
      isSale: isSale || undefined,
      search: search || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      inStock: inStock || undefined,
      sort: sort || undefined,
      order: order || undefined,
    })
);

const getCachedCatalogFacetProducts = cache(
  async (
    category: string,
    brand: string,
    isNew: boolean,
    isSale: boolean,
    search: string,
    minPrice: string,
    maxPrice: string,
    inStock: boolean
  ) =>
    loadFacetProducts({
      category: category || undefined,
      brand: brand || undefined,
      isNew: isNew || undefined,
      isSale: isSale || undefined,
      search: search || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      inStock: inStock || undefined,
    })
);

const getCachedCatalogSearchFallbackProducts = cache(
  async (
    category: string,
    brand: string,
    isNew: boolean,
    isSale: boolean,
    minPrice: string,
    maxPrice: string,
    inStock: boolean,
    sort: string,
    order: string
  ) =>
    getProductsSSR({
      page: 1,
      limit: FACET_PRODUCTS_PAGE_LIMIT,
      category: category || undefined,
      brand: brand || undefined,
      isNew: isNew || undefined,
      isSale: isSale || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      inStock: inStock || undefined,
      sort: sort || undefined,
      order: order || undefined,
    })
);

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const currentPage = parsePositiveInt(params.page);
  const initialSearch = decodeValue(params.search);
  const initialCategory = decodeValue(params.category);
  const initialBrands = params.brand
    ? params.brand
        .split(",")
        .map((brand) => decodeURIComponent(brand).trim())
        .filter(Boolean)
    : [];
  const initialIsNew = params.isNew === "true";
  const initialIsSale = params.isSale === "true";
  const sortParam = decodeValue(params.sort);
  const initialSortOrder =
    sortParam === "rating-desc" ||
    sortParam === "price-asc" ||
    sortParam === "price-desc" ||
    sortParam === "name"
      ? sortParam
      : decodeValue(params.sort) === "rating" &&
        decodeValue(params.order) === "desc"
      ? "rating-desc"
      : "default";
  const initialMinPrice = normalizePriceParam(decodeValue(params.minPrice));
  const initialMaxPrice = normalizePriceParam(decodeValue(params.maxPrice));
  const initialInStockOnly = params.inStock === "true";

  const apiSort = initialSortOrder === "rating-desc" ? "rating" : "";
  const apiOrder = initialSortOrder === "rating-desc" ? "desc" : "";

  const [categories, productsResponse, facetProducts, searchFallback] =
    await Promise.all([
      getCachedCategories(),
      getCachedCatalogProducts(
        currentPage,
        initialCategory,
        initialBrands.join(","),
        initialIsNew,
        initialIsSale,
        initialSearch,
        initialMinPrice,
        initialMaxPrice,
        initialInStockOnly,
        apiSort,
        apiOrder
      ),
      getCachedCatalogFacetProducts(
        initialCategory,
        initialBrands.join(","),
        initialIsNew,
        initialIsSale,
        initialSearch,
        initialMinPrice,
        initialMaxPrice,
        initialInStockOnly
      ),
      initialSearch.trim()
        ? getCachedCatalogSearchFallbackProducts(
            initialCategory,
            initialBrands.join(","),
            initialIsNew,
            initialIsSale,
            initialMinPrice,
            initialMaxPrice,
            initialInStockOnly,
            apiSort,
            apiOrder
          )
        : Promise.resolve({ products: [], pagination: null }),
    ]);

  let { products, pagination } = productsResponse;

  let appProducts = products
    .map((product) => mapApiProductToAppProduct(product))
    .filter((product): product is AppProduct => product !== null);
  const facetAppProducts = facetProducts
    .map((product) => mapApiProductToAppProduct(product))
    .filter((product): product is AppProduct => product !== null);

  if (initialSearch.trim().length > 0 && appProducts.length === 0) {
    const normalizedSearch = normalizeSearchText(initialSearch);

    appProducts = searchFallback.products
      .map((product) => mapApiProductToAppProduct(product))
      .filter((product): product is AppProduct => product !== null)
      .filter((product) =>
        normalizeSearchText(product.name).includes(normalizedSearch)
      )
      .slice(0, 12);

    pagination = {
      page: 1,
      limit: 12,
      total: appProducts.length,
      totalPages: 1,
    };
  }

  const { brands, brandCounts, priceBounds, filterCounts } =
    buildCatalogFacets(facetAppProducts);

  return (
    <CatalogClient
      categories={categories}
      products={appProducts}
      brands={brands}
      brandCounts={brandCounts}
      priceBounds={priceBounds}
      filterCounts={filterCounts}
      pagination={pagination}
      currentPage={currentPage}
      selectedCategory={initialCategory}
      selectedBrands={initialBrands}
      searchTerm={initialSearch}
      sortOrder={initialSortOrder}
      isNewOnly={initialIsNew}
      isSaleOnly={initialIsSale}
      minPrice={initialMinPrice}
      maxPrice={initialMaxPrice}
      inStockOnly={initialInStockOnly}
    />
  );
}
