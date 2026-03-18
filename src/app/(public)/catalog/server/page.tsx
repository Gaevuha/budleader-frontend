import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/Container/Container";
import { getProductsSSR } from "@/services/apiServer";
import styles from "./ServerCatalog.module.css";

export const metadata: Metadata = {
  title: "Каталог (SSR) | Будлідер",
  description: "SSR приклад завантаження списку товарів через proxy API",
};

export default async function ServerCatalogPage() {
  const { products } = await getProductsSSR({ page: 1, limit: 24 });

  return (
    <Container className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Каталог товарів (SSR приклад)</h1>
        <p className={styles.subtitle}>
          Дані завантажено в Server Component через `apiServer` і Next proxy.
        </p>
      </header>

      <div className={styles.grid}>
        {products.map((product) => (
          <article key={product.id} className={styles.card}>
            <h2 className={styles.cardTitle}>{product.name}</h2>
            <p className={styles.price}>{product.price} грн</p>
            <Link href={`/product/${product.id}`} className={styles.link}>
              Відкрити товар
            </Link>
          </article>
        ))}
      </div>
    </Container>
  );
}
