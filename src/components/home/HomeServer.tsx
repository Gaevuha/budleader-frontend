import { CreditCard, Headphones, ShieldCheck, Truck } from "lucide-react";

import { Container } from "@/components/layout/Container/Container";
import { HeroServer } from "@/components/hero/HeroServer";
import type { AppProduct } from "@/types/app";
import type { Category } from "@/types/category";
import type { FeatureItem } from "@/types/content";
import styles from "@/app/page.module.css";

import { HomeClient } from "./HomeClient";

interface HomeServerProps {
  initialCategories: Category[];
  initialPopularProducts: AppProduct[];
}

interface CategoryProductLink {
  id: string;
  name: string;
}

const featureIcons = [Truck, ShieldCheck, CreditCard, Headphones];

const fallbackFeatures: FeatureItem[] = [
  {
    id: "delivery",
    title: "Швидка доставка",
    desc: "Відправка по Україні у найкоротші терміни.",
  },
  {
    id: "quality",
    title: "Гарантія якості",
    desc: "Працюємо тільки з перевіреними брендами.",
  },
  {
    id: "payment",
    title: "Зручна оплата",
    desc: "Оплата онлайн або при отриманні.",
  },
  {
    id: "support",
    title: "Підтримка 7 днів",
    desc: "Допоможемо з вибором і консультацією.",
  },
];

const pickIcon = <T,>(icons: T[], index: number): T =>
  icons[index % icons.length];

const buildFallbackSubmenu = (
  categories: Category[],
  products: AppProduct[]
): Record<string, CategoryProductLink[]> => {
  const byCategoryId: Record<string, CategoryProductLink[]> = {};

  categories.forEach((category) => {
    const target = [category.id, category.slug, category.name]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());

    const names = products
      .filter((product) => {
        const productCategory = [
          product.category,
          product.categoryName,
          (product as { category?: { name?: string } }).category?.name,
        ]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.toLowerCase());

        return productCategory.some((value) => target.includes(value));
      })
      .map((product) => ({
        id: product.id,
        name: product.name,
      }))
      .filter(
        (item, index, list) =>
          list.findIndex((entry) => entry.id === item.id) === index
      )
      .slice(0, 18);

    byCategoryId[category.id] = names;
  });

  return byCategoryId;
};

export function HomeServer({
  initialCategories,
  initialPopularProducts,
}: HomeServerProps) {
  const fallbackSubmenuByCategory = buildFallbackSubmenu(
    initialCategories,
    initialPopularProducts
  );

  return (
    <>
      <section className={styles.heroSection}>
        <Container>
          <div className={styles.heroGrid}>
            <HomeClient
              categories={initialCategories}
              fallbackSubmenuByCategory={fallbackSubmenuByCategory}
            />

            <div className={styles.heroBannerWrapper}>
              <HeroServer />
            </div>
          </div>
        </Container>
      </section>

      <section className={`${styles.features} ${styles.lastSection}`}>
        <Container>
          <ul className={styles.featuresGrid}>
            {fallbackFeatures.map((feature, index) => {
              const Icon = pickIcon(featureIcons, index);

              return (
                <li key={feature.id} className={styles.featureGridItem}>
                  <div className={styles.featureCard}>
                    <div className={styles.featureIcon}>
                      <Icon size={28} />
                    </div>
                    <div className={styles.featureText}>
                      <h3 className={styles.featureTitle}>{feature.title}</h3>
                      <p className={styles.featureDesc}>{feature.desc}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>
    </>
  );
}
