"use client";

import { useState } from "react";
import { CreditCard, Headphones, ShieldCheck, Truck } from "lucide-react";

import { Container } from "@/components/layout/Container/Container";
import type { AppProduct } from "@/types/app";
import type { Category } from "@/types/category";
import type { FeatureItem } from "@/types/content";
import styles from "@/app/page.module.css";
import { Hero } from "../hero/Hero";
import { CategoriesList } from "./CategoriesList";

interface HomeClientProps {
  initialCategories: Category[];
  initialPopularProducts: AppProduct[];
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

export function HomeClient({
  initialCategories,
  initialPopularProducts,
}: HomeClientProps) {
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);

  return (
    <>
      <section className={styles.heroSection}>
        <Container>
          <div className={styles.heroGrid}>
            <div className={styles.catalogContainer}>
              <div
                onMouseEnter={() => setIsCatalogExpanded(true)}
                onMouseLeave={() => setIsCatalogExpanded(false)}
              >
                <CategoriesList
                  categories={initialCategories}
                  products={initialPopularProducts}
                  isExpanded={isCatalogExpanded}
                />
              </div>
            </div>

            <div className={styles.heroBannerWrapper}>
              <Hero />
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
