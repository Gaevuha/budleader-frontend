"use client";

import { Package, Trash2, Edit2, Plus } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/UI/Button/Button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { apiClient } from "@/services/apiClient";
import type { AppProduct } from "@/types/app";
import { PRODUCT_PLACEHOLDER_SRC, resolveMediaUrl } from "@/utils/media";
import styles from "./Products.module.css";

export const Products = () => {
  const [products, setProducts] = useState<AppProduct[]>([]);

  const handleDeleteProduct = async (id: string) => {
    try {
      await apiClient.delete(`/api/products/${id}`);
      setProducts((prev) => prev.filter((item) => item.id !== id));
      toast.success("Товар видалено");
    } catch {
      toast.error("Не вдалося видалити товар");
    }
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await apiClient.get("/api/products", {
          params: { page: 1, limit: 250 },
        });

        const payload = response.data as
          | { products?: unknown[]; data?: { products?: unknown[] } }
          | unknown[];

        const rawProducts = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.products)
          ? payload.products
          : Array.isArray(payload.data?.products)
          ? payload.data.products
          : [];

        setProducts(
          rawProducts
            .map((item) => {
              if (!item || typeof item !== "object") {
                return null;
              }

              const raw = item as {
                id?: string;
                _id?: string;
                name?: string;
                image?: string;
                mainImage?: string;
                categoryName?: string;
                category?: { name?: string } | string;
                brand?: string;
                price?: number;
                stock?: number;
                isNew?: boolean;
                isSale?: boolean;
              };

              const id = raw.id ?? raw._id;
              const name = raw.name;

              if (!id || !name) {
                return null;
              }

              return {
                ...raw,
                id,
                name,
                image: resolveMediaUrl(
                  raw.image ?? raw.mainImage ?? PRODUCT_PLACEHOLDER_SRC
                ),
                category:
                  raw.categoryName ??
                  (typeof raw.category === "string"
                    ? raw.category
                    : raw.category?.name) ??
                  "Загальна",
                categoryName:
                  raw.categoryName ??
                  (typeof raw.category === "string"
                    ? raw.category
                    : raw.category?.name),
                brand: raw.brand ?? "Budleader",
                price: raw.price ?? 0,
                inStock: (raw.stock ?? 0) > 0,
                stock: raw.stock,
                isNew: raw.isNew,
                isSale: raw.isSale,
              } as AppProduct;
            })
            .filter((value): value is AppProduct => value !== null)
        );
      } catch {
        setProducts([]);
      }
    };

    void loadProducts();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <Package size={24} color="var(--primary)" />
          <h2 className={styles.title}>Управління товарами</h2>
        </div>
        <Button size="sm">
          <Plus size={16} style={{ marginRight: 8 }} /> Додати товар
        </Button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Фото</th>
              <th className={styles.th}>Назва</th>
              <th className={styles.th}>Категорія</th>
              <th className={styles.th}>Бренд</th>
              <th className={styles.th}>Ціна</th>
              <th className={styles.th}>Статус</th>
              <th className={styles.th}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <motion.tr
                key={product.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <td className={styles.td}>
                  <Image
                    src={product.image}
                    alt={product.name}
                    className={styles.productImg}
                    width={48}
                    height={48}
                    unoptimized
                  />
                </td>
                <td className={styles.td} style={{ fontWeight: 500 }}>
                  {product.name}
                </td>
                <td className={styles.td}>{product.category}</td>
                <td className={styles.td}>{product.brand}</td>
                <td className={styles.td}>{product.price} ₴</td>
                <td className={styles.td}>
                  <span
                    className={
                      product.inStock
                        ? styles.statusInStock
                        : styles.statusOutOfStock
                    }
                  >
                    {product.inStock ? "В наявності" : "Немає"}
                  </span>
                </td>
                <td className={styles.td}>
                  <div className={styles.actions}>
                    <button className={styles.actionBtn}>
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => void handleDeleteProduct(product.id)}
                      className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Products;
