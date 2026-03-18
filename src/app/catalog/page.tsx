import type { Metadata } from "next";

import { CatalogClient } from "@/components/catalog/CatalogClient";
import { getProductsSSR } from "@/services/apiServer";

interface CatalogPageProps {
  searchParams: Promise<{
    category?: string;
    brand?: string;
    isNew?: string;
    isSale?: string;
  }>;
}

export const metadata: Metadata = {
  title: "Каталог | Будлідер",
  description: "Каталог товарів інтернет-магазину Будлідер",
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
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
  };

  // SSR fetch via apiServer + Next proxy.
  const [{ products, pagination }, { products: filterProducts }] =
    await Promise.all([
      getProductsSSR({
        page: 1,
        limit: 12,
        ...requestParams,
      }),
      getProductsSSR({
        page: 1,
        limit: 250,
        ...requestParams,
      }),
    ]);

  return (
    <CatalogClient
      initialProducts={products}
      initialFilterProducts={filterProducts}
      initialPagination={pagination}
      initialCategory={initialCategory}
      initialBrands={initialBrands}
      initialIsNew={initialIsNew}
      initialIsSale={initialIsSale}
    />
  );
}
