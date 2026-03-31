import type { AxiosInstance } from "axios";

import { api } from "@/services/api";
import {
  mapApiPayloadToAppProducts,
  mapApiProductToAppProduct,
} from "@/services/api";
import type { ApiResponse } from "@/types/api";
import type { Pagination } from "@/types/api";
import type { AppProduct } from "@/types/app";
import type { CartData } from "@/types/cart";
import type { CreateOrderPayload } from "@/types/order";
import type {
  LoginData,
  LoginPayload,
  RefreshTokenData,
  User,
} from "@/types/auth";
import {
  clearAccessToken,
  clearRole,
  setAccessToken,
  setRole,
} from "@/utils/token";
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
  search?: string;
}

export interface GetProductsCSRResult {
  products: AppProduct[];
  pagination: Pagination | null;
}

export interface FetchProductsParams {
  page: number;
  limit: number;
  search?: string;
}

export interface FetchProductsResult {
  products: AppProduct[];
  pagination: Pagination | null;
}

const uniqueCategoryTokens = (category: CategoryLookupInput): string[] => {
  return [category.id, category.slug, category.name]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, arr) => arr.indexOf(value) === index);
};

const extractPagination = (payload: unknown): Pagination | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;

  const pick = (record: Record<string, unknown>, key: string): unknown => {
    return record[key];
  };

  // Try multiple locations for pagination data
  let pagination: Record<string, unknown> | null = null;

  // Option 1: explicit pagination object at top level
  if (
    pick(candidate, "pagination") &&
    typeof pick(candidate, "pagination") === "object"
  ) {
    pagination = pick(candidate, "pagination") as Record<string, unknown>;
  }
  // Option 2: explicit pagination object nested in data
  else if (
    pick(candidate, "data") &&
    typeof pick(candidate, "data") === "object"
  ) {
    const nestedData = pick(candidate, "data") as Record<string, unknown>;
    const nestedPagination = nestedData.pagination;

    if (nestedPagination && typeof nestedPagination === "object") {
      pagination = nestedPagination as Record<string, unknown>;
    } else {
      // Option 3: pagination fields are top-level in data object
      pagination = {
        page: nestedData.page ?? nestedData.currentPage,
        limit: nestedData.limit ?? nestedData.itemsPerPage,
        total: nestedData.total ?? nestedData.totalItems,
        totalPages: nestedData.totalPages,
      };
    }
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
  if (params.search?.trim()) query.set("search", params.search.trim());

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

export async function fetchProducts({
  page,
  limit,
  search,
}: FetchProductsParams): Promise<FetchProductsResult> {
  const response = await apiClient.get("api/products", {
    params: {
      page,
      limit,
      ...(search && search.trim() ? { search: search.trim() } : {}),
    },
  });

  return {
    products: mapApiPayloadToAppProducts(response.data),
    pagination: extractPagination(response.data),
  };
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

export interface WishlistResult {
  items: AppProduct[];
}

export interface QuickOrderPayload {
  productId: string;
  quantity?: number;
  fullName: string;
  phone: string;
  city?: string;
  street?: string;
  building?: string;
  apartment?: string;
  comment?: string;
  paymentMethod?: "card" | "cash" | "cash_on_delivery";
  deliveryMethod?: "courier" | "pickup" | "nova_poshta";
}

export interface OrderResult {
  orderId?: string;
  status?: string;
  isGuest?: boolean;
}

const normalizeUser = (raw: User & { _id?: string; name?: string }): User => ({
  ...raw,
  id: raw.id ?? raw._id ?? "",
  firstName: raw.firstName ?? raw.name,
});

const resolveAuthToken = (
  payload: Partial<LoginData> | Partial<RefreshTokenData>
): string | null => {
  const tokenCandidate = payload.accessToken ?? payload.token;

  if (typeof tokenCandidate !== "string") {
    return null;
  }

  const normalized = tokenCandidate.trim();
  if (!normalized || normalized === "undefined" || normalized === "null") {
    return null;
  }

  return normalized;
};

const normalizeCartPayload = (payload: unknown): CartData => {
  const candidate = payload as
    | CartData
    | ApiResponse<CartData>
    | { data?: CartData };

  if (payload && typeof payload === "object") {
    const raw = payload as Record<string, unknown>;
    const nested =
      "data" in raw && raw.data && typeof raw.data === "object"
        ? (raw.data as Record<string, unknown>)
        : null;

    if (nested && Array.isArray(nested.items)) {
      const items = nested.items as Array<Record<string, unknown>>;
      const subtotal =
        typeof nested.subtotal === "number" && Number.isFinite(nested.subtotal)
          ? nested.subtotal
          : 0;
      const itemsCount =
        typeof nested.itemsCount === "number" &&
        Number.isFinite(nested.itemsCount)
          ? nested.itemsCount
          : items.reduce((sum, item) => {
              const quantity = Number(item.quantity ?? 0);
              return sum + (Number.isFinite(quantity) ? quantity : 0);
            }, 0);

      return {
        items: items.map((item) => {
          const productObj =
            item.product && typeof item.product === "object"
              ? (item.product as Record<string, unknown>)
              : null;

          const productId =
            (item.productId as string | undefined) ??
            (productObj?._id as string | undefined) ??
            (productObj?.id as string | undefined) ??
            "";

          const quantity = Number(item.quantity ?? 1);
          const price = Number(item.price ?? productObj?.price ?? 0);

          return {
            id: (item.id as string | undefined) ?? productId,
            productId,
            quantity: Number.isFinite(quantity) ? quantity : 1,
            price: Number.isFinite(price) ? price : 0,
            product: productObj
              ? {
                  ...(productObj as object),
                  id: (productObj.id as string | undefined) ?? productId,
                  name:
                    (productObj.name as string | undefined) ??
                    "Товар без назви",
                  price: Number(
                    Number.isFinite(Number(productObj.price))
                      ? Number(productObj.price)
                      : price
                  ),
                  image:
                    (productObj.image as string | undefined) ??
                    (productObj.mainImage as string | undefined),
                }
              : undefined,
          };
        }),
        subtotal,
        itemsCount,
      };
    }

    // Backend cart mutations may return a plain cart array in data.
    if (Array.isArray(raw.data)) {
      const items = (raw.data as Array<Record<string, unknown>>).map((item) => {
        const productObj =
          item.product && typeof item.product === "object"
            ? (item.product as Record<string, unknown>)
            : null;

        const productId =
          (productObj?._id as string | undefined) ??
          (item.productId as string | undefined) ??
          (item.product as string | undefined) ??
          "";

        const quantity = Number(item.quantity ?? 1);
        const price = Number(productObj?.price ?? item.price ?? 0);

        return {
          id: productId,
          productId,
          quantity: Number.isFinite(quantity) ? quantity : 1,
          price: Number.isFinite(price) ? price : 0,
          product: productObj
            ? {
                ...(productObj as object),
                id: (productObj.id as string | undefined) ?? productId,
                name:
                  (productObj.name as string | undefined) ?? "Товар без назви",
                price: Number.isFinite(price) ? price : 0,
                image:
                  (productObj.image as string | undefined) ??
                  (productObj.mainImage as string | undefined),
              }
            : undefined,
        };
      });

      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

      return { items, subtotal, itemsCount };
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

const normalizeWishlistPayload = (payload: unknown): WishlistResult => {
  if (!payload || typeof payload !== "object") {
    return { items: [] };
  }

  const raw = payload as Record<string, unknown>;
  const nested =
    "data" in raw && Array.isArray(raw.data)
      ? (raw.data as unknown[])
      : Array.isArray(payload)
      ? (payload as unknown[])
      : [];

  const items = nested
    .map((item) => mapApiProductToAppProduct(item))
    .filter((item): item is AppProduct => item !== null);

  return { items };
};

const normalizeOrderPayload = (payload: unknown): OrderResult => {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const raw = payload as Record<string, unknown>;
  const nested =
    "data" in raw && raw.data && typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : raw;

  return {
    orderId:
      (nested.orderId as string | undefined) ??
      (nested.id as string | undefined) ??
      (nested._id as string | undefined),
    status: nested.status as string | undefined,
    isGuest:
      typeof nested.isGuest === "boolean"
        ? (nested.isGuest as boolean)
        : undefined,
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
    const accessToken = resolveAuthToken(loginData);

    if (accessToken) {
      setAccessToken(accessToken);
    } else {
      clearAccessToken();
    }

    if (loginData.user?.role) {
      setRole(loginData.user.role);
    } else {
      clearRole();
    }

    return {
      ...loginData,
      accessToken: accessToken ?? "",
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

    const accessToken = resolveAuthToken(response.data.data);

    if (!accessToken) {
      clearAccessToken();
      throw new Error("Не вдалося оновити токен сесії");
    }

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
        const user = normalizeUser(response.data.data);

        if (user.role) {
          setRole(user.role);
        } else {
          clearRole();
        }

        return user;
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
      clearRole();
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

export async function removeFromCartCSR(productId: string): Promise<CartData> {
  const response = await apiClient.delete<ApiResponse<CartData> | CartData>(
    `/api/users/cart/${productId}`
  );

  return normalizeCartPayload(response.data);
}

export async function clearCartCSR(): Promise<CartData> {
  const response = await apiClient.delete<ApiResponse<CartData> | CartData>(
    "/api/users/cart"
  );

  return normalizeCartPayload(response.data);
}

export async function getWishlistCSR(): Promise<WishlistResult> {
  const response = await apiClient.get("/api/users/wishlist");

  return normalizeWishlistPayload(response.data);
}

export async function addToWishlistCSR(
  productId: string
): Promise<WishlistResult> {
  const response = await apiClient.post(`/api/users/wishlist/${productId}`);

  return normalizeWishlistPayload(response.data);
}

export async function removeFromWishlistCSR(
  productId: string
): Promise<WishlistResult> {
  const response = await apiClient.delete(`/api/users/wishlist/${productId}`);

  return normalizeWishlistPayload(response.data);
}

export async function createOrderCSR(
  payload: CreateOrderPayload
): Promise<OrderResult> {
  const response = await apiClient.post("/api/orders", payload);
  return normalizeOrderPayload(response.data);
}

export async function createQuickOrderCSR(
  payload: QuickOrderPayload
): Promise<OrderResult> {
  const fallbackAddressValue = "Не вказано";

  const body = {
    items: [
      {
        productId: payload.productId,
        quantity: payload.quantity ?? 1,
      },
    ],
    shippingAddress: {
      name: payload.fullName,
      phone: payload.phone,
      city: payload.city ?? fallbackAddressValue,
      street: payload.street ?? fallbackAddressValue,
      building: payload.building ?? fallbackAddressValue,
      ...(payload.apartment ? { apartment: payload.apartment } : {}),
      ...(payload.comment ? { comment: payload.comment } : {}),
    },
    paymentMethod: payload.paymentMethod ?? "cash_on_delivery",
    deliveryMethod: payload.deliveryMethod ?? "nova_poshta",
  };

  const response = await apiClient.post("/api/orders/quick", body);
  return normalizeOrderPayload(response.data);
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
