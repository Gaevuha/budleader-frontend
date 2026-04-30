import "server-only";

import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { cookies, headers } from "next/headers";

import {
  ENDPOINTS,
  extractApiPagination,
  mapApiPayloadToProducts,
  normalizeProductCore,
} from "@/services/api";
import { parseCatalogViewMode } from "@/services/catalogViewPreference";
import { parseThemeMode } from "@/services/themePreference";
import type { ApiResponse, Pagination } from "@/types/api";
import type { User } from "@/types/auth";
import type { Category, CategoriesData } from "@/types/category";
import type { Product } from "@/types/product";

const DEFAULT_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const API_TIMEOUT_MS = 15_000;
const AUTH_ENDPOINT_PREFIX = "/api/auth";
const API_PROXY_PREFIX = "/api/proxy";
const PROXY_PATH_PREFIXES = [
  "/api/products",
  "/api/categories",
  "/api/users",
  "/api/orders",
  "/api/reviews",
];

type ProductEnvelope = {
  products?: Product[];
  items?: Product[];
  product?: Product;
  pagination?: Pagination;
};

type RawProduct = Product & {
  _id?: string;
  mainImage?: string;
  category?: { name?: string; _id?: string } | string;
};

type PublicCacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const PUBLIC_CATEGORIES_CACHE_TTL_MS = 5 * 60_000;
const PUBLIC_PRODUCTS_CACHE_TTL_MS = 20_000;

const publicCategoriesCache = new Map<string, PublicCacheEntry<Category[]>>();
const publicProductsCache = new Map<
  string,
  PublicCacheEntry<{ products: Product[]; pagination: Pagination | null }>
>();
const publicCategoriesInFlight = new Map<string, Promise<Category[]>>();
const publicProductsInFlight = new Map<
  string,
  Promise<{ products: Product[]; pagination: Pagination | null }>
>();

const logPublicApiWarning = (
  scope: string,
  details: Record<string, unknown>
): void => {
  const status =
    typeof details.status === "number" ? (details.status as number) : undefined;

  if (status !== 429 && process.env.NODE_ENV === "production") {
    return;
  }

  console.warn(`[apiServer:${scope}]`, details);
};

const getFreshPublicCacheValue = <T>(
  cache: Map<string, PublicCacheEntry<T>>,
  key: string
): T | null => {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.value;
};

const getStalePublicCacheValue = <T>(
  cache: Map<string, PublicCacheEntry<T>>,
  key: string
): T | null => {
  return cache.get(key)?.value ?? null;
};

const setPublicCacheValue = <T>(
  cache: Map<string, PublicCacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number
): T => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });

  return value;
};

const stableSerializeParams = (
  params?: Record<string, string | number | boolean | undefined>
): string => {
  if (!params) {
    return "";
  }

  const normalizedEntries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  return JSON.stringify(normalizedEntries);
};

const createPublicProductsCacheKey = (params?: {
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  isNew?: boolean;
  isSale?: boolean;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  sort?: string;
  order?: "asc" | "desc" | string;
  search?: string;
}): string => {
  return stableSerializeParams({
    page: params?.page,
    limit: params?.limit,
    category: params?.category,
    brand: params?.brand,
    isNew: params?.isNew,
    isSale: params?.isSale,
    minPrice: params?.minPrice,
    maxPrice: params?.maxPrice,
    inStock: params?.inStock,
    sort: params?.sort,
    order: params?.order,
    search: params?.search,
  });
};

const isAbsoluteUrl = (url: string): boolean => {
  return /^[a-z][a-z\d+\-.]*:\/\//i.test(url);
};

const toPathname = (url: string | undefined): string => {
  if (!url) {
    return "";
  }

  if (isAbsoluteUrl(url)) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }

  return url.split("?")[0] ?? "";
};

const shouldProxyPath = (path: string): boolean => {
  return PROXY_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
};

const rewriteRequestUrl = (url: string | undefined): string | undefined => {
  if (!url || isAbsoluteUrl(url) || !url.startsWith("/")) {
    return url;
  }

  const path = toPathname(url);

  if (
    path.startsWith(API_PROXY_PREFIX) ||
    path.startsWith(AUTH_ENDPOINT_PREFIX) ||
    !shouldProxyPath(path)
  ) {
    return url;
  }

  return `${API_PROXY_PREFIX}${url}`;
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
  cookieHeader?: string;
  logErrors?: boolean;
}): Promise<AxiosInstance> => {
  const logErrors = options?.logErrors ?? true;
  const origin = await resolveServerOrigin();
  const cookieStore = await cookies();
  const cookieHeader = options?.cookieHeader ?? cookieStore.toString();

  const instance = axios.create({
    baseURL: origin,
    withCredentials: true,
    timeout: API_TIMEOUT_MS,
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (config.data instanceof FormData && config.headers) {
      delete (config.headers as Record<string, string | undefined>)[
        "Content-Type"
      ];
      delete (config.headers as Record<string, string | undefined>)[
        "content-type"
      ];
    }

    if (config.url?.startsWith("/")) {
      config.url = rewriteRequestUrl(config.url);
    }

    return config;
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

const createPublicProxyApiServer = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: DEFAULT_APP_URL,
    timeout: API_TIMEOUT_MS,
    headers: {
      Accept: "application/json",
    },
  });

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (config.url?.startsWith("/")) {
      config.url = rewriteRequestUrl(config.url);
    }

    return config;
  });

  return instance;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const normalizeUser = (
  raw: User & {
    _id?: string;
    name?: string;
    theme?: unknown;
    catalogViewMode?: unknown;
  }
): User => ({
  ...raw,
  id: raw.id ?? raw._id ?? "",
  firstName: raw.firstName ?? raw.name,
  theme: parseThemeMode(raw.theme) ?? undefined,
  catalogViewMode: parseCatalogViewMode(raw.catalogViewMode) ?? undefined,
});

const unwrapUser = (payload: unknown): User | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const candidate =
    (record.user as User | null | undefined) ??
    (record.data as User | null | undefined) ??
    (payload as User | null);

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  return normalizeUser(candidate as User & { _id?: string; name?: string });
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
  if (isRecord(payload) && "data" in payload) {
    const nested = payload.data;

    if (isRecord(nested) && "product" in nested && nested.product) {
      return nested.product as Product;
    }

    if (isRecord(nested) && ("id" in nested || "_id" in nested)) {
      return nested as unknown as Product;
    }
  }

  if (isRecord(payload) && "product" in payload && payload.product) {
    return payload.product as Product;
  }

  return null;
};

const findNestedArrayByKeys = (
  input: unknown,
  keys: string[],
  depth = 0
): unknown[] | null => {
  if (Array.isArray(input)) {
    return input;
  }

  if (!isRecord(input) || depth > 5) {
    return null;
  }

  for (const key of keys) {
    const candidate = input[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  for (const wrapperKey of ["data", "result", "payload"]) {
    if (wrapperKey in input) {
      const nested = findNestedArrayByKeys(input[wrapperKey], keys, depth + 1);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
};

const normalizeCategories = (raw: unknown): Category[] => {
  const rows = findNestedArrayByKeys(raw, ["categories", "items"]);

  if (!rows) {
    return [];
  }

  return rows
    .map<Category | null>((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const rawCategory = item as {
        id?: string;
        _id?: string;
        title?: string;
        slug?: string;
        name?: string;
        groups?: unknown[];
        subcategories?: unknown[];
        subCategories?: unknown[];
        children?: unknown[];
        productCount?: number;
        productsCount?: number;
        count?: number;
      };

      const id = rawCategory.id ?? rawCategory._id;
      const name = rawCategory.name ?? rawCategory.title;

      if (!id || !name) {
        return null;
      }

      const normalizeSubcategories = (
        value: unknown[] | undefined
      ): Category["subcategories"] => {
        if (!Array.isArray(value) || value.length === 0) {
          return [];
        }

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

            const subcategoryId = subcategory.id ?? subcategory._id;
            const subcategoryName = subcategory.name ?? subcategory.title;

            if (!subcategoryId || !subcategoryName) {
              return null;
            }

            return {
              id: subcategoryId,
              _id: subcategory._id,
              name: subcategory.name,
              title: subcategory.title,
            };
          })
          .filter((entry) => entry !== null);

        return links.length > 0 ? [{ name: "Підкатегорії", links }] : [];
      };

      const category: Category = {
        id,
        name,
        subcategories: normalizeSubcategories(
          Array.isArray(rawCategory.groups)
            ? rawCategory.groups
            : Array.isArray(rawCategory.subcategories)
            ? rawCategory.subcategories
            : Array.isArray(rawCategory.subCategories)
            ? rawCategory.subCategories
            : rawCategory.children
        ),
        productsCount:
          rawCategory.productsCount ??
          rawCategory.productCount ??
          rawCategory.count,
      };

      if (typeof rawCategory.slug === "string" && rawCategory.slug.length > 0) {
        category.slug = rawCategory.slug;
      }

      return category;
    })
    .filter((value): value is Category => value !== null);
};

const mergeCategories = (...groups: Category[][]): Category[] => {
  const merged: Category[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const category of group) {
      const key = `${category.id}::${category.name}`.toLowerCase();

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      merged.push(category);
    }
  }

  return merged;
};

export async function getUser(): Promise<User | null> {
  try {
    const serverApi = await createApiServer({ logErrors: false });
    const response = await serverApi.get(`${ENDPOINTS.AUTH}/me`);
    return unwrapUser(response.data);
  } catch {
    return null;
  }
}

export async function getProductsSSR(params?: {
  page?: number;
  limit?: number;
  category?: string;
  brand?: string;
  isNew?: boolean;
  isSale?: boolean;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  sort?: string;
  order?: "asc" | "desc" | string;
  search?: string;
}): Promise<{ products: Product[]; pagination: Pagination | null }> {
  const cacheKey = createPublicProductsCacheKey(params);
  const freshCached = getFreshPublicCacheValue(publicProductsCache, cacheKey);

  if (freshCached) {
    return freshCached;
  }

  const inFlight = publicProductsInFlight.get(cacheKey);

  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    try {
      const serverApi = createPublicProxyApiServer();
      const response = await serverApi.get<
        ApiResponse<ProductEnvelope> | ProductEnvelope
      >(ENDPOINTS.PRODUCTS, {
        params: {
          ...params,
          ...(params?.isNew ? { isNewProduct: true } : {}),
          ...(params?.isSale ? { isOnSale: true } : {}),
        },
      });

      return setPublicCacheValue(
        publicProductsCache,
        cacheKey,
        {
          products: mapApiPayloadToProducts(response.data).map((product) =>
            normalizeProductRecord(product as RawProduct)
          ),
          pagination: extractApiPagination(response.data),
        },
        PUBLIC_PRODUCTS_CACHE_TTL_MS
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logPublicApiWarning("products", {
          status: error.response?.status,
          message: error.message,
          params,
          url: error.config?.url,
          data: error.response?.data,
          cacheKey,
        });
      }

      const staleCached = getStalePublicCacheValue(
        publicProductsCache,
        cacheKey
      );

      if (staleCached) {
        return staleCached;
      }

      return { products: [], pagination: null };
    } finally {
      publicProductsInFlight.delete(cacheKey);
    }
  })();

  publicProductsInFlight.set(cacheKey, request);

  return request;
}

export async function getProductByIdSSR(id: string): Promise<Product | null> {
  try {
    const serverApi = createPublicProxyApiServer();
    const response = await serverApi.get<
      ApiResponse<ProductEnvelope> | ProductEnvelope
    >(`${ENDPOINTS.PRODUCTS}/${id}`);
    const product = normalizeProductPayload(response.data);

    return product ? normalizeProductRecord(product as RawProduct) : null;
  } catch {
    return null;
  }
}

export async function getCategories(): Promise<Category[]> {
  const cacheKey = "categories";
  const freshCached = getFreshPublicCacheValue(publicCategoriesCache, cacheKey);

  if (freshCached) {
    return freshCached;
  }

  const inFlight = publicCategoriesInFlight.get(cacheKey);

  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    try {
      const serverApi = createPublicProxyApiServer();
      try {
        const megaMenuResponse = await serverApi.get<unknown>(
          `${ENDPOINTS.CATEGORIES}/mega-menu`
        );
        const megaMenuCategories = normalizeCategories(megaMenuResponse.data);

        if (megaMenuCategories.length > 0) {
          return setPublicCacheValue(
            publicCategoriesCache,
            cacheKey,
            megaMenuCategories,
            PUBLIC_CATEGORIES_CACHE_TTL_MS
          );
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          logPublicApiWarning("categories-mega-menu", {
            status: error.response?.status,
            message: error.message,
            url: error.config?.url,
            data: error.response?.data,
          });

          if (error.response?.status === 429) {
            const staleCached = getStalePublicCacheValue(
              publicCategoriesCache,
              cacheKey
            );

            if (staleCached) {
              return staleCached;
            }

            return [];
          }
        }

        // Fall back to the legacy categories endpoint when mega-menu is unavailable.
      }

      const legacyResponse = await serverApi.get<
        ApiResponse<CategoriesData> | CategoriesData | Category[]
      >(ENDPOINTS.CATEGORIES);

      return setPublicCacheValue(
        publicCategoriesCache,
        cacheKey,
        normalizeCategories(legacyResponse.data),
        PUBLIC_CATEGORIES_CACHE_TTL_MS
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logPublicApiWarning("categories", {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
          data: error.response?.data,
        });
      }

      const staleCached = getStalePublicCacheValue(
        publicCategoriesCache,
        cacheKey
      );

      if (staleCached) {
        return staleCached;
      }

      return [];
    } finally {
      publicCategoriesInFlight.delete(cacheKey);
    }
  })();

  publicCategoriesInFlight.set(cacheKey, request);

  return request;
}
