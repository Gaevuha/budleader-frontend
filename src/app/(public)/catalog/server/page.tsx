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
    <section
      className="brand-page-section"
      aria-labelledby="server-catalog-title"
    >
      <Container>
        <div className={`${styles.frame} brand-card`}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>SSR Preview</p>
            <h1 id="server-catalog-title" className={styles.title}>
              Каталог товарів
            </h1>
            <p className={styles.description}>
              Приклад серверного завантаження каталогу через proxy API з тим
              самим брендовим оформленням, що й на публічних сторінках.
            </p>
          </header>

          <section className={styles.section}>
            <ul className={styles.grid}>
              {products.map((product) => (
                <li key={product.id} className={styles.card}>
                  <h2 className={styles.cardTitle}>{product.name}</h2>
                  <p className={styles.price}>{product.price} грн</p>
                  <Link href={`/product/${product.id}`} className={styles.link}>
                    Відкрити товар
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </Container>
    </section>
  );
}
