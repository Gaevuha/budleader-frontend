import { HomeClient } from "@/components/home/HomeClient";
import { getCategories, getProductsSSR } from "@/services/apiServer";
import { mapApiProductToAppProduct } from "@/services/api";
import type { Category } from "@/types/category";
import type { AppProduct } from "@/types/app";

export const dynamic = "force-dynamic";

const loadHomeProducts = async () => {
  try {
    return await getProductsSSR({
      page: 1,
      limit: 100,
      sort: "rating",
      order: "desc",
    });
  } catch {
    try {
      // Some backends reject advanced sort params; retry with a minimal query.
      return await getProductsSSR({
        page: 1,
        limit: 100,
      });
    } catch {
      return {
        products: [],
        pagination: null,
      };
    }
  }
};

const makeFallbackCategories = (products: AppProduct[]): Category[] => {
  const seen = new Set<string>();

  return products
    .map((product) => {
      const name = (product.category ?? "").trim();
      if (!name) {
        return null;
      }

      const id = (product.categoryId ?? name.toLowerCase())
        .trim()
        .replace(/\s+/g, "-");

      const dedupeKey = `${id}::${name}`;
      if (!id || seen.has(dedupeKey)) {
        return null;
      }

      seen.add(dedupeKey);

      return {
        id,
        name,
        subcategories: [],
      } satisfies Category;
    })
    .filter((item): item is Category => item !== null);
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

  const initialProducts = productsResponse.products
    .map((product) => mapApiProductToAppProduct(product))
    .filter(
      (product): product is NonNullable<typeof product> => product !== null
    );

  const initialCategories =
    categories.length > 0
      ? categories
      : makeFallbackCategories(initialProducts);

  const resolvedCategories =
    initialCategories.length > 0 ? initialCategories : staticHomeCategories;

  return (
    <HomeClient
      initialCategories={resolvedCategories}
      initialProducts={initialProducts}
    />
  );
}
