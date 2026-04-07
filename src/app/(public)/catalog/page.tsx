import type { Metadata } from "next";

import { CatalogClient } from "@/components/catalog/CatalogClient";
import { mapApiProductToAppProduct } from "@/services/api";
import { getCategories, getProductsSSR } from "@/services/apiServer";

interface CatalogPageProps {
  searchParams: Promise<{
    category?: string;
    brand?: string;
    isNew?: string;
    isSale?: string;
    search?: string;
  }>;
}

export const metadata: Metadata = {
  title: "Каталог | Будлідер",
  description: "Каталог товарів інтернет-магазину Будлідер",
};

const FILTER_COUNT_PAGE_LIMIT = 500;

const buildProductUniqueKey = (product: {
  id?: string;
  _id?: string;
  name?: string;
  price?: number;
  brand?: string;
  categoryId?: string;
}): string => {
  const id = product.id ?? product._id;
  if (id && id.trim().length > 0) {
    return `id:${id}`;
  }

  const normalizedName = (product.name ?? "").trim().toLocaleLowerCase("uk");
  const normalizedBrand = (product.brand ?? "").trim().toLocaleLowerCase("uk");
  const normalizedCategory = (product.categoryId ?? "").trim();
  const normalizedPrice = Number.isFinite(product.price)
    ? String(product.price)
    : "";

  return [
    "fallback",
    normalizedName,
    normalizedBrand,
    normalizedCategory,
    normalizedPrice,
  ].join("|");
};

const normalizeSearchText = (value: string): string =>
  value.trim().toLocaleLowerCase("uk");

const loadStaticFilterProducts = async (params?: {
  category?: string;
  isNew?: boolean;
  isSale?: boolean;
}) => {
  try {
    const firstPage = await getProductsSSR({
      page: 1,
      limit: FILTER_COUNT_PAGE_LIMIT,
      ...params,
    });

    const totalPages = Math.max(firstPage.pagination?.totalPages ?? 1, 1);
    const remainingPages =
      totalPages > 1
        ? await Promise.allSettled(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              getProductsSSR({
                page: index + 2,
                limit: FILTER_COUNT_PAGE_LIMIT,
                ...params,
              })
            )
          )
        : [];

    const allProducts = [
      ...firstPage.products,
      ...remainingPages.flatMap((page) =>
        page.status === "fulfilled" ? page.value.products : []
      ),
    ];

    const seen = new Set<string>();

    return allProducts.filter((product) => {
      const app = mapApiProductToAppProduct(product);
      const key = buildProductUniqueKey({
        id: product.id,
        _id: (product as { _id?: string })._id,
        name: app?.name ?? product.name,
        price: app?.price,
        brand: app?.brand,
        categoryId: app?.categoryId,
      });

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
};

const loadFirstPageProducts = async (params: {
  category?: string;
  brand?: string;
  isNew?: boolean;
  isSale?: boolean;
}) => {
  try {
    return await getProductsSSR({
      page: 1,
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

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const initialSearch = params.search ? decodeURIComponent(params.search) : "";
  const hasSearch = initialSearch.trim().length > 0;
  const initialCategory = params.category
    ? decodeURIComponent(params.category)
    : "";
  const initialBrands = params.brand
    ? params.brand
        .split(",")
        .map((brand) => decodeURIComponent(brand).trim())
        .filter(Boolean)
    : [];
  const initialIsNew = params.isNew === "true";
  const initialIsSale = params.isSale === "true";

  const requestParams = {
    category: initialCategory || undefined,
    brand: initialBrands.length > 0 ? initialBrands.join(",") : undefined,
    isNew: initialIsNew || undefined,
    isSale: initialIsSale || undefined,
    search: initialSearch || undefined,
  };

  const [categories, { products, pagination }, staticFilterProducts] =
    await Promise.all([
      getCategories(),
      loadFirstPageProducts(requestParams),
      loadStaticFilterProducts({
        category: initialCategory || undefined,
        isNew: initialIsNew || undefined,
        isSale: initialIsSale || undefined,
      }),
    ]);

  let resolvedProducts = products;
  let resolvedPagination = pagination;

  if (hasSearch && products.length === 0 && staticFilterProducts.length > 0) {
    const normalizedSearch = normalizeSearchText(initialSearch);
    const matched = staticFilterProducts.filter((product) => {
      const app = mapApiProductToAppProduct(product);
      return app
        ? normalizeSearchText(app.name).includes(normalizedSearch)
        : false;
    });

    resolvedProducts = matched.slice(0, 12);
    resolvedPagination = {
      page: 1,
      limit: 12,
      total: matched.length,
      totalPages: Math.max(1, Math.ceil(matched.length / 12)),
    };
  }

  return (
    <CatalogClient
      categories={categories}
      initialProducts={resolvedProducts}
      initialFilterProducts={staticFilterProducts}
      initialBrandCounts={{}}
      initialPagination={resolvedPagination}
      initialCategory={initialCategory}
      initialBrands={initialBrands}
      initialIsNew={initialIsNew}
      initialIsSale={initialIsSale}
      initialSearch={initialSearch}
    />
  );
}
