"use client";

import { useState } from "react";

import type { Category } from "@/types/category";
import styles from "@/app/page.module.css";
import { CategoriesList } from "./CategoriesList";

interface HomeClientProps {
  categories: Category[];
  fallbackSubmenuByCategory: Record<
    string,
    Array<{ id: string; name: string }>
  >;
}

export function HomeClient({
  categories,
  fallbackSubmenuByCategory,
}: HomeClientProps) {
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);

  return (
    <div className={styles.catalogContainer}>
      <div
        onMouseEnter={() => setIsCatalogExpanded(true)}
        onMouseLeave={() => setIsCatalogExpanded(false)}
      >
        <CategoriesList
          categories={categories}
          fallbackSubmenuByCategory={fallbackSubmenuByCategory}
          isExpanded={isCatalogExpanded}
        />
      </div>
    </div>
  );
}
