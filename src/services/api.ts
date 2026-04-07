import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import type { AppProduct } from "@/types/app";
import type { Product } from "@/types/product";
import { PRODUCT_PLACEHOLDER_SRC, resolveMediaUrl } from "@/utils/media";

const normalizeApiBaseUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.replace(/\/+$/, "");
  return trimmed.replace(/\/api$/i, "");
};

export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
);
export const API_TIMEOUT_MS = 15_000;
export const API_PROXY_PREFIX = "/api/proxy";
export const AUTH_PROXY_BASE = `${API_PROXY_PREFIX}/api/auth`;
const REFRESH_ENDPOINT = "/api/auth/refresh";
const AUTH_ENDPOINT_PREFIX = "/api/auth";
const CATALOG_BACKOFF_MS = 15_000;
const CATEGORIES_CACHE_TTL_MS = 5 * 60_000;
const PRODUCTS_CACHE_TTL_MS = 30_000;

let refreshPromise: Promise<void> | null = null;
let axiosRefreshPromise: Promise<void> | null = null;

export class ApiFetchError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiFetchError";
    this.status = status;
    this.data = data;
  }
}

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

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const extractApiMessage = (payload: unknown): string | null => {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (!isRecord(payload)) {
    return null;
  }

  const nestedError = payload.error;
  if (isRecord(nestedError) && typeof nestedError.message === "string") {
    return nestedError.message;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return null;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Сталася помилка запиту"
): string => {
  if (error instanceof ApiFetchError) {
    return extractApiMessage(error.data) ?? error.message ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (isRecord(error) && "response" in error) {
    const response = error.response;
    if (isRecord(response) && "data" in response) {
      return extractApiMessage(response.data) ?? fallback;
    }
  }

  return fallback;
};

const unwrapApiData = <T>(payload: unknown): T => {
  if (isRecord(payload) && "data" in payload) {
    return payload.data as T;
  }

  return payload as T;
};

const buildFetchBody = (
  body: BodyInit | object | null | undefined,
  headers: Headers
): BodyInit | undefined => {
  if (body == null) {
    return undefined;
  }

  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  ) {
    return body as BodyInit;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return JSON.stringify(body);
};

const refreshAuthSession = async (): Promise<void> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${AUTH_PROXY_BASE}/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = await parseResponseBody(response);
        throw new ApiFetchError(
          extractApiMessage(payload) ?? "Не вдалося оновити сесію",
          response.status,
          payload
        );
      }

      await parseResponseBody(response);
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

const refreshAxiosSession = async (): Promise<void> => {
  if (!axiosRefreshPromise) {
    axiosRefreshPromise = (async () => {
      const response = await fetch(REFRESH_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const payload = await parseResponseBody(response);

      if (!response.ok) {
        throw new ApiFetchError(
          extractApiMessage(payload) ?? "Не вдалося оновити сесію",
          response.status,
          payload
        );
      }

      const refreshResult =
        payload && typeof payload === "object"
          ? (payload as { success?: boolean; message?: string })
          : null;

      if (refreshResult?.success === false) {
        throw new ApiFetchError(
          refreshResult.message ?? "Не вдалося оновити сесію",
          401,
          payload
        );
      }
    })().finally(() => {
      axiosRefreshPromise = null;
    });
  }

  return axiosRefreshPromise;
};

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | object | null;
  retryOn401?: boolean;
}

export async function apiFetch<T>(
  input: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { retryOn401 = true, body, headers: rawHeaders, ...rest } = options;
  const headers = new Headers(rawHeaders);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const response = await fetch(input, {
    ...rest,
    credentials: "include",
    headers,
    body: buildFetchBody(body, headers),
    cache: rest.cache ?? "no-store",
  });

  const payload = await parseResponseBody(response);

  if (
    response.status === 401 &&
    retryOn401 &&
    !input.includes("/auth/refresh")
  ) {
    await refreshAuthSession();

    return apiFetch<T>(input, {
      ...options,
      retryOn401: false,
    });
  }

  if (!response.ok) {
    throw new ApiFetchError(
      extractApiMessage(payload) ??
        `Request failed with status ${response.status}`,
      response.status,
      payload
    );
  }

  return unwrapApiData<T>(payload);
}

const findProductArray = (payload: unknown, depth = 0): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload) || depth > 5) {
    return [];
  }

  if (Array.isArray(payload.products)) {
    return payload.products;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  for (const key of ["data", "result", "payload"]) {
    if (key in payload) {
      const nested = findProductArray(payload[key], depth + 1);
      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
};

export const extractApiProducts = (payload: unknown): unknown[] => {
  if (!payload) {
    return [];
  }

  const rows = findProductArray(payload);
  if (rows.length > 0) {
    return rows;
  }

  if (!isRecord(payload)) {
    return [];
  }

  if (payload.product && typeof payload.product === "object") {
    return [payload.product];
  }

  if (isRecord(payload.data) && payload.data.product) {
    return [payload.data.product];
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

const isAuthEndpointPath = (path: string): boolean => {
  return (
    path === AUTH_ENDPOINT_PREFIX || path.startsWith(`${AUTH_ENDPOINT_PREFIX}/`)
  );
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

const resolveAxiosAdapter = (
  candidate:
    | InternalAxiosRequestConfig["adapter"]
    | AxiosInstance["defaults"]["adapter"]
): AxiosAdapter | null => {
  if (!candidate) {
    return null;
  }

  if (typeof candidate === "function") {
    return candidate;
  }

  try {
    return axios.getAdapter(candidate);
  } catch {
    return null;
  }
};

const logAxiosDebug = (
  label: string,
  error: unknown,
  extra?: Record<string, unknown>
) => {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const axiosError = axios.isAxiosError(error) ? error : null;

  console.error(label, {
    ...extra,
    message:
      axiosError?.message ??
      (error instanceof Error ? error.message : String(error)),
    code: axiosError?.code,
    status: axiosError?.response?.status,
    url: axiosError?.config?.url,
    method: axiosError?.config?.method,
    params: axiosError?.config?.params,
    data: axiosError?.response?.data,
    error,
  });
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

  if (isPublicEndpointPath(path) && config.headers.Authorization) {
    delete config.headers.Authorization;
  }

  if (!shouldProtectCatalogGet(config)) {
    return config;
  }

  const now = Date.now();
  const key = buildGetKey(config);
  const cached = getCache.get(key);
  const adapter =
    resolveAxiosAdapter(config.adapter) ??
    resolveAxiosAdapter(api.defaults.adapter);

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
      error.response?.status === 304 &&
      originalRequest &&
      isPublicEndpointPath(requestPath)
    ) {
      const cacheKey = buildGetKey(originalRequest);
      const cached = getCache.get(cacheKey);

      if (cached) {
        if (process.env.NODE_ENV !== "production") {
          console.info("[api] recovered cached response after 304", {
            path: requestPath,
            url: originalRequest.url,
            params: originalRequest.params,
            cacheKey,
          });
        }

        return cloneResponse(cached.response);
      }

      logAxiosDebug("[api] received 304 without cached response", error, {
        path: requestPath,
        url: originalRequest.url,
        params: originalRequest.params,
        cacheKey,
      });
    }

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes(REFRESH_ENDPOINT) ||
      isPublicEndpointPath(requestPath) ||
      isAuthEndpointPath(requestPath)
    ) {
      logAxiosDebug("[api] request rejected", error, {
        path: requestPath,
        url: originalRequest?.url,
        params: originalRequest?.params,
      });

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await refreshAxiosSession();

      return api(originalRequest);
    } catch (refreshError) {
      logAxiosDebug("[api] refresh retry failed", refreshError, {
        path: requestPath,
        url: originalRequest.url,
        params: originalRequest.params,
      });

      return Promise.reject(refreshError);
    }
  }
);
