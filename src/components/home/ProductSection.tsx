"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { AppProduct } from "@/types/app";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import styles from "@/app/page.module.css";

interface ProductSectionProps {
  title: string;
  href: string;
  products: AppProduct[];
  id?: string;
  className?: string;
}

export function ProductSection({
  title,
  href,
  products,
  id,
  className,
}: ProductSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section id={id} className={className}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <Link href={href} className={styles.viewAll}>
          Всі {title.toLowerCase()} <ArrowRight size={16} />
        </Link>
      </div>
      <ProductGrid
        products={products}
        variant="home"
        emptyTitle="Товарів не знайдено"
        emptyDescription=""
      />
    </section>
  );
}
