"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Layers, Edit2, Trash2 } from "lucide-react";
import { toast } from "@/components/UI/notifications/toast";

import { Button } from "@/components/UI/Button/Button";
import { FormInput } from "@/components/UI/FormInput/FormInput";
import { Modal } from "@/components/UI/Modal/Modal";
import { apiClient as api } from "@/services/apiClient";
import type { ApiResponse } from "@/types/api";
import type { Category, CategoriesData } from "@/types/category";
import styles from "./Categories.module.css";

type AdminCategory = Category & {
  description?: string;
  icon?: string;
  order?: number;
  priority?: number;
  isActive?: boolean;
  isPopular?: boolean;
};

type CategoryFormState = {
  name: string;
  description: string;
  icon: string;
  order: string;
  priority: string;
  isActive: boolean;
  isPopular: boolean;
};

const EMPTY_CATEGORY_FORM: CategoryFormState = {
  name: "",
  description: "",
  icon: "📁",
  order: "0",
  priority: "50",
  isActive: true,
  isPopular: false,
};

const normalizeCategories = (raw: unknown): AdminCategory[] => {
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

  const normalizedRows: AdminCategory[] = [];

  for (const item of rows) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const record = item as {
      id?: string;
      _id?: string;
      name?: string;
      slug?: string;
      description?: string;
      icon?: string;
      order?: number;
      priority?: number;
      isActive?: boolean;
      isPopular?: boolean;
      productCount?: number;
      productsCount?: number;
    };

    const id = record.id ?? record._id;
    if (!id || !record.name) {
      continue;
    }

    normalizedRows.push({
      id,
      name: record.name,
      slug: record.slug,
      description: record.description,
      icon: record.icon,
      order: record.order,
      priority: record.priority,
      isActive: record.isActive ?? true,
      isPopular: record.isPopular ?? false,
      productsCount: record.productsCount ?? record.productCount ?? 0,
    });
  }

  return normalizedRows;
};

const normalizeCategory = (raw: unknown): AdminCategory | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const payload = raw as { data?: unknown };
  return normalizeCategories([payload.data ?? raw])[0] ?? null;
};

const logCategoriesError = (action: string, error: unknown) => {
  const candidate = error as {
    message?: string;
    config?: { url?: string; method?: string; params?: unknown };
    response?: { status?: number; data?: unknown };
  };

  console.error(`[admin/categories] ${action} failed`, {
    message:
      candidate?.message ??
      (error instanceof Error ? error.message : String(error)),
    status: candidate?.response?.status,
    url: candidate?.config?.url,
    method: candidate?.config?.method,
    params: candidate?.config?.params,
    data: candidate?.response?.data,
    error,
  });
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(
    null
  );
  const [formState, setFormState] =
    useState<CategoryFormState>(EMPTY_CATEGORY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await api.get<
          ApiResponse<CategoriesData> | CategoriesData | Category[]
        >("/api/categories", {
          params: { includeInactive: true, _ts: Date.now() },
        });

        setCategories(normalizeCategories(response.data));
      } catch (error) {
        logCategoriesError("loadCategories", error);
        setCategories([]);
        toast.error("Не вдалося завантажити категорії");
      }
    };

    void loadCategories();
  }, []);

  const updateFormState = <K extends keyof CategoryFormState>(
    key: K,
    value: CategoryFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormState(EMPTY_CATEGORY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (category: AdminCategory) => {
    setEditingCategory(category);
    setFormState({
      name: category.name,
      description: category.description ?? "",
      icon: category.icon ?? "📁",
      order: String(category.order ?? 0),
      priority: String(category.priority ?? 50),
      isActive: category.isActive ?? true,
      isPopular: category.isPopular ?? false,
    });
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.name.trim()) {
      toast.error("Вкажи назву категорії");
      return;
    }

    setIsSaving(true);

    const payload = {
      name: formState.name.trim(),
      description: formState.description.trim(),
      icon: formState.icon.trim() || "📁",
      order: Number(formState.order) || 0,
      priority: Number(formState.priority) || 50,
      isActive: formState.isActive,
      isPopular: formState.isPopular,
    };

    try {
      const response = editingCategory
        ? await api.put(`/api/categories/${editingCategory.id}`, payload)
        : await api.post("/api/categories", payload);

      const nextCategory = normalizeCategory(response.data);

      if (nextCategory) {
        setCategories((prev) => {
          if (editingCategory) {
            return prev.map((item) =>
              item.id === editingCategory.id ? nextCategory : item
            );
          }

          return [nextCategory, ...prev];
        });
      }

      toast.success(
        editingCategory ? "Категорію оновлено" : "Категорію створено"
      );
      setIsModalOpen(false);
      setEditingCategory(null);
      setFormState(EMPTY_CATEGORY_FORM);
    } catch (error) {
      logCategoriesError(
        editingCategory ? "updateCategory" : "createCategory",
        error
      );
      toast.error(
        editingCategory
          ? "Не вдалося оновити категорію"
          : "Не вдалося створити категорію"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const shouldDelete = window.confirm(
      "Видалити цю категорію? Дію неможливо скасувати."
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await api.delete(`/api/categories/${categoryId}`);
      setCategories((prev) => prev.filter((item) => item.id !== categoryId));
      toast.success("Категорію видалено");
    } catch (error) {
      logCategoriesError("deleteCategory", error);
      toast.error("Не вдалося видалити категорію");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Layers size={28} color="var(--primary)" />
          <h2 className={styles.title}>Категорії</h2>
        </div>
        <Button size="sm" onClick={openCreateModal}>
          Додати категорію
        </Button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>Назва</th>
              <th className={styles.th}>Статус</th>
              <th className={styles.th}>Кількість товарів</th>
              <th className={styles.th}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td className={styles.td}>{cat.slug ?? cat.id}</td>
                <td className={styles.td}>
                  <div className={styles.categoryCell}>
                    <span className={styles.categoryName}>
                      {cat.icon ?? "📁"} {cat.name}
                    </span>
                    {cat.description ? (
                      <span className={styles.categoryMeta}>
                        {cat.description}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className={styles.td}>
                  <span
                    className={
                      cat.isActive ? styles.statusActive : styles.statusInactive
                    }
                  >
                    {cat.isActive ? "Активна" : "Прихована"}
                  </span>
                </td>
                <td className={styles.td}>{cat.productsCount ?? 0}</td>
                <td className={styles.td}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => openEditModal(cat)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      style={{ color: "var(--danger)" }}
                      onClick={() => void handleDeleteCategory(cat.id)}
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
        }}
        title={editingCategory ? "Редагування категорії" : "Нова категорія"}
      >
        <form className={styles.form} onSubmit={handleSaveCategory}>
          <FormInput
            label="Назва"
            value={formState.name}
            onChange={(e) => updateFormState("name", e.target.value)}
            required
          />
          <div className={styles.formRow}>
            <FormInput
              label="Іконка"
              value={formState.icon}
              onChange={(e) => updateFormState("icon", e.target.value)}
            />
            <FormInput
              label="Порядок"
              type="number"
              value={formState.order}
              onChange={(e) => updateFormState("order", e.target.value)}
            />
          </div>
          <FormInput
            label="Пріоритет"
            type="number"
            value={formState.priority}
            onChange={(e) => updateFormState("priority", e.target.value)}
          />
          <label className={styles.fieldGroup}>
            <span className={styles.label}>Опис</span>
            <textarea
              className={styles.textarea}
              value={formState.description}
              onChange={(e) => updateFormState("description", e.target.value)}
              rows={4}
            />
          </label>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={formState.isActive}
              onChange={(e) => updateFormState("isActive", e.target.checked)}
            />
            <span>Категорія активна</span>
          </label>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={formState.isPopular}
              onChange={(e) => updateFormState("isPopular", e.target.checked)}
            />
            <span>Показувати як популярну</span>
          </label>
          <div className={styles.modalActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Скасувати
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Збереження..." : "Зберегти"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
