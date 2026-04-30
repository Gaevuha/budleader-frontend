"use client";

import styles from "@/components/catalog/Catalog.module.css";

interface CatalogSkeletonProps {
  cards?: number;
}

export function CatalogSkeleton({ cards = 8 }: CatalogSkeletonProps) {
  return (
    <div className={styles.skeletonWrap} aria-hidden="true">
      <div className={styles.skeletonToolbar} />
      <div className={styles.skeletonGrid}>
        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className={styles.skeletonCard} />
        ))}
      </div>
    </div>
  );
}
