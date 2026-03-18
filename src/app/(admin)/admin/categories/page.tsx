"use client";

import { useEffect, useState } from "react";
import { Layers, Edit2, Trash2 } from "lucide-react";

import { apiClient as api } from "@/services/apiClient";
import type { ApiResponse } from "@/types/api";
import type { Category, CategoriesData } from "@/types/category";
import styles from "./Categories.module.css";

const normalizeCategories = (raw: unknown): Category[] => {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const candidate = raw as
    | CategoriesData
    | Category[]
    | { data?: CategoriesData };

  if (Array.isArray(candidate)) {
    return candidate;
  }

  if ("categories" in candidate && Array.isArray(candidate.categories)) {
    return candidate.categories;
  }

  if (
    "data" in candidate &&
    candidate.data &&
    Array.isArray(candidate.data.categories)
  ) {
    return candidate.data.categories;
  }

  return [];
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await api.get<
          ApiResponse<CategoriesData> | CategoriesData | Category[]
        >("/api/categories");

        setCategories(normalizeCategories(response.data));
      } catch {
        setCategories([]);
      }
    };

    void loadCategories();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Layers size={28} color="var(--primary)" />
        <h2 className={styles.title}>Категорії</h2>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>Назва</th>
              <th className={styles.th}>Кількість товарів</th>
              <th className={styles.th}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td className={styles.td}>#{cat.id}</td>
                <td className={styles.td}>{cat.name}</td>
                <td className={styles.td}>{cat.productsCount ?? 0}</td>
                <td className={styles.td}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className={styles.actionBtn}>
                      <Edit2 size={16} />
                    </button>
                    <button
                      className={styles.actionBtn}
                      style={{ color: "var(--danger)" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
