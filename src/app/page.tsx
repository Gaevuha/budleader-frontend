import type { Metadata } from "next";

import styles from "@/app/page.module.css";
import { ProductSection } from "@/components/home/ProductSection";
import { Container } from "@/components/layout/Container/Container";
import { HomeClient } from "@/components/home/HomeClient";
import { mapApiProductToAppProduct } from "@/services/api";
import { getCategories, getProductsSSR } from "@/services/apiServer";
import type { Category } from "@/types/category";
import type { AppProduct } from "@/types/app";

export const metadata: Metadata = {
  title: "Головна",
  description:
    "Будлідер: каталог будівельних матеріалів, популярні товари, категорії та швидкий підбір для ремонту й будівництва.",
};

export const revalidate = 60;

const HOME_PRODUCTS_SOURCE_LIMIT = 24;
const HOME_SECTION_LIMIT = 4;

const loadHomeProducts = async () => {
  try {
    return await getProductsSSR({
      page: 1,
      limit: HOME_PRODUCTS_SOURCE_LIMIT,
      sort: "rating",
      order: "desc",
    });
  } catch {
    try {
      // Some backends reject advanced sort params; retry with a minimal query.
      return await getProductsSSR({
        page: 1,
        limit: HOME_PRODUCTS_SOURCE_LIMIT,
      });
    } catch {
      return {
        products: [],
        pagination: null,
      };
    }
  }
};

const getProductTimestamp = (product: AppProduct): number => {
  const createdAt = (product as AppProduct & { createdAt?: string }).createdAt;
  const parsed = Date.parse(createdAt ?? "");

  return Number.isNaN(parsed) ? 0 : parsed;
};

const uniqueProducts = (products: AppProduct[]): AppProduct[] => {
  const seen = new Set<string>();

  return products.filter((product) => {
    if (!product.id || seen.has(product.id)) {
      return false;
    }

    seen.add(product.id);
    return true;
  });
};

const buildHomeSections = (products: AppProduct[]) => {
  const unique = uniqueProducts(products);
  const popular = unique.slice(0, HOME_SECTION_LIMIT);
  const newProducts = unique
    .filter((product) => product.isNew)
    .sort(
      (left, right) => getProductTimestamp(right) - getProductTimestamp(left)
    )
    .slice(0, HOME_SECTION_LIMIT);
  const saleProducts = unique
    .filter((product) => product.isSale || Boolean(product.oldPrice))
    .slice(0, HOME_SECTION_LIMIT);

  return {
    popular,
    newProducts,
    saleProducts,
  };
};

const makeFallbackCategories = (products: AppProduct[]): Category[] => {
  const seen = new Set<string>();
  const categories: Category[] = [];

  for (const product of products) {
    const name = (product.category ?? "").trim();
    if (!name) {
      continue;
    }

    const id = (product.categoryId ?? name.toLowerCase())
      .trim()
      .replace(/\s+/g, "-");

    const dedupeKey = `${id}::${name}`;
    if (!id || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    categories.push({
      id,
      name,
      subcategories: [],
    });
  }

  return categories;
};

const staticHomeCategories: Category[] = [
  { id: "building-materials", name: "Будівельні матеріали", subcategories: [] },
  { id: "tools", name: "Інструменти", subcategories: [] },
  { id: "plumbing", name: "Сантехніка", subcategories: [] },
  { id: "electro", name: "Електротовари", subcategories: [] },
];

export default async function HomePage() {
  const [categories, productsResponse] = await Promise.all([
    getCategories(),
    loadHomeProducts(),
  ]);

  const sourceProducts = productsResponse.products
    .map((product) => mapApiProductToAppProduct(product))
    .filter(
      (product): product is NonNullable<typeof product> => product !== null
    );
  const {
    popular: initialProducts,
    newProducts: initialNewProducts,
    saleProducts: initialSaleProducts,
  } = buildHomeSections(sourceProducts);

  const initialCategories =
    categories.length > 0
      ? categories
      : makeFallbackCategories(initialProducts);

  const resolvedCategories =
    initialCategories.length > 0 ? initialCategories : staticHomeCategories;

  return (
    <>
      <HomeClient
        initialCategories={resolvedCategories}
        initialPopularProducts={initialProducts}
      />

      {initialNewProducts.length > 0 ? (
        <section className={styles.productsSection}>
          <Container>
            <ProductSection
              title="Новинки"
              href="/catalog?isNew=true"
              products={initialNewProducts}
            />
          </Container>
        </section>
      ) : null}

      {initialSaleProducts.length > 0 ? (
        <section id="all-sales" className={styles.productsSection}>
          <Container>
            <ProductSection
              title="Акції"
              href="/catalog?isSale=true"
              products={initialSaleProducts}
            />
          </Container>
        </section>
      ) : null}

      {initialProducts.length > 0 ? (
        <section className={`${styles.productsSection} ${styles.lastSection}`}>
          <Container>
            <ProductSection
              title="Популярні товари"
              href="/catalog?sort=rating&order=desc"
              products={initialProducts}
            />
          </Container>
        </section>
      ) : null}
    </>
  );
}
