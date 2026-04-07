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
    <section
      className="brand-page-section"
      aria-labelledby="category-page-title"
    >
      <Container>
        <div className={`${styles.frame} brand-card`}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Категорія каталогу</p>
            <h1 id="category-page-title" className={styles.title}>
              {normalizedCategory}
            </h1>
            <p className={styles.description}>
              Швидкий огляд товарів у вибраній категорії з актуальними цінами та
              переходом до повного каталогу.
            </p>
          </header>

          <section className={styles.section}>
            <ul className={styles.list}>
              {products.map((product) => (
                <li key={product.id} className={styles.item}>
                  <span>{product.name}</span>
                  <strong>{product.price} грн</strong>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </Container>
    </section>
  );
}
