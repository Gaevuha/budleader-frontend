import type { Metadata } from "next";

import { CatalogClient } from "@/components/catalog/CatalogClient";
import { mapApiProductToAppProduct } from "@/services/api";
import {
  createApiServer,
  getCategories,
  getProductsSSR,
} from "@/services/apiServer";

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

const FILTER_COUNT_PAGE_LIMIT = 100;

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

const normalizeBrandLabel = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

const normalizeBrandKey = (value: string): string =>
  normalizeBrandLabel(value).toLocaleLowerCase("uk");

const extractTotalItems = (payload: unknown): number | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const top = payload as Record<string, unknown>;
  const data =
    top.data && typeof top.data === "object"
      ? (top.data as Record<string, unknown>)
      : top;
  const pagination =
    data.pagination && typeof data.pagination === "object"
      ? (data.pagination as Record<string, unknown>)
      : null;

  if (!pagination) {
    return null;
  }

  const totalRaw = pagination.total ?? pagination.totalItems;
  const total = Number(totalRaw);

  return Number.isFinite(total) ? total : null;
};

const loadStaticFilterProducts = async (category?: string) => {
  try {
    const firstPage = await getProductsSSR({
      page: 1,
      limit: FILTER_COUNT_PAGE_LIMIT,
      category,
      sort: "name",
      order: "asc",
    });

    const totalPages = firstPage.pagination?.totalPages ?? 1;
    if (totalPages <= 1) {
      return firstPage.products;
    }

    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        getProductsSSR({
          page: index + 2,
          limit: FILTER_COUNT_PAGE_LIMIT,
          category,
          sort: "name",
          order: "asc",
        })
      )
    );

    const merged = [
      ...firstPage.products,
      ...rest.flatMap((item) => item.products),
    ];

    const seen = new Set<string>();

    return merged.filter((product) => {
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

const loadBrandCounts = async (
  products: Awaited<ReturnType<typeof loadStaticFilterProducts>>,
  category?: string
) => {
  const brandMap = new Map<string, string>();
  const fallbackCountsByKey = new Map<string, number>();
  const variantsByKey = new Map<string, Set<string>>();

  for (const product of products) {
    const app = mapApiProductToAppProduct(product);
    if (!app?.brand) {
      continue;
    }

    const label = normalizeBrandLabel(app.brand);
    const key = normalizeBrandKey(label);
    const current = brandMap.get(key);

    if (!current) {
      brandMap.set(key, label);
      fallbackCountsByKey.set(key, 1);
      variantsByKey.set(key, new Set([label]));
      continue;
    }

    if (current === current.toUpperCase() && label !== label.toUpperCase()) {
      brandMap.set(key, label);
    }

    fallbackCountsByKey.set(key, (fallbackCountsByKey.get(key) ?? 0) + 1);
    const variants = variantsByKey.get(key) ?? new Set<string>();
    variants.add(label);
    variantsByKey.set(key, variants);
  }

  const labels = Array.from(brandMap.values());
  if (labels.length === 0) {
    return {} as Record<string, number>;
  }

  const serverApi = await createApiServer({ logErrors: false });
  const result: Record<string, number> = {};

  for (const label of labels) {
    const key = normalizeBrandKey(label);
    const fallback = fallbackCountsByKey.get(key) ?? 0;
    const variants = Array.from(variantsByKey.get(key) ?? new Set([label]));

    const loadTotalByBrand = async (
      brandValue: string
    ): Promise<number | null> => {
      try {
        const response = await serverApi.get("api/products", {
          params: {
            page: 1,
            limit: 1,
            ...(category ? { category } : {}),
            brand: brandValue,
          },
        });

        return extractTotalItems(response.data);
      } catch {
        return null;
      }
    };

    // Some brands can exist in multiple backend variants (case/spaces).
    // We query all known variants and then combine totals safely.
    if (variants.length > 1) {
      const totals = (
        await Promise.all(variants.map((variant) => loadTotalByBrand(variant)))
      ).filter((value): value is number => typeof value === "number");

      if (totals.length === 0) {
        result[label] = fallback;
        continue;
      }

      const allEqual = totals.every((value) => value === totals[0]);
      const combined = allEqual
        ? totals[0]
        : totals.reduce((sum, value) => sum + value, 0);

      result[label] = Math.max(combined, fallback);
      continue;
    }

    try {
      result[label] = (await loadTotalByBrand(label)) ?? fallback;
    } catch {
      result[label] = fallback;
    }
  }

  return Object.entries(result).reduce<Record<string, number>>((acc, entry) => {
    const [label, total] = entry;
    acc[label] = total;
    return acc;
  }, {});
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

  const [categories, { products, pagination }] = await Promise.all([
    getCategories(),
    loadFirstPageProducts(requestParams),
  ]);

  // Search transitions from home should stay fast. Skip expensive SSR facet
  // precomputation and let CSR fill dynamic filters/results after hydration.
  let staticFilterProducts: Awaited<
    ReturnType<typeof loadStaticFilterProducts>
  > = [];
  let initialBrandCounts: Record<string, number> = {};

  if (!hasSearch) {
    staticFilterProducts = await loadStaticFilterProducts(
      initialCategory || undefined
    );

    initialBrandCounts = await loadBrandCounts(
      staticFilterProducts,
      initialCategory || undefined
    );
  }

  return (
    <CatalogClient
      categories={categories}
      initialProducts={products}
      initialFilterProducts={staticFilterProducts}
      initialBrandCounts={initialBrandCounts}
      initialPagination={pagination}
      initialCategory={initialCategory}
      initialBrands={initialBrands}
      initialIsNew={initialIsNew}
      initialIsSale={initialIsSale}
      initialSearch={initialSearch}
    />
  );
}
