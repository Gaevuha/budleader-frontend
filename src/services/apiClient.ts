import type { AxiosInstance } from "axios";

import {
  api,
  apiFetch,
  AUTH_API_URL,
  mapApiPayloadToAppProducts,
  mapApiProductToAppProduct,
} from "@/services/api";
import { parseCatalogViewMode } from "@/services/catalogViewPreference";
import { parseThemeMode } from "@/services/themePreference";
import type { ApiResponse } from "@/types/api";
import type { Pagination } from "@/types/api";
import type { AppProduct, ProductReview } from "@/types/app";
import type { CartData } from "@/types/cart";
import type { CreateOrderPayload, Order, OrdersResult } from "@/types/order";
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginData,
  LoginPayload,
  RegisterData,
  RegisterPayload,
  ResetPasswordPayload,
  UpdateProfilePayload,
  User,
  ValidateSessionData,
} from "@/types/auth";

// CSR client for Client Components and TanStack Query hooks.
export const apiClient: AxiosInstance = api;
const USERS_PROXY_BASE = "/api/proxy/api/users";

const AUTH_RATE_LIMIT_BACKOFF_MS = 15_000;
const REVIEW_RATE_LIMIT_BACKOFF_MS = 15_000;
const REQUEST_DEDUPE_TTL_MS = 1_500;

let loginBackoffUntil = 0;
let currentUserBackoffUntil = 0;
let reviewBackoffUntil = 0;

let currentUserRequest: Promise<User | null> | null = null;
let currentUserSnapshot: {
  value: User | null;
  expiresAt: number;
} | null = null;

let cartRequest: Promise<CartData> | null = null;
let cartSnapshot: {
  value: CartData;
  expiresAt: number;
} | null = null;

let wishlistRequest: Promise<WishlistResult> | null = null;
let wishlistSnapshot: {
  value: WishlistResult;
  expiresAt: number;
} | null = null;

const isFreshSnapshot = (expiresAt: number) => expiresAt > Date.now();

export const resetCurrentUserRequestCache = () => {
  currentUserRequest = null;
  currentUserSnapshot = null;
  currentUserBackoffUntil = 0;
};

export const resetCommerceRequestCache = () => {
  cartRequest = null;
  cartSnapshot = null;
  wishlistRequest = null;
  wishlistSnapshot = null;
};

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

const logFetchRateLimit = (label: string, details: Record<string, unknown>) => {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.warn(label, details);
};

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
    if (response.status === 429) {
      logFetchRateLimit("[getProductsCSR] rate limited", {
        status: response.status,
        url,
        params,
        retryAfter: response.headers.get("retry-after"),
        payload,
      });
    }

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

export async function getProductReviewsCSR(
  productId: string
): Promise<ProductReviewsResult> {
  const response = await apiClient.get(`/api/reviews/products/${productId}`);
  return normalizeProductReviewsResult(response.data);
}

export interface AddToCartPayload {
  productId: string;
  quantity: number;
}

export interface SubmitProductReviewPayload {
  productId: string;
  rating: number;
  text?: string;
  guestName?: string;
}

export interface SubmitProductReviewResult {
  id?: string;
  user?: string;
  text?: string;
  date?: string;
  rating?: number;
}

export interface ProductReviewsResult {
  reviews: ProductReview[];
  averageRating: number;
  totalReviews: number;
}

const normalizeProductReviewsPayload = (payload: unknown): ProductReview[] => {
  const source = payload as
    | { reviews?: unknown[]; data?: { reviews?: unknown[] } }
    | unknown[];

  const rows = Array.isArray(source)
    ? source
    : Array.isArray(source.reviews)
    ? source.reviews
    : Array.isArray(source.data?.reviews)
    ? source.data.reviews
    : [];

  return rows.reduce<ProductReview[]>((accumulator, item) => {
    if (!item || typeof item !== "object") {
      return accumulator;
    }

    const review = item as {
      id?: string;
      _id?: string;
      user?: string | { name?: string; email?: string };
      guestName?: string;
      text?: string;
      comment?: string;
      createdAt?: string;
      date?: string;
      rating?: number;
    };

    const id = review.id ?? review._id;
    if (!id) {
      return accumulator;
    }

    accumulator.push({
      id,
      user:
        typeof review.user === "string"
          ? review.user
          : review.user?.name ??
            review.user?.email ??
            review.guestName ??
            "Користувач",
      text: review.comment ?? review.text ?? "",
      date: review.createdAt ?? review.date ?? new Date().toISOString(),
      rating:
        typeof review.rating === "number" && Number.isFinite(review.rating)
          ? review.rating
          : undefined,
    });

    return accumulator;
  }, []);
};

const normalizeProductReviewsResult = (
  payload: unknown
): ProductReviewsResult => {
  const reviews = normalizeProductReviewsPayload(payload);

  if (!payload || typeof payload !== "object") {
    return {
      reviews,
      averageRating: 0,
      totalReviews: reviews.length,
    };
  }

  const raw = payload as Record<string, unknown>;
  const nested =
    "data" in raw && raw.data && typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : raw;
  const rawStats =
    nested.stats && typeof nested.stats === "object"
      ? (nested.stats as Record<string, unknown>)
      : null;
  const averageRating = Number(rawStats?.averageRating ?? 0);
  const totalReviews = Number(rawStats?.totalReviews ?? reviews.length);

  return {
    reviews,
    averageRating: Number.isFinite(averageRating) ? averageRating : 0,
    totalReviews: Number.isFinite(totalReviews) ? totalReviews : reviews.length,
  };
};

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

const normalizeOrderStatus = (status: unknown): string => {
  return typeof status === "string" && status.trim() ? status : "pending";
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

const normalizeOrdersPayload = (payload: unknown): OrdersResult => {
  if (!payload || typeof payload !== "object") {
    return {
      orders: [],
      pagination: null,
    };
  }

  const raw = payload as Record<string, unknown>;
  const nested =
    "data" in raw && raw.data && typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : raw;

  const rawOrders = Array.isArray(nested.orders)
    ? nested.orders
    : Array.isArray(raw.orders)
    ? raw.orders
    : [];

  const orders = rawOrders.reduce<Order[]>((accumulator, entry) => {
    if (!entry || typeof entry !== "object") {
      return accumulator;
    }

    const order = entry as Record<string, unknown>;
    const id =
      (order.id as string | undefined) ??
      (order._id as string | undefined) ??
      "";

    if (!id) {
      return accumulator;
    }

    const rawItems = Array.isArray(order.items) ? order.items : [];

    const items = rawItems
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const record = item as Record<string, unknown>;
        const product =
          record.product && typeof record.product === "object"
            ? (record.product as Record<string, unknown>)
            : null;
        const productId =
          (product?._id as string | undefined) ??
          (product?.id as string | undefined) ??
          (record.productId as string | undefined);
        const image =
          (product?.mainImage as string | undefined) ??
          (product?.image as string | undefined);
        const quantity = Number(record.quantity ?? 1);
        const price = Number(record.price ?? 0);
        const total = Number(record.total ?? quantity * price);

        return {
          id:
            (record.id as string | undefined) ??
            productId ??
            crypto.randomUUID(),
          productId,
          name:
            (record.name as string | undefined) ??
            (product?.name as string | undefined) ??
            "Товар без назви",
          quantity: Number.isFinite(quantity) ? quantity : 1,
          price: Number.isFinite(price) ? price : 0,
          total: Number.isFinite(total) ? total : 0,
          image,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    accumulator.push({
      id,
      status: normalizeOrderStatus(order.status),
      total: Number(order.total ?? 0),
      subtotal: Number.isFinite(Number(order.subtotal))
        ? Number(order.subtotal)
        : undefined,
      deliveryCost: Number.isFinite(Number(order.deliveryCost))
        ? Number(order.deliveryCost)
        : undefined,
      paymentMethod:
        typeof order.paymentMethod === "string"
          ? order.paymentMethod
          : undefined,
      deliveryMethod:
        typeof order.deliveryMethod === "string"
          ? order.deliveryMethod
          : undefined,
      items,
      createdAt:
        typeof order.createdAt === "string" ? order.createdAt : undefined,
      updatedAt:
        typeof order.updatedAt === "string" ? order.updatedAt : undefined,
    });

    return accumulator;
  }, []);

  const rawPagination =
    nested.pagination && typeof nested.pagination === "object"
      ? (nested.pagination as Record<string, unknown>)
      : null;

  return {
    orders,
    pagination: rawPagination
      ? {
          currentPage: Number(rawPagination.currentPage ?? 1),
          totalPages: Number(rawPagination.totalPages ?? 1),
          totalItems: Number(rawPagination.totalItems ?? orders.length),
        }
      : null,
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

export async function loginCSR(payload: LoginPayload): Promise<LoginData> {
  const now = Date.now();
  if (loginBackoffUntil > now) {
    throw new Error("Забагато спроб входу. Спробуйте через кілька секунд");
  }

  try {
    const data = await apiFetch<LoginData>(`${AUTH_API_URL}/login`, {
      method: "POST",
      body: payload,
    });

    return {
      user: normalizeUser(data.user as User & { _id?: string; name?: string }),
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "status" in error &&
      Number((error as { status?: number }).status) === 429
    ) {
      loginBackoffUntil = Date.now() + AUTH_RATE_LIMIT_BACKOFF_MS;
    }

    throw error;
  }
}

export async function registerCSR(
  payload: RegisterPayload
): Promise<RegisterData> {
  const normalizedName = [payload.firstName, payload.lastName]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim();

  const data = await apiFetch<RegisterData>(`${AUTH_API_URL}/register`, {
    method: "POST",
    body: {
      name: normalizedName || payload.firstName,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
    },
  });

  return {
    user: normalizeUser(data.user as User & { _id?: string; name?: string }),
  };
}

export async function logoutCSR(): Promise<void> {
  await apiFetch<null>(`${AUTH_API_URL}/logout`, {
    method: "POST",
    body: {},
  });
  resetCurrentUserRequestCache();
  resetCommerceRequestCache();
}

export async function logoutAllCSR(): Promise<void> {
  await apiFetch<null>(`${AUTH_API_URL}/logout-all`, {
    method: "POST",
    body: {},
  });
  resetCurrentUserRequestCache();
  resetCommerceRequestCache();
}

export async function getCurrentUserCSR(): Promise<User | null> {
  const now = Date.now();

  if (currentUserBackoffUntil > now) {
    return currentUserSnapshot?.value ?? null;
  }

  if (currentUserSnapshot && isFreshSnapshot(currentUserSnapshot.expiresAt)) {
    return currentUserSnapshot.value;
  }

  if (!currentUserRequest) {
    currentUserRequest = apiFetch<{
      user: (User & { _id?: string; name?: string }) | null;
    }>(`${AUTH_API_URL}/me`, {
      retryOn401: false,
    })
      .then((response) => {
        const normalized = response.user ? normalizeUser(response.user) : null;

        currentUserSnapshot = {
          value: normalized,
          expiresAt: Date.now() + REQUEST_DEDUPE_TTL_MS,
        };
        currentUserBackoffUntil = 0;

        return normalized;
      })
      .catch((error) => {
        if (
          typeof error === "object" &&
          error &&
          "status" in error &&
          Number((error as { status?: number }).status) === 429
        ) {
          currentUserBackoffUntil = Date.now() + AUTH_RATE_LIMIT_BACKOFF_MS;

          if (currentUserSnapshot) {
            return currentUserSnapshot.value;
          }

          return null;
        }

        throw error;
      })
      .finally(() => {
        currentUserRequest = null;
      });
  }

  return currentUserRequest;
}

export async function validateSessionCSR(): Promise<ValidateSessionData> {
  return apiFetch<ValidateSessionData>(`${AUTH_API_URL}/validate`);
}

export async function updateProfileCSR(
  payload: UpdateProfilePayload
): Promise<User> {
  const formData = new FormData();

  if (payload.name?.trim()) {
    formData.set("name", payload.name.trim());
  }

  if (payload.phone?.trim()) {
    formData.set("phone", payload.phone.trim());
  }

  if (payload.theme) {
    formData.set("theme", payload.theme);
  }

  if (payload.avatarFile instanceof File) {
    formData.set("avatar", payload.avatarFile);
  }

  const data = await apiFetch<User & { _id?: string; name?: string }>(
    `${AUTH_API_URL}/update-profile`,
    {
      method: "PUT",
      body: formData,
    }
  );

  const normalized = normalizeUser(data);
  currentUserSnapshot = {
    value: normalized,
    expiresAt: Date.now() + REQUEST_DEDUPE_TTL_MS,
  };
  return normalized;
}

export async function changePasswordCSR(
  payload: ChangePasswordPayload
): Promise<void> {
  await apiFetch<null>(`${AUTH_API_URL}/change-password`, {
    method: "PUT",
    body: payload,
  });
}

export async function forgotPasswordCSR(
  payload: ForgotPasswordPayload
): Promise<void> {
  await apiFetch<null>(`${AUTH_API_URL}/forgot-password`, {
    method: "POST",
    body: payload,
  });
}

export async function resetPasswordCSR(
  token: string,
  payload: ResetPasswordPayload
): Promise<void> {
  await apiFetch<null>(`${AUTH_API_URL}/reset-password/${token}`, {
    method: "PUT",
    body: payload,
  });
}

export function getOAuthRedirectUrl(
  provider: "google" | "facebook",
  returnTo?: string
): string {
  const url = new URL(`${AUTH_API_URL}/${provider}`);

  if (returnTo?.trim()) {
    url.searchParams.set("returnTo", returnTo);
  }

  return url.toString();
}

export async function getCartCSR(): Promise<CartData> {
  if (cartSnapshot && isFreshSnapshot(cartSnapshot.expiresAt)) {
    return cartSnapshot.value;
  }

  if (!cartRequest) {
    cartRequest = apiFetch<ApiResponse<CartData> | CartData>(
      `${USERS_PROXY_BASE}/cart?_ts=${Date.now()}`
    )
      .then((payload) => {
        const normalized = normalizeCartPayload(payload);
        cartSnapshot = {
          value: normalized,
          expiresAt: Date.now() + REQUEST_DEDUPE_TTL_MS,
        };
        return normalized;
      })
      .finally(() => {
        cartRequest = null;
      });
  }

  return cartRequest;
}

export async function addToCartCSR(
  payload: AddToCartPayload
): Promise<CartData> {
  const data = await apiFetch<ApiResponse<CartData> | CartData>(
    `${USERS_PROXY_BASE}/cart`,
    {
      method: "POST",
      body: payload,
    }
  );

  const normalized = normalizeCartPayload(data);
  cartSnapshot = {
    value: normalized,
    expiresAt: Date.now() + REQUEST_DEDUPE_TTL_MS,
  };
  return normalized;
}

export async function removeFromCartCSR(productId: string): Promise<CartData> {
  const data = await apiFetch<ApiResponse<CartData> | CartData>(
    `${USERS_PROXY_BASE}/cart/${productId}`,
    {
      method: "DELETE",
    }
  );

  const normalized = normalizeCartPayload(data);
  cartSnapshot = {
    value: normalized,
    expiresAt: Date.now() + REQUEST_DEDUPE_TTL_MS,
  };
  return normalized;
}

export async function clearCartCSR(): Promise<CartData> {
  const data = await apiFetch<ApiResponse<CartData> | CartData>(
    `${USERS_PROXY_BASE}/cart`,
    {
      method: "DELETE",
    }
  );

  const normalized = normalizeCartPayload(data);
  cartSnapshot = {
    value: normalized,
    expiresAt: Date.now() + REQUEST_DEDUPE_TTL_MS,
  };
  return normalized;
}

export async function getWishlistCSR(): Promise<WishlistResult> {
  if (wishlistSnapshot && isFreshSnapshot(wishlistSnapshot.expiresAt)) {
    return wishlistSnapshot.value;
  }

  if (!wishlistRequest) {
    wishlistRequest = apiFetch<unknown>(
      `${USERS_PROXY_BASE}/wishlist?_ts=${Date.now()}`
    )
      .then((payload) => {
        const normalized = normalizeWishlistPayload(payload);
        wishlistSnapshot = {
          value: normalized,
          expiresAt: Date.now() + REQUEST_DEDUPE_TTL_MS,
        };
        return normalized;
      })
      .finally(() => {
        wishlistRequest = null;
      });
  }

  return wishlistRequest;
}

export async function getOrdersCSR(): Promise<OrdersResult> {
  const response = await apiClient.get("/api/orders");

  return normalizeOrdersPayload(response.data);
}

export async function addToWishlistCSR(
  productId: string
): Promise<WishlistResult> {
  const data = await apiFetch<unknown>(
    `${USERS_PROXY_BASE}/wishlist/${productId}`,
    {
      method: "POST",
    }
  );

  const normalized = normalizeWishlistPayload(data);
  wishlistSnapshot = {
    value: normalized,
    expiresAt: Date.now() + REQUEST_DEDUPE_TTL_MS,
  };
  return normalized;
}

export async function removeFromWishlistCSR(
  productId: string
): Promise<WishlistResult> {
  const data = await apiFetch<unknown>(
    `${USERS_PROXY_BASE}/wishlist/${productId}`,
    {
      method: "DELETE",
    }
  );

  const normalized = normalizeWishlistPayload(data);
  wishlistSnapshot = {
    value: normalized,
    expiresAt: Date.now() + REQUEST_DEDUPE_TTL_MS,
  };
  return normalized;
}

export async function createOrderCSR(
  payload: CreateOrderPayload
): Promise<OrderResult> {
  const rawPayload = payload as CreateOrderPayload & {
    paymentMethod?: string;
    deliveryMethod?: string;
    shippingAddress?: {
      name?: string;
      fullName?: string;
      phone?: string;
      city?: string;
      street?: string;
      building?: string;
      apartment?: string;
      comment?: string;
      addressLine1?: string;
      addressLine2?: string;
    };
  };

  const address = rawPayload.shippingAddress ?? {};
  const rawPaymentMethod = (rawPayload.paymentMethod ?? "") as string;
  const rawDeliveryMethod = (rawPayload.deliveryMethod ?? "") as string;

  const normalizedPaymentMethod =
    rawPaymentMethod === "cash_on_delivery"
      ? "cash"
      : rawPaymentMethod === "card" ||
        rawPaymentMethod === "cash" ||
        rawPaymentMethod === "online"
      ? rawPaymentMethod
      : "cash";

  const normalizedDeliveryMethod =
    rawDeliveryMethod === "nova_poshta"
      ? "post"
      : rawDeliveryMethod === "courier" ||
        rawDeliveryMethod === "pickup" ||
        rawDeliveryMethod === "post"
      ? rawDeliveryMethod
      : "courier";

  const normalizedPayload = {
    items: payload.items,
    shippingAddress: {
      name: (address.name ?? address.fullName ?? "").trim(),
      phone: (address.phone ?? "").trim(),
      city: (address.city ?? "").trim(),
      street: (address.street ?? address.addressLine1 ?? "").trim(),
      building: (address.building ?? address.addressLine2 ?? "1").trim(),
      ...(address.apartment ? { apartment: address.apartment.trim() } : {}),
      ...(address.comment ? { comment: address.comment.trim() } : {}),
    },
    paymentMethod: normalizedPaymentMethod,
    deliveryMethod: normalizedDeliveryMethod,
  };

  const response = await apiClient.post("/api/orders", normalizedPayload);
  return normalizeOrderPayload(response.data);
}

export async function createQuickOrderCSR(
  payload: QuickOrderPayload
): Promise<OrderResult> {
  const fallbackAddressValue = "Не вказано";
  const normalizedPaymentMethod =
    payload.paymentMethod === "cash_on_delivery"
      ? "cash"
      : payload.paymentMethod === "cash" || payload.paymentMethod === "card"
      ? payload.paymentMethod
      : "card";
  const normalizedDeliveryMethod =
    payload.deliveryMethod === "nova_poshta"
      ? "courier"
      : payload.deliveryMethod === "courier" ||
        payload.deliveryMethod === "pickup"
      ? payload.deliveryMethod
      : "courier";

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
    paymentMethod: normalizedPaymentMethod,
    deliveryMethod: normalizedDeliveryMethod,
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
  const normalizedComment = payload.text?.trim();

  if (!normalizedComment || normalizedComment.length < 10) {
    throw new Error("Відгук має містити щонайменше 10 символів");
  }

  const primaryBody: Record<string, unknown> = {
    rating: normalizedRating,
    comment: normalizedComment,
    ...(payload.guestName?.trim()
      ? { guestName: payload.guestName.trim() }
      : {}),
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
    const response = await fetch(`/api/proxy${endpoint}`, {
      method: method.toUpperCase(),
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
