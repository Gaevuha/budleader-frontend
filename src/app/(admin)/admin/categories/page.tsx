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

  const candidate = raw as Record<string, unknown>;
  const nestedData = "data" in candidate ? candidate.data : null;

  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(candidate.categories)
    ? candidate.categories
    : nestedData &&
      typeof nestedData === "object" &&
      Array.isArray((nestedData as CategoriesData).categories)
    ? (nestedData as CategoriesData).categories
    : Array.isArray(nestedData)
    ? nestedData
    : [];

  return rows
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as {
        id?: string;
        _id?: string;
        name?: string;
        slug?: string;
        productCount?: number;
        productsCount?: number;
      };

      const id = record.id ?? record._id;
      if (!id || !record.name) {
        return null;
      }

      return {
        id,
        name: record.name,
        slug: record.slug,
        productsCount: record.productsCount ?? record.productCount ?? 0,
      } satisfies Category;
    })
    .filter((item): item is Category => item !== null);
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
