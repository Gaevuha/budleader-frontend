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
const CATEGORIES_CACHE_TTL_MS = 5 * 60_000;
const PRODUCTS_CACHE_TTL_MS = 30_000;
const CATALOG_BACKOFF_MS = 15_000;

interface ProductEnvelope {
  products?: Product[];
  product?: Product;
  pagination?: Pagination;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

type ProductsSSRResult = { products: Product[]; pagination: Pagination | null };

let categoriesCache: CacheEntry<Category[]> | null = null;
let categoriesInFlight: Promise<Category[]> | null = null;
let categoriesBackoffUntil = 0;

const productsCache = new Map<string, CacheEntry<ProductsSSRResult>>();
const productsInFlight = new Map<string, Promise<ProductsSSRResult>>();
const productsBackoffUntil = new Map<string, number>();

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

const extractStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const response = (error as { response?: { status?: unknown } }).response;
  const status = Number(response?.status);

  return Number.isFinite(status) ? status : undefined;
};

const buildProductsCacheKey = (params: Record<string, unknown>): string => {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b));

  return entries.map(([key, value]) => `${key}:${String(value)}`).join("|");
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

export const createApiServer = async (options?: {
  logErrors?: boolean;
}): Promise<AxiosInstance> => {
  const logErrors = options?.logErrors ?? true;
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
      if (logErrors && process.env.NODE_ENV !== "production") {
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
      pagination: normalizePagination(
        (candidate as ProductEnvelope).pagination
      ),
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
      groups?: unknown[];
      subcategories?: unknown[];
      productCount?: number;
    };

    const id = rawCategory.id ?? rawCategory._id;
    const name = rawCategory.name;

    if (!id || !name) {
      return null;
    }

    const normalizeSubcategories = (
      value: unknown[] | undefined
    ): Category["subcategories"] => {
      if (!Array.isArray(value) || value.length === 0) {
        return [];
      }

      // Legacy/grouped shape: [{ name, links: [...] }]
      const grouped = value.filter(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          Array.isArray((entry as { links?: unknown }).links)
      ) as Array<{ name?: string; title?: string; links?: unknown[] }>;

      if (grouped.length > 0) {
        return grouped.map((group) => ({
          name: group.name ?? group.title ?? "Підкатегорії",
          links: (group.links ?? []).map((link) => {
            if (typeof link === "string") {
              return link;
            }

            if (!link || typeof link !== "object") {
              return "Підкатегорія";
            }

            const candidate = link as {
              id?: string;
              _id?: string;
              name?: string;
              title?: string;
            };

            return {
              id: candidate.id ?? candidate._id,
              _id: candidate._id,
              name: candidate.name,
              title: candidate.title,
            };
          }),
        }));
      }

      // Current backend shape: flat subcategories array
      const links = value
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }

          const subcategory = entry as {
            id?: string;
            _id?: string;
            name?: string;
            title?: string;
          };

          const id = subcategory.id ?? subcategory._id;
          const name = subcategory.name ?? subcategory.title;

          if (!id || !name) {
            return null;
          }

          return {
            id,
            _id: subcategory._id,
            name,
            title: subcategory.title,
          };
        })
        .filter(
          (
            entry
          ): entry is {
            id: string;
            _id?: string;
            name: string;
            title?: string;
          } => entry !== null
        );

      return links.length > 0 ? [{ name: "Підкатегорії", links }] : [];
    };

    return {
      id,
      name,
      slug: rawCategory.slug,
      subcategories: normalizeSubcategories(
        Array.isArray(rawCategory.groups)
          ? rawCategory.groups
          : rawCategory.subcategories
      ),
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
  // Remap to backend field names
  const { isNew, isSale, ...rest } = params ?? {};
  const queryParams = {
    ...rest,
    ...(isNew ? { isNewProduct: "true" } : {}),
    ...(isSale ? { isOnSale: "true" } : {}),
  };

  const key = buildProductsCacheKey(queryParams as Record<string, unknown>);
  const now = Date.now();

  const cached = productsCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const backoffUntil = productsBackoffUntil.get(key) ?? 0;
  if (backoffUntil > now) {
    return cached?.value ?? { products: [], pagination: null };
  }

  const inFlight = productsInFlight.get(key);
  if (inFlight) {
    return inFlight;
  }

  const serverApi = await createApiServer({ logErrors: false });

  const requestPromise: Promise<ProductsSSRResult> = (async () => {
    try {
      const response = await serverApi.get<
        ApiResponse<ProductEnvelope> | ProductEnvelope
      >("api/products", { params: queryParams });

      const normalized = normalizeProductsResult(
        normalizeProductsPayload(response.data)
      );

      productsCache.set(key, {
        value: normalized,
        expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS,
      });

      return normalized;
    } catch (error) {
      if (extractStatusCode(error) === 429) {
        productsBackoffUntil.set(key, Date.now() + CATALOG_BACKOFF_MS);
        return cached?.value ?? { products: [], pagination: null };
      }

      throw error;
    } finally {
      productsInFlight.delete(key);
    }
  })();

  productsInFlight.set(key, requestPromise);

  return requestPromise;
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
  const now = Date.now();

  if (categoriesCache && categoriesCache.expiresAt > now) {
    return categoriesCache.value;
  }

  if (categoriesBackoffUntil > now) {
    return categoriesCache?.value ?? [];
  }

  if (categoriesInFlight) {
    return categoriesInFlight;
  }

  categoriesInFlight = (async () => {
    try {
      const serverApi = await createApiServer({ logErrors: false });

      // Preferred endpoint for direct mega-menu shape: category -> groups -> links.
      try {
        const megaMenuResponse = await serverApi.get<unknown>(
          "api/categories/mega-menu"
        );
        const normalizedMegaMenu = normalizeCategories(megaMenuResponse.data);

        if (normalizedMegaMenu.length > 0) {
          categoriesCache = {
            value: normalizedMegaMenu,
            expiresAt: Date.now() + CATEGORIES_CACHE_TTL_MS,
          };
          return normalizedMegaMenu;
        }
      } catch (error) {
        // If backend is rate-limiting categories, avoid firing a second
        // immediate request to the legacy endpoint.
        if (extractStatusCode(error) === 429) {
          categoriesBackoffUntil = Date.now() + CATALOG_BACKOFF_MS;
          return categoriesCache?.value ?? [];
        }

        // Fallback to legacy categories endpoint.
      }

      const legacyResponse = await serverApi.get<
        ApiResponse<CategoriesData> | CategoriesData | Category[]
      >("api/categories");

      const normalized = normalizeCategories(legacyResponse.data);
      categoriesCache = {
        value: normalized,
        expiresAt: Date.now() + CATEGORIES_CACHE_TTL_MS,
      };

      return normalized;
    } catch (error) {
      if (extractStatusCode(error) === 429) {
        categoriesBackoffUntil = Date.now() + CATALOG_BACKOFF_MS;
      }

      return categoriesCache?.value ?? [];
    } finally {
      categoriesInFlight = null;
    }
  })();

  return categoriesInFlight;
}
