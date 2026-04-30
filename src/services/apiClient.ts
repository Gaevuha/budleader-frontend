import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

const normalizeApiBaseUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.replace(/\/+$/, "");
  return trimmed.replace(/\/api$/i, "");
};

const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
);
const API_TIMEOUT_MS = 15_000;
const AUTH_REFRESH_ENDPOINT = "/api/auth/refresh";
const AUTH_ENDPOINT_PREFIX = "/api/auth";
const API_PROXY_PREFIX = "/api/proxy";
const CLIENT_RATE_LIMIT_BACKOFF_MS = 15_000;
const PROXY_PATH_PREFIXES = [
  "/api/products",
  "/api/categories",
  "/api/users",
  "/api/orders",
  "/api/reviews",
];
const RATE_LIMIT_BACKOFF_PATH_PREFIXES = ["/api/products", "/api/categories"];

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<void> | null = null;
let rateLimitBackoffUntil = 0;

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

const shouldApplyRateLimitBackoff = (path: string): boolean => {
  return RATE_LIMIT_BACKOFF_PATH_PREFIXES.some(
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

const createRateLimitError = (
  config: InternalAxiosRequestConfig
): AxiosError => {
  return new AxiosError(
    "Client-side rate limit backoff is active",
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

const refreshAuthSession = async (): Promise<void> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        AUTH_REFRESH_ENDPOINT,
        {},
        {
          withCredentials: true,
          timeout: API_TIMEOUT_MS,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      )
      .then((response) => {
        const payload = response.data as {
          success?: boolean;
          message?: string;
        };

        if (payload?.success === false) {
          throw new Error(payload.message ?? "Не вдалося оновити сесію");
        }
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: API_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const requestPath = toPathname(config.url);

  if (
    shouldApplyRateLimitBackoff(requestPath) &&
    rateLimitBackoffUntil > Date.now()
  ) {
    return Promise.reject(createRateLimitError(config));
  }

  if (config.data instanceof FormData && config.headers) {
    delete (config.headers as Record<string, string | undefined>)[
      "Content-Type"
    ];
    delete (config.headers as Record<string, string | undefined>)[
      "content-type"
    ];
  }

  if (config.url?.startsWith("/")) {
    config.baseURL = undefined;
    config.url = rewriteRequestUrl(config.url);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const requestPath = toPathname(originalRequest?.url);

    if (
      error.response?.status === 429 &&
      shouldApplyRateLimitBackoff(requestPath)
    ) {
      rateLimitBackoffUntil = Date.now() + CLIENT_RATE_LIMIT_BACKOFF_MS;
    }

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      requestPath.startsWith(AUTH_ENDPOINT_PREFIX)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await refreshAuthSession();
      return apiClient(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);
