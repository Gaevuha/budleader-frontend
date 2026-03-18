import "server-only";

import axios, { type AxiosInstance } from "axios";
import { cookies, headers } from "next/headers";
import type { ApiResponse, Pagination } from "@/types/api";
import type { Category, CategoriesData } from "@/types/category";
import type { Product } from "@/types/product";
import { normalizeProductCore } from "@/services/api";

const DEFAULT_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const PROXY_PREFIX = "/api/proxy";
const SERVER_TIMEOUT_MS = 15_000;

interface ProductEnvelope {
  products?: Product[];
  product?: Product;
  pagination?: Pagination;
}

const normalizePagination = (value: unknown): Pagination | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const page = Number(raw.page ?? raw.currentPage);
  const limit = Number(raw.limit ?? raw.itemsPerPage);
  const total = Number(raw.total ?? raw.totalItems);
  const totalPages = Number(raw.totalPages);

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

type RawProduct = Product & {
  _id?: string;
  mainImage?: string;
  category?: { name?: string; _id?: string } | string;
};

const resolveServerOrigin = async (): Promise<string> => {
  const incomingHeaders = await headers();
  const host =
    incomingHeaders.get("x-forwarded-host") ?? incomingHeaders.get("host");
  const protocol = incomingHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return DEFAULT_APP_URL;
  }

  return `${protocol}://${host}`;
};

export const createApiServer = async (): Promise<AxiosInstance> => {
  const origin = await resolveServerOrigin();
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const instance = axios.create({
    baseURL: `${origin}${PROXY_PREFIX}`,
    timeout: SERVER_TIMEOUT_MS,
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (process.env.NODE_ENV !== "production") {
        const candidate = error as {
          response?: { status?: number; data?: unknown };
          message?: string;
          config?: { url?: string; method?: string };
        };

        console.error("[apiServer] request failed", {
          method: candidate.config?.method,
          url: candidate.config?.url,
          status: candidate.response?.status,
          data: candidate.response?.data,
          message: candidate.message,
        });
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

const normalizeProductsPayload = (
  payload: unknown
): { products: Product[]; pagination: Pagination | null } => {
  const candidate = payload as
    | ProductEnvelope
    | ApiResponse<ProductEnvelope>
    | { data?: ProductEnvelope };

  if (
    payload &&
    typeof payload === "object" &&
    "data" in (payload as Record<string, unknown>)
  ) {
    const nested = (candidate as { data?: ProductEnvelope }).data;
    if (nested && Array.isArray(nested.products)) {
      return {
        products: nested.products,
        pagination: normalizePagination(nested.pagination),
      };
    }
  }

  if (Array.isArray((candidate as ProductEnvelope).products)) {
    return {
      products: (candidate as ProductEnvelope).products ?? [],
      pagination: normalizePagination((candidate as ProductEnvelope).pagination),
    };
  }

  return {
    products: [],
    pagination: null,
  };
};

const normalizeProductRecord = (product: RawProduct): Product => {
  return (
    normalizeProductCore(product) ?? {
      ...product,
      id: product.id ?? product._id ?? "",
      image: product.image ?? product.mainImage,
    }
  );
};

const normalizeProductPayload = (payload: unknown): Product | null => {
  const candidate = payload as
    | ProductEnvelope
    | ApiResponse<ProductEnvelope>
    | { data?: ProductEnvelope | Product };

  if (
    payload &&
    typeof payload === "object" &&
    "data" in (payload as Record<string, unknown>)
  ) {
    const nested = (candidate as { data?: ProductEnvelope | Product }).data;
    if (
      nested &&
      typeof nested === "object" &&
      !Array.isArray(nested) &&
      "product" in (nested as Record<string, unknown>)
    ) {
      const withProduct = nested as { product?: Product };

      if (withProduct.product) {
        return withProduct.product;
      }
    }

    if (
      nested &&
      typeof nested === "object" &&
      !Array.isArray(nested) &&
      "id" in (nested as Record<string, unknown>)
    ) {
      return nested as Product;
    }

    if (
      nested &&
      typeof nested === "object" &&
      !Array.isArray(nested) &&
      "_id" in (nested as Record<string, unknown>)
    ) {
      return nested as Product;
    }
  }

  if ((candidate as ProductEnvelope).product) {
    return (candidate as ProductEnvelope).product ?? null;
  }

  return null;
};

const normalizeProductsResult = (
  value: ReturnType<typeof normalizeProductsPayload>
): ReturnType<typeof normalizeProductsPayload> => {
  return {
    ...value,
    products: value.products.map((product) =>
      normalizeProductRecord(product as RawProduct)
    ),
  };
};

const normalizeCategories = (raw: unknown): Category[] => {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const candidate = raw as
    | CategoriesData
    | Category[]
    | { data?: CategoriesData | Category[] };

  const mapCategory = (item: unknown): Category | null => {
    if (!item || typeof item !== "object") {
      return null;
    }

    const rawCategory = item as {
      id?: string;
      _id?: string;
      slug?: string;
      name?: string;
      subcategories?: unknown[];
      productCount?: number;
    };

    const id = rawCategory.id ?? rawCategory._id;
    const name = rawCategory.name;

    if (!id || !name) {
      return null;
    }

    return {
      id,
      name,
      slug: rawCategory.slug,
      subcategories: Array.isArray(rawCategory.subcategories)
        ? (rawCategory.subcategories as Category["subcategories"])
        : [],
      productsCount: rawCategory.productCount,
    };
  };

  if (Array.isArray(candidate)) {
    return candidate
      .map(mapCategory)
      .filter((value): value is Category => value !== null);
  }

  if ("categories" in candidate && Array.isArray(candidate.categories)) {
    return candidate.categories
      .map(mapCategory)
      .filter((value): value is Category => value !== null);
  }

  if ("data" in candidate && Array.isArray(candidate.data)) {
    return candidate.data
      .map(mapCategory)
      .filter((value): value is Category => value !== null);
  }

  if (
    "data" in candidate &&
    candidate.data &&
    !Array.isArray(candidate.data) &&
    Array.isArray(candidate.data.categories)
  ) {
    return candidate.data.categories
      .map(mapCategory)
      .filter((value): value is Category => value !== null);
  }

  return [];
};

export async function getProductsSSR(params?: {
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  isNew?: boolean;
  isSale?: boolean;
  sort?: string;
  order?: "asc" | "desc" | string;
  search?: string;
}): Promise<{ products: Product[]; pagination: Pagination | null }> {
  const serverApi = await createApiServer();

  // Remap to backend field names
  const { isNew, isSale, ...rest } = params ?? {};
  const queryParams = {
    ...rest,
    ...(isNew ? { isNewProduct: "true" } : {}),
    ...(isSale ? { isOnSale: "true" } : {}),
  };

  const response = await serverApi.get<
    ApiResponse<ProductEnvelope> | ProductEnvelope
  >("api/products", { params: queryParams });

  return normalizeProductsResult(normalizeProductsPayload(response.data));
}

export async function getProductByIdSSR(id: string): Promise<Product | null> {
  const serverApi = await createApiServer();
  const response = await serverApi.get<
    ApiResponse<ProductEnvelope> | ProductEnvelope
  >(`api/products/${id}`);

  const product = normalizeProductPayload(response.data);
  if (!product) {
    return null;
  }

  return normalizeProductRecord(product as RawProduct);
}

export async function getCategories(): Promise<Category[]> {
  try {
    const serverApi = await createApiServer();
    const response = await serverApi.get<
      ApiResponse<CategoriesData> | CategoriesData | Category[]
    >("api/categories");

    return normalizeCategories(response.data);
  } catch {
    return [];
  }
}
