"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/services/apiClient";
import styles from "../users/Users.module.css";

type ProductOption = {
  id: string;
  name: string;
};

type AdminReview = {
  id: string;
  user: string;
  text: string;
  rating: number;
  createdAt: string;
  isApproved: boolean;
};

const normalizeProducts = (raw: unknown): ProductOption[] => {
  const payload = raw as
    | { products?: unknown[]; data?: { products?: unknown[] } }
    | unknown[];

  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.products)
    ? payload.products
    : Array.isArray(payload.data?.products)
    ? payload.data.products
    : [];

  return rows
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as { id?: string; _id?: string; name?: string };
      const id = row.id ?? row._id;
      if (!id || !row.name) {
        return null;
      }

      return { id, name: row.name };
    })
    .filter((item): item is ProductOption => item !== null);
};

const normalizeReviews = (raw: unknown): AdminReview[] => {
  const payload = raw as
    | { reviews?: unknown[]; data?: { reviews?: unknown[] } }
    | unknown[];

  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.reviews)
    ? payload.reviews
    : Array.isArray(payload.data?.reviews)
    ? payload.data.reviews
    : [];

  return rows
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as {
        id?: string;
        _id?: string;
        user?: string | { name?: string; email?: string };
        text?: string;
        comment?: string;
        rating?: number;
        createdAt?: string;
        date?: string;
        isApproved?: boolean;
      };

      const id = row.id ?? row._id;
      if (!id) {
        return null;
      }

      const userName =
        typeof row.user === "string"
          ? row.user
          : row.user?.name ?? row.user?.email ?? "Користувач";

      return {
        id,
        user: userName,
        text: row.text ?? row.comment ?? "",
        rating: Number.isFinite(row.rating) ? Number(row.rating) : 0,
        createdAt: row.createdAt ?? row.date ?? new Date().toISOString(),
        isApproved: Boolean(row.isApproved),
      };
    })
    .filter((item): item is AdminReview => item !== null);
};

export default function ReviewsPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [responseText, setResponseText] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await apiClient.get("/api/products", {
          params: { page: 1, limit: 100 },
        });

        const normalized = normalizeProducts(response.data);
        setProducts(normalized);
        if (normalized.length > 0) {
          setSelectedProductId((prev) => prev || normalized[0].id);
        }
      } catch {
        setProducts([]);
      }
    };

    void loadProducts();
  }, []);

  useEffect(() => {
    if (!selectedProductId) {
      return;
    }

    const loadReviews = async () => {
      try {
        const response = await apiClient.get(
          `/api/reviews/products/${selectedProductId}`
        );
        setReviews(normalizeReviews(response.data));
      } catch {
        setReviews([]);
      }
    };

    void loadReviews();
  }, [selectedProductId]);

  const selectedProductName = useMemo(() => {
    return products.find((item) => item.id === selectedProductId)?.name ?? "-";
  }, [products, selectedProductId]);

  const handleApprove = async (reviewId: string) => {
    try {
      await apiClient.put(`/api/reviews/admin/reviews/${reviewId}/approve`);
      setReviews((prev) =>
        prev.map((item) =>
          item.id === reviewId ? { ...item, isApproved: true } : item
        )
      );
      toast.success("Відгук схвалено");
    } catch {
      toast.error("Не вдалося схвалити відгук");
    }
  };

  const handleRespond = async (reviewId: string) => {
    const text = (responseText[reviewId] ?? "").trim();
    if (!text) {
      return;
    }

    try {
      await apiClient.post(`/api/reviews/admin/reviews/${reviewId}/response`, {
        response: text,
      });
      setResponseText((prev) => ({ ...prev, [reviewId]: "" }));
      toast.success("Відповідь надіслано");
    } catch {
      toast.error("Не вдалося надіслати відповідь");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <MessageSquare size={24} color="var(--primary)" />
        <h2 className={styles.title}>Відгуки</h2>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 8 }}>Товар</label>
        <select
          className={styles.filterSelect}
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          style={{ minWidth: 320 }}
        >
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <p style={{ marginTop: 8, color: "#64748b" }}>
          Перегляд відгуків для: <strong>{selectedProductName}</strong>
        </p>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Користувач</th>
              <th className={styles.th}>Рейтинг</th>
              <th className={styles.th}>Текст</th>
              <th className={styles.th}>Дата</th>
              <th className={styles.th}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id}>
                <td className={styles.td}>{review.user}</td>
                <td className={styles.td}>{review.rating}</td>
                <td className={styles.td}>{review.text}</td>
                <td className={styles.td}>
                  {new Date(review.createdAt).toLocaleDateString("uk-UA")}
                </td>
                <td className={styles.td}>
                  <div style={{ display: "grid", gap: 8 }}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => void handleApprove(review.id)}
                      title="Схвалити"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        value={responseText[review.id] ?? ""}
                        onChange={(e) =>
                          setResponseText((prev) => ({
                            ...prev,
                            [review.id]: e.target.value,
                          }))
                        }
                        placeholder="Відповідь"
                        style={{ minWidth: 180 }}
                      />
                      <button
                        className={styles.actionBtn}
                        onClick={() => void handleRespond(review.id)}
                        title="Відповісти"
                      >
                        <Send size={16} />
                      </button>
                    </div>
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
