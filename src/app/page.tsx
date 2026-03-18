import { HomeClient } from "@/components/home/HomeClient";
import { getCategories, getProductsSSR } from "@/services/apiServer";
import { mapApiProductToAppProduct } from "@/services/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, productsResponse] = await Promise.all([
    getCategories(),
    getProductsSSR({
      page: 1,
      limit: 100,
      sort: "rating",
      order: "desc",
    }),
  ]);

  const initialProducts = productsResponse.products
    .map((product) => mapApiProductToAppProduct(product))
    .filter(
      (product): product is NonNullable<typeof product> => product !== null
    );

  return (
    <HomeClient
      initialCategories={categories}
      initialProducts={initialProducts}
    />
  );
}
