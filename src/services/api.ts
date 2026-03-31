import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import type { ApiResponse } from "@/types/api";
import type { RefreshTokenData } from "@/types/auth";
import type { AppProduct } from "@/types/app";
import type { Product } from "@/types/product";
import { PRODUCT_PLACEHOLDER_SRC, resolveMediaUrl } from "@/utils/media";
import {
  clearAccessToken,
  clearRole,
  getAccessToken,
  setAccessToken,
} from "@/utils/token";

const normalizeApiBaseUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.replace(/\/+$/, "");
  return trimmed.replace(/\/api$/i, "");
};

export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
);
export const API_TIMEOUT_MS = 15_000;
const REFRESH_ENDPOINT = "/api/auth/refresh";
const CATALOG_BACKOFF_MS = 15_000;
const CATEGORIES_CACHE_TTL_MS = 5 * 60_000;
const PRODUCTS_CACHE_TTL_MS = 30_000;

type ApiProductCandidate = Product & {
  _id?: string;
  mainImage?: string;
  brand?: string;
  category?: { _id?: string; name?: string } | string;
  averageRating?: number | string;
  avgRating?: number | string;
  ratingAvg?: number | string;
  reviewCount?: number | string;
  characteristics?: { rating?: number | string };
  availability?: string;
  isNew?: boolean;
  isSale?: boolean;
  isNewProduct?: boolean;
  isOnSale?: boolean;
};

export const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

export const normalizeProductCore = (input: unknown): Product | null => {
  if (!input || typeof input !== "object") {
    return null;
  }

  const raw = input as ApiProductCandidate;
  const normalizedRating =
    toFiniteNumber(raw.rating) ??
    toFiniteNumber(raw.averageRating) ??
    toFiniteNumber(raw.avgRating) ??
    toFiniteNumber(raw.ratingAvg) ??
    toFiniteNumber(raw.characteristics?.rating);

  const normalizedReviewsCount =
    toFiniteNumber(raw.reviewsCount) ?? toFiniteNumber(raw.reviewCount);

  const categoryName =
    raw.categoryName ??
    (typeof raw.category === "string" ? raw.category : raw.category?.name);

  const categoryId =
    raw.categoryId ??
    (typeof raw.category === "object" ? raw.category?._id : undefined);

  return {
    ...(raw as Product),
    id: raw.id ?? raw._id ?? "",
    image: raw.image ?? raw.mainImage,
    rating:
      normalizedRating !== undefined
        ? Math.max(0, Math.min(5, normalizedRating))
        : undefined,
    reviewsCount: normalizedReviewsCount,
    categoryName,
    categoryId,
  };
};

export const mapApiProductToAppProduct = (
  input: unknown
): AppProduct | null => {
  const core = normalizeProductCore(input);

  if (!core) {
    return null;
  }

  const raw = input as ApiProductCandidate;
  const categoryName =
    core.categoryName ??
    (typeof raw.category === "string" ? raw.category : raw.category?.name) ??
    "Загальна";

  return {
    ...core,
    image: resolveMediaUrl(core.image ?? PRODUCT_PLACEHOLDER_SRC),
    category: categoryName,
    brand: raw.brand ?? "Budleader",
    inStock:
      (core.stock ?? 0) > 0 ||
      (typeof raw.availability === "string" &&
        raw.availability.toLowerCase() === "in_stock"),
    isNew: raw.isNew ?? raw.isNewProduct,
    isSale: raw.isSale ?? raw.isOnSale,
  };
};

export const extractApiProducts = (payload: unknown): unknown[] => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload !== "object") {
    return [];
  }

  const candidate = payload as {
    products?: unknown[];
    product?: unknown;
    data?: unknown;
  };

  if (Array.isArray(candidate.products)) {
    return candidate.products;
  }

  if (Array.isArray(candidate.data)) {
    return candidate.data;
  }

  if (
    candidate.data &&
    typeof candidate.data === "object" &&
    Array.isArray((candidate.data as { products?: unknown[] }).products)
  ) {
    return (candidate.data as { products?: unknown[] }).products ?? [];
  }

  if (candidate.product && typeof candidate.product === "object") {
    return [candidate.product];
  }

  return [];
};

export const mapApiPayloadToAppProducts = (payload: unknown): AppProduct[] => {
  return extractApiProducts(payload)
    .map((item) => mapApiProductToAppProduct(item))
    .filter((item): item is AppProduct => item !== null);
};

interface CachedResponse {
  expiresAt: number;
  response: AxiosResponse;
}

const getCache = new Map<string, CachedResponse>();
const getInFlight = new Map<string, Promise<AxiosResponse>>();
const endpointBackoffUntil = new Map<string, number>();

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const toPathname = (url: string | undefined): string => {
  if (!url) {
    return "";
  }

  try {
    return new URL(url, API_BASE_URL).pathname;
  } catch {
    return url.split("?")[0] ?? "";
  }
};

const isPublicEndpointPath = (path: string): boolean => {
  return path === "/api/categories" || path === "/api/products";
};

const shouldProtectCatalogGet = (
  config: InternalAxiosRequestConfig
): boolean => {
  const method = (config.method ?? "get").toLowerCase();

  if (method !== "get") {
    return false;
  }

  const path = toPathname(config.url);
  return isPublicEndpointPath(path);
};

const serializeParams = (params: unknown): string => {
  if (!params) {
    return "";
  }

  if (params instanceof URLSearchParams) {
    return params.toString();
  }

  if (typeof params !== "object") {
    return String(params);
  }

  const entries = Object.entries(params as Record<string, unknown>)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b));

  const query = new URLSearchParams();

  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, String(item));
      }
      continue;
    }

    query.append(key, String(value));
  }

  return query.toString();
};

const buildGetKey = (config: InternalAxiosRequestConfig): string => {
  const path = toPathname(config.url);
  const query = serializeParams(config.params);
  return `${path}?${query}`;
};

const resolveCacheTtl = (path: string): number => {
  if (path === "/api/categories") {
    return CATEGORIES_CACHE_TTL_MS;
  }

  return PRODUCTS_CACHE_TTL_MS;
};

const cloneResponse = (response: AxiosResponse): AxiosResponse => ({
  ...response,
  config: { ...response.config },
  headers: { ...response.headers },
});

const buildLocalRateLimitError = (
  config: InternalAxiosRequestConfig,
  path: string
): AxiosError => {
  return new AxiosError(
    `Skipped ${path} due to client backoff after 429`,
    "ERR_CLIENT_RATE_LIMIT",
    config,
    undefined,
    {
      status: 429,
      statusText: "Too Many Requests",
      headers: {},
      config,
      data: {
        message: "Client-side rate limit backoff is active",
      },
    }
  );
};

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const path = toPathname(config.url);
  const token = getAccessToken();

  // Public catalog endpoints should not receive a stale bearer token.
  if (isPublicEndpointPath(path)) {
    if (config.headers.Authorization) {
      delete config.headers.Authorization;
    }
  }

  if (token && !config.headers.Authorization && !isPublicEndpointPath(path)) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!shouldProtectCatalogGet(config)) {
    return config;
  }

  const now = Date.now();
  const key = buildGetKey(config);
  const cached = getCache.get(key);
  const adapterFromConfig = config.adapter;
  const defaultAdapter = api.defaults.adapter;
  const adapter =
    (Array.isArray(adapterFromConfig)
      ? adapterFromConfig[0]
      : adapterFromConfig) ??
    (Array.isArray(defaultAdapter) ? defaultAdapter[0] : defaultAdapter);

  if (cached && cached.expiresAt > now) {
    config.adapter = async () => cloneResponse(cached.response);
    return config;
  }

  const endpointBackoff = endpointBackoffUntil.get(path) ?? 0;
  if (endpointBackoff > now) {
    config.adapter = async () => {
      throw buildLocalRateLimitError(config, path);
    };
    return config;
  }

  const existingInFlight = getInFlight.get(key);
  if (existingInFlight) {
    config.adapter = async () => cloneResponse(await existingInFlight);
    return config;
  }

  if (!adapter) {
    return config;
  }

  config.adapter = async (requestConfig) => {
    const currentInFlight = getInFlight.get(key);

    if (currentInFlight) {
      return cloneResponse(await currentInFlight);
    }

    const requestPromise = (async () => {
      try {
        const response = await (adapter as AxiosAdapter)(requestConfig);
        getCache.set(key, {
          response,
          expiresAt: Date.now() + resolveCacheTtl(path),
        });
        return response;
      } catch (rawError) {
        const axiosError = rawError as AxiosError;

        if (axiosError.response?.status === 429) {
          endpointBackoffUntil.set(path, Date.now() + CATALOG_BACKOFF_MS);
        }

        throw rawError;
      } finally {
        getInFlight.delete(key);
      }
    })();

    getInFlight.set(key, requestPromise);
    return cloneResponse(await requestPromise);
  };

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const requestPath = toPathname(originalRequest?.url);

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes(REFRESH_ENDPOINT) ||
      isPublicEndpointPath(requestPath)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshResponse = await axios.post<ApiResponse<RefreshTokenData>>(
        `${API_BASE_URL}${REFRESH_ENDPOINT}`,
        {},
        { withCredentials: true }
      );

      const tokenCandidate =
        refreshResponse.data?.data?.accessToken ??
        refreshResponse.data?.data?.token;
      const newAccessToken =
        typeof tokenCandidate === "string" ? tokenCandidate.trim() : "";

      if (!newAccessToken) {
        throw new Error("Не вдалося оновити токен сесії");
      }

      setAccessToken(newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearAccessToken();
      clearRole();
      return Promise.reject(refreshError);
    }
  }
);
