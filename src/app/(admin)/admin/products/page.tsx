"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { Package, Trash2, Edit2, Plus } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { toast } from "@/components/UI/notifications/toast";

import { Button } from "@/components/UI/Button/Button";
import { FormInput } from "@/components/UI/FormInput/FormInput";
import { Modal } from "@/components/UI/Modal/Modal";
import { useDebounce } from "@/hooks/useDebounce";
import { apiClient } from "@/services/apiClient";
import type { Pagination } from "@/types/api";
import type { AppProduct } from "@/types/app";
import type { Category } from "@/types/category";
import { PRODUCT_PLACEHOLDER_SRC, resolveMediaUrl } from "@/utils/media";
import styles from "./Products.module.css";

type AdminProduct = AppProduct & {
  description?: string;
  stock?: number;
  oldPrice?: number;
  categoryId?: string;
};

type ProductFormState = {
  name: string;
  description: string;
  price: string;
  oldPrice: string;
  brand: string;
  category: string;
  stock: string;
  isNew: boolean;
  isSale: boolean;
};

type BooleanFilter = "all" | "yes" | "no";
const PRODUCTS_PER_PAGE = 12;

const EMPTY_PRODUCT_FORM: ProductFormState = {
  name: "",
  description: "",
  price: "",
  oldPrice: "",
  brand: "Budleader",
  category: "",
  stock: "0",
  isNew: false,
  isSale: false,
};

const normalizeProducts = (raw: unknown): AdminProduct[] => {
  const payload = raw as
    | { products?: unknown[]; data?: { products?: unknown[] } }
    | unknown[];

  const rawProducts = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.products)
    ? payload.products
    : Array.isArray(payload.data?.products)
    ? payload.data.products
    : [];

  return rawProducts
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const raw = item as {
        id?: string;
        _id?: string;
        name?: string;
        description?: string;
        image?: string;
        mainImage?: string;
        categoryId?: string;
        category?: { _id?: string; name?: string } | string;
        categoryName?: string;
        brand?: string;
        price?: number;
        oldPrice?: number;
        stock?: number;
        isNew?: boolean;
        isNewProduct?: boolean;
        isSale?: boolean;
        isOnSale?: boolean;
      };

      const id = raw.id ?? raw._id;
      const name = raw.name;

      if (!id || !name) {
        return null;
      }

      const categoryId =
        raw.categoryId ??
        (typeof raw.category === "object" ? raw.category?._id : undefined);

      return {
        ...raw,
        id,
        name,
        description: raw.description,
        image: resolveMediaUrl(
          raw.image ?? raw.mainImage ?? PRODUCT_PLACEHOLDER_SRC
        ),
        category:
          raw.categoryName ??
          (typeof raw.category === "string"
            ? raw.category
            : raw.category?.name) ??
          "Загальна",
        categoryId,
        categoryName:
          raw.categoryName ??
          (typeof raw.category === "string"
            ? raw.category
            : raw.category?.name),
        brand: raw.brand ?? "Budleader",
        price: raw.price ?? 0,
        oldPrice: raw.oldPrice,
        inStock: (raw.stock ?? 0) > 0,
        stock: raw.stock,
        isNew: raw.isNew ?? raw.isNewProduct,
        isSale: raw.isSale ?? raw.isOnSale,
      } as AdminProduct;
    })
    .filter((value): value is AdminProduct => value !== null);
};

const normalizeProduct = (raw: unknown): AdminProduct | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const payload = raw as { data?: unknown };
  return normalizeProducts([payload.data ?? raw])[0] ?? null;
};

const normalizeCategoryOptions = (raw: unknown): Category[] => {
  const payload = raw as
    | { categories?: unknown[]; data?: { categories?: unknown[] } | unknown[] }
    | unknown[];

  const nestedData =
    payload && typeof payload === "object" && "data" in payload
      ? payload.data
      : null;

  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.categories)
    ? payload.categories
    : nestedData &&
      typeof nestedData === "object" &&
      Array.isArray((nestedData as { categories?: unknown[] }).categories)
    ? (nestedData as { categories: unknown[] }).categories
    : Array.isArray(nestedData)
    ? nestedData
    : [];

  const categoryOptions: Category[] = [];
  const seen = new Set<string>();

  const pushCategoryOption = (
    id: string | undefined,
    name: string | undefined
  ) => {
    if (!id || !name) {
      return;
    }

    const key = `${id}::${name}`.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    categoryOptions.push({ id, name });
  };

  for (const item of rows) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const row = item as {
      id?: string;
      _id?: string;
      name?: string;
      title?: string;
      slug?: string;
      groups?: Array<{ links?: unknown[] }>;
      subcategories?: unknown[];
      subCategories?: unknown[];
      children?: unknown[];
    };

    pushCategoryOption(row.id ?? row._id, row.name ?? row.title);

    const nestedItems = Array.isArray(row.groups)
      ? row.groups.flatMap((group) => group.links ?? [])
      : Array.isArray(row.subcategories)
      ? row.subcategories
      : Array.isArray(row.subCategories)
      ? row.subCategories
      : Array.isArray(row.children)
      ? row.children
      : [];

    for (const nestedItem of nestedItems) {
      if (!nestedItem || typeof nestedItem !== "object") {
        continue;
      }

      const nestedRow = nestedItem as {
        id?: string;
        _id?: string;
        name?: string;
        title?: string;
      };

      pushCategoryOption(
        nestedRow.id ?? nestedRow._id,
        nestedRow.name ?? nestedRow.title
      );
    }
  }

  return categoryOptions;
};

const normalizePagination = (raw: unknown): Pagination | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const payload = raw as {
    pagination?: unknown;
    data?: {
      pagination?: unknown;
      page?: number;
      currentPage?: number;
      limit?: number;
      itemsPerPage?: number;
      total?: number;
      totalItems?: number;
      totalPages?: number;
    };
  };

  const candidate =
    payload.pagination && typeof payload.pagination === "object"
      ? (payload.pagination as Record<string, unknown>)
      : payload.data?.pagination && typeof payload.data.pagination === "object"
      ? (payload.data.pagination as Record<string, unknown>)
      : payload.data
      ? {
          page: payload.data.page ?? payload.data.currentPage,
          limit: payload.data.limit ?? payload.data.itemsPerPage,
          total: payload.data.total ?? payload.data.totalItems,
          totalPages: payload.data.totalPages,
        }
      : null;

  if (!candidate) {
    return null;
  }

  const page = Number(candidate.page ?? candidate.currentPage);
  const limit = Number(candidate.limit ?? candidate.itemsPerPage);
  const total = Number(candidate.total ?? candidate.totalItems);
  const totalPages = Number(candidate.totalPages);

  if (
    !Number.isFinite(page) ||
    !Number.isFinite(limit) ||
    !Number.isFinite(total) ||
    !Number.isFinite(totalPages)
  ) {
    return null;
  }

  return { page, limit, total, totalPages };
};

const resolveProductCategoryName = (
  product: Pick<AdminProduct, "category" | "categoryId" | "categoryName">,
  categories: Category[]
): string => {
  const categoryFromDb = product.categoryId
    ? categories.find((category) => category.id === product.categoryId)?.name
    : undefined;

  return (
    categoryFromDb ?? product.categoryName ?? product.category ?? "Загальна"
  );
};

const buildProductFormData = (formState: ProductFormState) => {
  const formData = new FormData();

  formData.set("name", formState.name.trim());
  formData.set("description", formState.description.trim());
  formData.set("price", formState.price);
  if (formState.oldPrice.trim()) {
    formData.set("oldPrice", formState.oldPrice);
  }
  formData.set("brand", formState.brand.trim());
  formData.set("category", formState.category);
  formData.set("stock", formState.stock || "0");
  formData.set("isNew", String(formState.isNew));
  formData.set("isNewProduct", String(formState.isNew));
  formData.set("isSale", String(formState.isSale));
  formData.set("isOnSale", String(formState.isSale));

  return formData;
};

const buildOptimisticProduct = (
  product: AdminProduct,
  nextFormState: ProductFormState,
  categories: Category[]
): AdminProduct => {
  const stock = Number(nextFormState.stock || "0");
  const matchedCategory = categories.find(
    (category) => category.id === nextFormState.category
  );
  const price = Number(nextFormState.price);
  const oldPrice = nextFormState.oldPrice.trim()
    ? Number(nextFormState.oldPrice)
    : undefined;

  return {
    ...product,
    name: nextFormState.name,
    description: nextFormState.description,
    price: Number.isFinite(price) ? price : 0,
    oldPrice: Number.isFinite(oldPrice) ? oldPrice : undefined,
    brand: nextFormState.brand || "Budleader",
    categoryId: nextFormState.category || product.categoryId,
    categoryName: matchedCategory?.name ?? product.categoryName,
    category: matchedCategory?.name ?? product.category,
    stock: Number.isFinite(stock) ? stock : 0,
    inStock: Number.isFinite(stock) ? stock > 0 : false,
    isNew: nextFormState.isNew,
    isSale: nextFormState.isSale,
  };
};

const logProductsError = (action: string, error: unknown) => {
  const candidate = error as {
    message?: string;
    config?: { url?: string; method?: string; params?: unknown };
    response?: { status?: number; data?: unknown };
  };

  console.error(`[admin/products] ${action} failed`, {
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

export const Products = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] =
    useState<BooleanFilter>("all");
  const [saleFilter, setSaleFilter] = useState<BooleanFilter>("all");
  const [newFilter, setNewFilter] = useState<BooleanFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [formState, setFormState] =
    useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const categoriesRef = useRef<Category[]>([]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const updateFormState = <K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormState(EMPTY_PRODUCT_FORM);
  };

  const persistProduct = async (
    nextFormState: ProductFormState,
    productId?: string
  ) => {
    if (productId) {
      return apiClient.put(
        `/api/products/${productId}`,
        buildProductFormData(nextFormState)
      );
    }

    return apiClient.post("/api/products", buildProductFormData(nextFormState));
  };

  const handleDeleteProduct = async (id: string) => {
    const shouldDelete = window.confirm(
      "Видалити цей товар? Дію неможливо скасувати."
    );

    if (!shouldDelete) {
      return;
    }

    try {
      await apiClient.delete(`/api/products/${id}`);
      const nextProducts = products.filter((item) => item.id !== id);

      setProducts(nextProducts);

      if (nextProducts.length === 0 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }

      toast.success("Товар видалено");
    } catch (error) {
      logProductsError("deleteProduct", error);
      toast.error("Не вдалося видалити товар");
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesResponse = await apiClient.get("/api/categories", {
          params: { includeInactive: true, _ts: Date.now() },
        });

        const nextCategories = normalizeCategoryOptions(
          categoriesResponse.data
        );

        setCategories(nextCategories);
        setProducts((prev) =>
          prev.map((product) => ({
            ...product,
            category: resolveProductCategoryName(product, nextCategories),
          }))
        );
      } catch (error) {
        logProductsError("loadCategories", error);
        setCategories([]);
        toast.error("Не вдалося завантажити категорії для товарів");
      }
    };

    void loadCategories();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);

      try {
        const firstResponse = await apiClient.get("/api/products", {
          params: {
            page: 1,
            limit: 100,
            _ts: Date.now(),
          },
        });

        const firstBatch = normalizeProducts(firstResponse.data);
        const pagination = normalizePagination(firstResponse.data);

        let allProducts = firstBatch;

        if (pagination && pagination.totalPages > 1) {
          const remainingResponses = await Promise.all(
            Array.from({ length: pagination.totalPages - 1 }, (_, index) =>
              apiClient.get("/api/products", {
                params: {
                  page: index + 2,
                  limit: pagination.limit || 100,
                  _ts: Date.now() + index + 1,
                },
              })
            )
          );

          allProducts = [
            ...firstBatch,
            ...remainingResponses.flatMap((response) =>
              normalizeProducts(response.data)
            ),
          ];
        }

        const normalizedProductsWithCategories = allProducts.map((product) => ({
          ...product,
          category: resolveProductCategoryName(product, categoriesRef.current),
        }));

        setProducts(normalizedProductsWithCategories);
      } catch (error) {
        logProductsError("loadProducts", error);
        setProducts([]);
        toast.error("Не вдалося завантажити товари");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProducts();
  }, [reloadKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    availabilityFilter,
    debouncedSearchTerm,
    newFilter,
    saleFilter,
    selectedCategoryFilter,
  ]);

  useEffect(() => {
    if (!isModalOpen || categories.length === 0 || formState.category) {
      return;
    }

    setFormState((prev) => ({
      ...prev,
      category: categories[0]?.id ?? "",
    }));
  }, [categories, formState.category, isModalOpen]);

  const openCreateModal = () => {
    setEditingProduct(null);
    const nextFormState = {
      ...EMPTY_PRODUCT_FORM,
      category: categories[0]?.id ?? "",
    };

    setFormState(nextFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (product: AdminProduct) => {
    const matchedCategoryId =
      product.categoryId ??
      categories.find((category) => category.name === product.category)?.id ??
      categories[0]?.id ??
      "";

    const nextFormState = {
      name: product.name,
      description: product.description ?? "",
      price: String(product.price ?? 0),
      oldPrice: product.oldPrice ? String(product.oldPrice) : "",
      brand: product.brand ?? "Budleader",
      category: matchedCategoryId,
      stock: String(product.stock ?? 0),
      isNew: Boolean(product.isNew),
      isSale: Boolean(product.isSale),
    };

    setEditingProduct(product);
    setFormState(nextFormState);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!formState.category) {
      toast.error("Обери категорію товару");
      return;
    }

    if (formState.description.trim().length < 10) {
      toast.error("Опис товару має містити щонайменше 10 символів");
      return;
    }

    setIsSaving(true);

    const previousProducts = products;
    const previousEditingProduct = editingProduct;

    if (editingProduct) {
      const optimisticProduct = buildOptimisticProduct(
        editingProduct,
        formState,
        categoriesRef.current
      );

      setEditingProduct(optimisticProduct);
      setProducts((prev) =>
        prev.map((item) =>
          item.id === optimisticProduct.id ? optimisticProduct : item
        )
      );
    }

    try {
      const response = editingProduct
        ? await persistProduct(formState, editingProduct.id)
        : await persistProduct(formState);

      const nextProduct = normalizeProduct(response.data);

      if (nextProduct) {
        const resolvedNextProduct = editingProduct
          ? buildOptimisticProduct(nextProduct, formState, categories)
          : {
              ...nextProduct,
              category: resolveProductCategoryName(nextProduct, categories),
            };

        if (editingProduct) {
          setEditingProduct(resolvedNextProduct);
        }

        setProducts((prev) => {
          if (editingProduct) {
            return prev.map((item) =>
              item.id === editingProduct.id ? resolvedNextProduct : item
            );
          }

          return [resolvedNextProduct, ...prev];
        });
      }

      if (!editingProduct && currentPage !== 1) {
        setCurrentPage(1);
      } else if (!editingProduct) {
        setReloadKey((prev) => prev + 1);
      }

      if (editingProduct) {
        toast.success("Товар оновлено");
        closeModal();
      } else {
        toast.success("Товар створено");
        closeModal();
      }
    } catch (error) {
      logProductsError(
        editingProduct ? "updateProduct" : "createProduct",
        error
      );
      if (editingProduct) {
        setProducts(previousProducts);
        setEditingProduct(previousEditingProduct);
      }
      toast.error(
        editingProduct
          ? "Не вдалося оновити товар"
          : "Не вдалося створити товар"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();
  const selectedCategoryName =
    selectedCategoryFilter === "all"
      ? null
      : categories.find((category) => category.id === selectedCategoryFilter)
          ?.name ?? null;
  const filteredProducts = products.filter((product) => {
    const resolvedCategoryName = resolveProductCategoryName(
      product,
      categories
    );
    const matchesSearch =
      normalizedSearch.length === 0 ||
      product.name.toLowerCase().includes(normalizedSearch);
    const matchesCategory =
      selectedCategoryFilter === "all" ||
      product.categoryId === selectedCategoryFilter ||
      (selectedCategoryName !== null &&
        resolvedCategoryName === selectedCategoryName);
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "yes" && Boolean(product.inStock)) ||
      (availabilityFilter === "no" && !product.inStock);
    const matchesSale =
      saleFilter === "all" ||
      (saleFilter === "yes" && Boolean(product.isSale)) ||
      (saleFilter === "no" && !product.isSale);
    const matchesNew =
      newFilter === "all" ||
      (newFilter === "yes" && Boolean(product.isNew)) ||
      (newFilter === "no" && !product.isNew);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesAvailability &&
      matchesSale &&
      matchesNew
    );
  });
  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE)
  );
  const hasActiveFilters =
    debouncedSearchTerm.trim().length > 0 ||
    selectedCategoryFilter !== "all" ||
    availabilityFilter !== "all" ||
    saleFilter !== "all" ||
    newFilter !== "all";
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );
  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  ).filter((page) => {
    if (totalPages <= 7) {
      return true;
    }

    return (
      page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
    );
  });

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCategoryFilter("all");
    setAvailabilityFilter("all");
    setSaleFilter("all");
    setNewFilter("all");
    setCurrentPage(1);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <Package size={24} color="var(--primary)" />
          <h2 className={styles.title}>Управління товарами</h2>
        </div>
        <Button size="sm" onClick={openCreateModal}>
          <Plus size={16} style={{ marginRight: 8 }} /> Додати товар
        </Button>
      </div>

      <div className={styles.filtersBar}>
        <div className={styles.searchField}>
          <label className={styles.filterLabel} htmlFor="products-search">
            Назва товару
          </label>
          <input
            id="products-search"
            className={styles.filterInput}
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Пошук за назвою"
          />
        </div>

        <div className={styles.selectField}>
          <label
            className={styles.filterLabel}
            htmlFor="products-category-filter"
          >
            Категорія
          </label>
          <select
            id="products-category-filter"
            className={styles.filterSelect}
            value={selectedCategoryFilter}
            onChange={(event) => setSelectedCategoryFilter(event.target.value)}
          >
            <option value="all">Усі категорії</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.selectField}>
          <label
            className={styles.filterLabel}
            htmlFor="products-availability-filter"
          >
            Наявність
          </label>
          <select
            id="products-availability-filter"
            className={styles.filterSelect}
            value={availabilityFilter}
            onChange={(event) =>
              setAvailabilityFilter(event.target.value as BooleanFilter)
            }
          >
            <option value="all">Всі</option>
            <option value="yes">В наявності</option>
            <option value="no">Немає в наявності</option>
          </select>
        </div>

        <div className={styles.selectField}>
          <label className={styles.filterLabel} htmlFor="products-sale-filter">
            Акції
          </label>
          <select
            id="products-sale-filter"
            className={styles.filterSelect}
            value={saleFilter}
            onChange={(event) =>
              setSaleFilter(event.target.value as BooleanFilter)
            }
          >
            <option value="all">Всі</option>
            <option value="yes">Лише акції</option>
            <option value="no">Без акції</option>
          </select>
        </div>

        <div className={styles.selectField}>
          <label className={styles.filterLabel} htmlFor="products-new-filter">
            Новинки
          </label>
          <select
            id="products-new-filter"
            className={styles.filterSelect}
            value={newFilter}
            onChange={(event) =>
              setNewFilter(event.target.value as BooleanFilter)
            }
          >
            <option value="all">Всі</option>
            <option value="yes">Лише новинки</option>
            <option value="no">Не новинки</option>
          </select>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
        >
          Скинути фільтри
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
              <th className={styles.th}>Наявність</th>
              <th className={styles.th}>Акція</th>
              <th className={styles.th}>Новинка</th>
              <th className={styles.th}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className={styles.td} colSpan={9}>
                  <div className={styles.emptyState}>
                    Завантаження товарів...
                  </div>
                </td>
              </tr>
            ) : paginatedProducts.length === 0 ? (
              <tr>
                <td className={styles.td} colSpan={9}>
                  <div className={styles.emptyState}>Товари не знайдено</div>
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product) => (
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
                  <td className={styles.td}>
                    {resolveProductCategoryName(product, categories)}
                  </td>
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
                      {product.inStock ? "Наявний" : "Немає в наявності"}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span
                      className={
                        product.isSale
                          ? styles.statusSale
                          : styles.statusNeutral
                      }
                    >
                      {product.isSale ? "Акція" : "Ні"}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span
                      className={
                        product.isNew ? styles.statusNew : styles.statusNeutral
                      }
                    >
                      {product.isNew ? "Новинка" : "Ні"}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => openEditModal(product)}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteProduct(product.id)}
                        className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.paginationBar}>
        <div className={styles.paginationMeta}>
          <span>
            Сторінка {currentPage} з {totalPages}. Усього товарів:{" "}
            {filteredProducts.length}
          </span>
        </div>
        <div className={styles.paginationControls}>
          <button
            type="button"
            className={styles.paginationButton}
            disabled={currentPage <= 1 || isLoading}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            Назад
          </button>
          {pageNumbers.map((page, index) => {
            const previousPage = pageNumbers[index - 1];
            const showGap = previousPage && page - previousPage > 1;

            return (
              <div key={page} className={styles.paginationItemWrap}>
                {showGap ? (
                  <span className={styles.paginationGap}>...</span>
                ) : null}
                <button
                  type="button"
                  className={`${styles.paginationButton} ${
                    page === currentPage ? styles.paginationButtonActive : ""
                  }`}
                  onClick={() => setCurrentPage(page)}
                  disabled={isLoading}
                >
                  {page}
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className={styles.paginationButton}
            disabled={currentPage >= totalPages || isLoading}
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
          >
            Далі
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProduct ? "Редагування товару" : "Новий товар"}
      >
        <form className={styles.form} onSubmit={handleSaveProduct}>
          <FormInput
            label="Назва"
            value={formState.name}
            onChange={(e) => updateFormState("name", e.target.value)}
            required
          />
          <label className={styles.fieldGroup}>
            <span className={styles.label}>Опис</span>
            <textarea
              className={styles.textarea}
              value={formState.description}
              onChange={(e) => updateFormState("description", e.target.value)}
              rows={5}
              required
            />
          </label>
          <div className={styles.formRow}>
            <FormInput
              label="Ціна"
              type="number"
              min="0"
              step="0.01"
              value={formState.price}
              onChange={(e) => updateFormState("price", e.target.value)}
              required
            />
            <FormInput
              label="Стара ціна"
              type="number"
              min="0"
              step="0.01"
              value={formState.oldPrice}
              onChange={(e) => updateFormState("oldPrice", e.target.value)}
            />
          </div>
          <div className={styles.formRow}>
            <FormInput
              label="Бренд"
              value={formState.brand}
              onChange={(e) => updateFormState("brand", e.target.value)}
              required
            />
            <FormInput
              label="Залишок"
              type="number"
              min="0"
              value={formState.stock}
              onChange={(e) => updateFormState("stock", e.target.value)}
            />
          </div>
          <label className={styles.fieldGroup}>
            <span className={styles.label}>Категорія</span>
            <select
              className={styles.select}
              value={formState.category}
              onChange={(e) => updateFormState("category", e.target.value)}
              required
            >
              <option value="">Оберіть категорію</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={formState.isNew}
              onChange={(e) => updateFormState("isNew", e.target.checked)}
            />
            <span>Позначити як новий товар</span>
          </label>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={formState.isSale}
              onChange={(e) => updateFormState("isSale", e.target.checked)}
            />
            <span>Позначити як акційний товар</span>
          </label>
          <div className={styles.modalActions}>
            <Button type="button" variant="secondary" onClick={closeModal}>
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
};

export default Products;
