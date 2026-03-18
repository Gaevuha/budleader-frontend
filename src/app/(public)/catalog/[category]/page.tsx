import type { Metadata } from "next";

import { Container } from "@/components/layout/Container/Container";
import { getProductsSSR } from "@/services/apiServer";
import styles from "./CategoryPage.module.css";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;

  return {
    title: `${decodeURIComponent(category)} | Каталог Будлідер`,
    description: `Категорія ${decodeURIComponent(
      category
    )} у каталозі Будлідер`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const normalizedCategory = decodeURIComponent(category);
  const { products } = await getProductsSSR({
    page: 1,
    limit: 24,
    category: normalizedCategory,
  });

  return (
    <Container className={styles.container}>
      <h1 className={styles.title}>Категорія: {normalizedCategory}</h1>

      <div className={styles.list}>
        {products.map((product) => (
          <div key={product.id} className={styles.item}>
            <span>{product.name}</span>
            <strong>{product.price} грн</strong>
          </div>
        ))}
      </div>
    </Container>
  );
}
