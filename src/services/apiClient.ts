import type { AxiosInstance } from "axios";

import { api } from "@/services/api";
import { mapApiPayloadToAppProducts } from "@/services/api";
import type { ApiResponse } from "@/types/api";
import type { Pagination } from "@/types/api";
import type { AppProduct } from "@/types/app";
import type { CartData } from "@/types/cart";
import type {
  LoginData,
  LoginPayload,
  RefreshTokenData,
  User,
} from "@/types/auth";
import { clearAccessToken, setAccessToken } from "@/utils/token";
import { getAccessToken } from "@/utils/token";

// CSR client for Client Components and TanStack Query hooks.
export const apiClient: AxiosInstance = api;

const AUTH_BASE = "/api/auth";
const AUTH_RATE_LIMIT_BACKOFF_MS = 15_000;
const REVIEW_RATE_LIMIT_BACKOFF_MS = 15_000;

let meInFlight: Promise<User> | null = null;
let meBackoffUntil = 0;
let loginBackoffUntil = 0;
let reviewBackoffUntil = 0;

export interface CategoryLookupInput {
  id?: string;
  slug?: string;
  name?: string;
}

export interface GetProductsCSRParams {
  page: number;
  limit: number;
  category?: string;
  brand?: string;
  isNew?: boolean;
  isSale?: boolean;
}

export interface GetProductsCSRResult {
  products: AppProduct[];
  pagination: Pagination | null;
}

const uniqueCategoryTokens = (category: CategoryLookupInput): string[] => {
  return [category.slug, category.name, category.id]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, arr) => arr.indexOf(value) === index);
};

const extractPagination = (payload: unknown): Pagination | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, any>;

  // Try multiple locations for pagination data
  let pagination: any;

  // Option 1: explicit pagination object at top level
  if (candidate.pagination && typeof candidate.pagination === "object") {
    pagination = candidate.pagination;
  }
  // Option 2: explicit pagination object nested in data
  else if (
    candidate.data &&
    typeof candidate.data === "object" &&
    candidate.data.pagination &&
    typeof candidate.data.pagination === "object"
  ) {
    pagination = candidate.data.pagination;
  }
  // Option 3: pagination fields are top-level in data object
  else if (candidate.data && typeof candidate.data === "object") {
    pagination = {
      page: candidate.data.page ?? candidate.data.currentPage,
      limit: candidate.data.limit ?? candidate.data.itemsPerPage,
      total: candidate.data.total ?? candidate.data.totalItems,
      totalPages: candidate.data.totalPages,
    };
  }

  if (!pagination || typeof pagination !== "object") {
    return null;
  }

  // Normalize field names in case pagination object doesn't have standard names
  const normalized = {
    page: pagination.page ?? pagination.currentPage,
    limit: pagination.limit ?? pagination.itemsPerPage,
    total: pagination.total ?? pagination.totalItems,
    totalPages: pagination.totalPages,
  };

  const hasNumbers =
    Number.isFinite(normalized.page) &&
    Number.isFinite(normalized.limit) &&
    Number.isFinite(normalized.total) &&
    Number.isFinite(normalized.totalPages);

  return hasNumbers ? (normalized as Pagination) : null;
};

export async function getProductsCSR(
  params: GetProductsCSRParams
): Promise<GetProductsCSRResult> {
  const query = new URLSearchParams();
  query.set("page", String(params.page));
  query.set("limit", String(params.limit));
  if (params.category) query.set("category", params.category);
  if (params.brand) query.set("brand", params.brand);
  if (params.isNew) query.set("isNewProduct", "true");
  if (params.isSale) query.set("isOnSale", "true");

  const url = `/api/proxy/api/products?${query.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    console.error("[getProductsCSR] request failed", response.status, payload);
    throw { response: { status: response.status, data: payload } };
  }

  const products = mapApiPayloadToAppProducts(payload);
  const pagination = extractPagination(payload);

  return { products, pagination };
}

export async function getCategoryProductsCSR(
  category: CategoryLookupInput,
  limit = 90
): Promise<AppProduct[]> {
  const categoryTokens = uniqueCategoryTokens(category);

  for (const token of categoryTokens) {
    const params = new URLSearchParams({
      page: "1",
      limit: String(limit),
      category: token,
      sort: "rating",
      order: "desc",
    });

    const response = await fetch(
      `/api/proxy/api/products?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      }
    );

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw {
        response: {
          status: response.status,
          data: payload,
        },
      };
    }

    const products = mapApiPayloadToAppProducts(payload);
    if (products.length > 0) {
      return products;
    }
  }

  return [];
}

export interface AddToCartPayload {
  productId: string;
  quantity: number;
}

export interface SubmitProductReviewPayload {
  productId: string;
  rating: number;
  text?: string;
}

export interface SubmitProductReviewResult {
  id?: string;
  user?: string;
  text?: string;
  date?: string;
  rating?: number;
}

const normalizeUser = (raw: User & { _id?: string; name?: string }): User => ({
  ...raw,
  id: raw.id ?? raw._id ?? "",
  firstName: raw.firstName ?? raw.name,
});

const normalizeCartPayload = (payload: unknown): CartData => {
  const candidate = payload as
    | CartData
    | ApiResponse<CartData>
    | { data?: CartData };

  if (
    payload &&
    typeof payload === "object" &&
    "data" in (payload as Record<string, unknown>)
  ) {
    const nested = (candidate as { data?: CartData }).data;
    if (nested) {
      return nested;
    }
  }

  if (
    (candidate as CartData).items &&
    Array.isArray((candidate as CartData).items)
  ) {
    return candidate as CartData;
  }

  return {
    items: [],
    subtotal: 0,
    itemsCount: 0,
  };
};

const extractSubmittedReview = (
  payload: unknown
): SubmitProductReviewResult => {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const direct = payload as Record<string, unknown>;
  const nestedData =
    "data" in direct && direct.data && typeof direct.data === "object"
      ? (direct.data as Record<string, unknown>)
      : null;
  const nestedReview =
    nestedData &&
    "review" in nestedData &&
    nestedData.review &&
    typeof nestedData.review === "object"
      ? (nestedData.review as Record<string, unknown>)
      : null;

  const source = nestedReview ?? nestedData ?? direct;

  const idCandidate = source.id ?? source._id;
  const userCandidate = source.user ?? source.author ?? source.userName;
  const textCandidate = source.text ?? source.comment ?? source.message;
  const dateCandidate = source.date ?? source.createdAt;
  const ratingCandidate = source.rating;

  return {
    id: typeof idCandidate === "string" ? idCandidate : undefined,
    user: typeof userCandidate === "string" ? userCandidate : undefined,
    text: typeof textCandidate === "string" ? textCandidate : undefined,
    date: typeof dateCandidate === "string" ? dateCandidate : undefined,
    rating:
      typeof ratingCandidate === "number" && Number.isFinite(ratingCandidate)
        ? Math.max(1, Math.min(5, ratingCandidate))
        : undefined,
  };
};

export const authService = {
  async login(payload: LoginPayload): Promise<LoginData> {
    const now = Date.now();
    if (loginBackoffUntil > now) {
      throw new Error("Забагато спроб входу. Спробуйте через кілька секунд");
    }

    let response;
    try {
      response = await apiClient.post<ApiResponse<LoginData>>(
        `${AUTH_BASE}/login`,
        payload
      );
    } catch (error) {
      const status =
        typeof error === "object" &&
        error &&
        "response" in error &&
        typeof (error as { response?: { status?: number } }).response
          ?.status === "number"
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;

      if (status === 429) {
        loginBackoffUntil = Date.now() + AUTH_RATE_LIMIT_BACKOFF_MS;
      }

      throw error;
    }

    const loginData = response.data.data;
    setAccessToken(loginData.accessToken);

    return {
      ...loginData,
      user: normalizeUser(
        loginData.user as User & { _id?: string; name?: string }
      ),
    };
  },

  async refresh(): Promise<string> {
    const response = await apiClient.post<ApiResponse<RefreshTokenData>>(
      `${AUTH_BASE}/refresh`,
      {}
    );

    const accessToken = response.data.data.accessToken;
    setAccessToken(accessToken);

    return accessToken;
  },

  async me(): Promise<User> {
    const now = Date.now();

    if (meBackoffUntil > now) {
      throw new Error("Тимчасово обмежено запити сесії. Спробуйте пізніше");
    }

    if (meInFlight) {
      return meInFlight;
    }

    meInFlight = (async () => {
      try {
        const response = await apiClient.get<
          ApiResponse<User & { _id?: string; name?: string }>
        >(`${AUTH_BASE}/me`);
        return normalizeUser(response.data.data);
      } catch (error) {
        const status =
          typeof error === "object" &&
          error &&
          "response" in error &&
          typeof (error as { response?: { status?: number } }).response
            ?.status === "number"
            ? (error as { response?: { status?: number } }).response?.status
            : undefined;

        if (status === 429) {
          meBackoffUntil = Date.now() + AUTH_RATE_LIMIT_BACKOFF_MS;
        }

        throw error;
      } finally {
        meInFlight = null;
      }
    })();

    return meInFlight;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post(`${AUTH_BASE}/logout`, {});
    } finally {
      clearAccessToken();
    }
  },
};

export async function getCartCSR(): Promise<CartData> {
  const response = await apiClient.get<ApiResponse<CartData> | CartData>(
    "/api/users/cart"
  );

  return normalizeCartPayload(response.data);
}

export async function addToCartCSR(
  payload: AddToCartPayload
): Promise<CartData> {
  const response = await apiClient.post<ApiResponse<CartData> | CartData>(
    "/api/users/cart",
    payload
  );

  return normalizeCartPayload(response.data);
}

export async function submitProductReviewCSR(
  payload: SubmitProductReviewPayload
): Promise<SubmitProductReviewResult> {
  const now = Date.now();
  if (reviewBackoffUntil > now) {
    throw new Error(
      "Забагато запитів на відгуки. Спробуйте знову через кілька секунд"
    );
  }

  const normalizedRating = Math.max(1, Math.min(5, Math.round(payload.rating)));
  const normalizedText = payload.text?.trim();

  const primaryBody: Record<string, unknown> = {
    rating: normalizedRating,
    ...(normalizedText ? { text: normalizedText } : {}),
  };

  const commentBody: Record<string, unknown> = {
    rating: normalizedRating,
    ...(normalizedText ? { comment: normalizedText } : {}),
  };

  const contentBody: Record<string, unknown> = {
    rating: normalizedRating,
    ...(normalizedText ? { content: normalizedText } : {}),
  };

  const attempts: Array<{
    method: "post" | "patch" | "put";
    url: string;
    body: Record<string, unknown>;
    viaProxy?: boolean;
  }> = [
    {
      method: "post",
      url: `/api/reviews/products/${payload.productId}`,
      body: primaryBody,
      viaProxy: true,
    },
    {
      method: "post",
      url: `/api/reviews/products/${payload.productId}`,
      body: commentBody,
      viaProxy: true,
    },
    {
      method: "post",
      url: `/api/reviews/products/${payload.productId}`,
      body: contentBody,
      viaProxy: true,
    },
    {
      method: "post",
      url: `/api/reviews/products/${payload.productId}`,
      body: primaryBody,
    },
    {
      method: "post",
      url: `/reviews/products/${payload.productId}`,
      body: primaryBody,
      viaProxy: true,
    },
    {
      method: "post",
      url: `/reviews/products/${payload.productId}`,
      body: primaryBody,
    },
  ];

  let lastError: unknown;

  const callViaProxy = async (
    method: "post" | "patch" | "put",
    endpoint: string,
    body: Record<string, unknown>
  ): Promise<unknown> => {
    const token = getAccessToken();
    const response = await fetch(`/api/proxy${endpoint}`, {
      method: method.toUpperCase(),
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    let responseBody: unknown = null;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }

    if (!response.ok) {
      throw {
        response: {
          status: response.status,
          data: responseBody,
        },
      };
    }

    return responseBody;
  };

  for (const attempt of attempts) {
    try {
      const responseData = attempt.viaProxy
        ? await callViaProxy(attempt.method, attempt.url, attempt.body)
        : (
            await (attempt.method === "post"
              ? apiClient.post(attempt.url, attempt.body)
              : attempt.method === "patch"
              ? apiClient.patch(attempt.url, attempt.body)
              : apiClient.put(attempt.url, attempt.body))
          ).data;

      return extractSubmittedReview(responseData);
    } catch (error) {
      const status =
        typeof error === "object" &&
        error &&
        "response" in error &&
        typeof (error as { response?: { status?: number } }).response
          ?.status === "number"
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;

      if (status === 429) {
        reviewBackoffUntil = Date.now() + REVIEW_RATE_LIMIT_BACKOFF_MS;
        throw new Error(
          "Занадто багато запитів. Повторіть відправку відгуку трохи пізніше"
        );
      }

      if (status === 404 || status === 405) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error("Review endpoint was not found");
}
