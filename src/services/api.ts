import axios from "axios";

import { apiClient } from "@/services/apiClient";
import { parseCatalogViewMode } from "@/services/catalogViewPreference";
import { parseThemeMode } from "@/services/themePreference";
import type { Pagination } from "@/types/api";
import type {
  AppProduct,
  CatalogViewMode,
  ProductReview,
  ThemeMode,
} from "@/types/app";
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
import type { CartData } from "@/types/cart";
import type { CreateOrderPayload, Order, OrdersResult } from "@/types/order";
import type { Product } from "@/types/product";
import { PRODUCT_PLACEHOLDER_SRC, resolveMediaUrl } from "@/utils/media";

// Core config

const normalizeApiBaseUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.replace(/\/+$/, "");
  return trimmed.replace(/\/api$/i, "");
};

export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
);

export const ENDPOINTS = {
  AUTH: "/api/auth",
  CATEGORIES: "/api/categories",
  PRODUCTS: "/api/products",
  USERS: "/api/users",
  CART: "/api/users/cart",
  WISHLIST: "/api/users/wishlist",
  USERS_THEME: "/api/users/theme",
  USERS_CATALOG_VIEW: "/api/users/catalog-view",
  ORDERS: "/api/orders",
  REVIEWS: "/api/reviews",
} as const;

export const AUTH_API_URL = ENDPOINTS.AUTH;

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

// Shared transport and payload helpers

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

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

const getErrorStatus = (error: unknown): number | undefined => {
  if (error instanceof ApiFetchError) {
    return error.status;
  }

  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }

  return undefined;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Сталася помилка запиту"
): string => {
  if (error instanceof ApiFetchError) {
    return extractApiMessage(error.data) ?? error.message ?? fallback;
  }

  if (axios.isAxiosError(error)) {
    return extractApiMessage(error.response?.data) ?? error.message ?? fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const logCartMutationPayload = (label: string, payload: unknown) => {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.debug(`[cart api] ${label}`, payload);
};

const unwrapApiData = <T>(payload: unknown): T => {
  if (isRecord(payload) && "data" in payload) {
    return payload.data as T;
  }

  return payload as T;
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

const extractApiProducts = (payload: unknown): unknown[] => {
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

export const mapApiPayloadToProducts = (payload: unknown): Product[] => {
  return extractApiProducts(payload)
    .map((item) => normalizeProductCore(item))
    .filter((item): item is Product => item !== null);
};

export const extractApiPagination = (payload: unknown): Pagination | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  let pagination: Record<string, unknown> | null = null;

  if (isRecord(candidate.pagination)) {
    pagination = candidate.pagination;
  } else if (isRecord(candidate.data)) {
    const nested = candidate.data;
    pagination = isRecord(nested.pagination)
      ? nested.pagination
      : {
          page: nested.page ?? nested.currentPage,
          limit: nested.limit ?? nested.itemsPerPage,
          total: nested.total ?? nested.totalItems,
          totalPages: nested.totalPages,
        };
  }

  if (!pagination) {
    return null;
  }

  const normalized = {
    page: pagination.page ?? pagination.currentPage,
    limit: pagination.limit ?? pagination.itemsPerPage,
    total: pagination.total ?? pagination.totalItems,
    totalPages: pagination.totalPages,
  };

  const hasNumbers =
    Number.isFinite(Number(normalized.page)) &&
    Number.isFinite(Number(normalized.limit)) &&
    Number.isFinite(Number(normalized.total)) &&
    Number.isFinite(Number(normalized.totalPages));

  return hasNumbers
    ? {
        page: Number(normalized.page),
        limit: Number(normalized.limit),
        total: Number(normalized.total),
        totalPages: Number(normalized.totalPages),
      }
    : null;
};

export const mapApiPayloadToAppProducts = (payload: unknown): AppProduct[] => {
  return mapApiPayloadToProducts(payload)
    .map((item) => mapApiProductToAppProduct(item))
    .filter((item): item is AppProduct => item !== null);
};

// Domain normalizers: auth and commerce

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

const normalizeCartPayload = (payload: unknown): CartData => {
  const toFiniteNumberOr = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const normalizeCartItem = (input: unknown) => {
    const item =
      input && typeof input === "object"
        ? (input as Record<string, unknown>)
        : {};

    const productObj =
      item.product && typeof item.product === "object"
        ? (item.product as Record<string, unknown>)
        : null;

    const productId =
      (item.productId as string | undefined) ??
      (productObj?._id as string | undefined) ??
      (productObj?.id as string | undefined) ??
      (item.product as string | undefined) ??
      "";

    const quantity = Math.max(1, toFiniteNumberOr(item.quantity, 1));
    const unitPrice = Math.max(
      0,
      toFiniteNumberOr(item.price, toFiniteNumberOr(productObj?.price, 0))
    );
    const stock =
      productObj && ("stock" in productObj || "quantity" in productObj)
        ? Math.max(
            0,
            toFiniteNumberOr(productObj.stock ?? productObj.quantity, 0)
          )
        : undefined;

    return {
      id: (item.id as string | undefined) ?? productId,
      productId,
      quantity,
      price: unitPrice,
      product: productObj
        ? {
            ...(productObj as object),
            id: (productObj.id as string | undefined) ?? productId,
            name:
              (productObj.name as string | undefined)?.trim() ||
              "Товар без назви",
            price: unitPrice,
            stock,
            image: resolveMediaUrl(
              (productObj.image as string | undefined) ??
                (productObj.mainImage as string | undefined) ??
                PRODUCT_PLACEHOLDER_SRC
            ),
          }
        : {
            id: productId,
            name: "Товар без назви",
            price: unitPrice,
            stock,
            image: PRODUCT_PLACEHOLDER_SRC,
          },
    };
  };

  if (payload && typeof payload === "object") {
    const raw = payload as Record<string, unknown>;
    const nested = isRecord(raw.data) ? raw.data : raw;

    if (Array.isArray(nested.items)) {
      const items = nested.items.map(normalizeCartItem);
      return {
        items,
        subtotal:
          typeof nested.subtotal === "number" &&
          Number.isFinite(nested.subtotal)
            ? nested.subtotal
            : items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        itemsCount:
          typeof nested.itemsCount === "number" &&
          Number.isFinite(nested.itemsCount)
            ? nested.itemsCount
            : items.reduce((sum, item) => sum + item.quantity, 0),
      };
    }

    if (Array.isArray(raw.data)) {
      const items = raw.data.map(normalizeCartItem);

      return {
        items,
        subtotal: items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),
        itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
      };
    }
  }

  return {
    items: [],
    subtotal: 0,
    itemsCount: 0,
  };
};

const isCartItemCandidate = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  const productId = value.productId;
  const product = value.product;
  const quantity = value.quantity;

  const hasProductRef =
    typeof productId === "string" ||
    typeof product === "string" ||
    isRecord(product);

  return hasProductRef && toFiniteNumber(quantity) !== undefined;
};

const getStructuredCartItems = (payload: unknown): unknown[] | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const nested = isRecord(payload.data) ? payload.data : payload;

  if (Array.isArray(nested.items)) {
    return nested.items.every(isCartItemCandidate) ? nested.items : null;
  }

  if (Array.isArray(payload.data)) {
    return payload.data.every(isCartItemCandidate) ? payload.data : null;
  }

  return null;
};

const hasCartPayload = (payload: unknown): boolean => {
  return getStructuredCartItems(payload) !== null;
};

export interface WishlistResult {
  items: AppProduct[];
}

const normalizeWishlistPayload = (payload: unknown): WishlistResult => {
  if (!payload || typeof payload !== "object") {
    return { items: [] };
  }

  const raw = payload as Record<string, unknown>;
  const rows = Array.isArray(raw.data)
    ? raw.data
    : Array.isArray(payload)
    ? (payload as unknown[])
    : [];

  return {
    items: rows
      .map((item) => mapApiProductToAppProduct(item))
      .filter((item): item is AppProduct => item !== null),
  };
};

// Domain normalizers: orders and reviews

export interface OrderResult {
  orderId?: string;
  status?: string;
  isGuest?: boolean;
}

const normalizeOrderStatus = (status: unknown): string => {
  return typeof status === "string" && status.trim() ? status : "pending";
};

const normalizeOrderPayload = (payload: unknown): OrderResult => {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const raw = payload as Record<string, unknown>;
  const nested = isRecord(raw.data) ? raw.data : raw;

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
    return { orders: [], pagination: null };
  }

  const raw = payload as Record<string, unknown>;
  const nested = isRecord(raw.data) ? raw.data : raw;
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
        const product = isRecord(record.product) ? record.product : null;
        const productId =
          (product?._id as string | undefined) ??
          (product?.id as string | undefined) ??
          (record.productId as string | undefined);
        const quantity = Number(record.quantity ?? 1);
        const price = Number(record.price ?? 0);
        const total = Number(record.total ?? quantity * price);

        return {
          id:
            (record.id as string | undefined) ??
            productId ??
            `${id}-${Math.random().toString(36).slice(2, 10)}`,
          productId,
          name:
            (record.name as string | undefined) ??
            (product?.name as string | undefined) ??
            "Товар без назви",
          quantity: Number.isFinite(quantity) ? quantity : 1,
          price: Number.isFinite(price) ? price : 0,
          total: Number.isFinite(total) ? total : 0,
          image:
            (product?.mainImage as string | undefined) ??
            (product?.image as string | undefined),
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

  return {
    orders,
    pagination: isRecord(nested.pagination)
      ? {
          currentPage: Number(nested.pagination.currentPage ?? 1),
          totalPages: Number(nested.pagination.totalPages ?? 1),
          totalItems: Number(nested.pagination.totalItems ?? orders.length),
        }
      : null,
  };
};

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

export interface ProductReviewsResult {
  reviews: ProductReview[];
  averageRating: number;
  totalReviews: number;
}

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
  const nested = isRecord(raw.data) ? raw.data : raw;
  const stats = isRecord(nested.stats) ? nested.stats : null;
  const averageRating = Number(stats?.averageRating ?? 0);
  const totalReviews = Number(stats?.totalReviews ?? reviews.length);

  return {
    reviews,
    averageRating: Number.isFinite(averageRating) ? averageRating : 0,
    totalReviews: Number.isFinite(totalReviews) ? totalReviews : reviews.length,
  };
};

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

const extractSubmittedReview = (
  payload: unknown
): SubmitProductReviewResult => {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const direct = payload as Record<string, unknown>;
  const nestedData = isRecord(direct.data) ? direct.data : null;
  const nestedReview =
    nestedData && isRecord(nestedData.review) ? nestedData.review : null;
  const source = nestedReview ?? nestedData ?? direct;

  return {
    id:
      typeof (source.id ?? source._id) === "string"
        ? ((source.id ?? source._id) as string)
        : undefined,
    user:
      typeof (source.user ?? source.author ?? source.userName) === "string"
        ? ((source.user ?? source.author ?? source.userName) as string)
        : undefined,
    text:
      typeof (source.text ?? source.comment ?? source.message) === "string"
        ? ((source.text ?? source.comment ?? source.message) as string)
        : undefined,
    date:
      typeof (source.date ?? source.createdAt) === "string"
        ? ((source.date ?? source.createdAt) as string)
        : undefined,
    rating:
      typeof source.rating === "number" && Number.isFinite(source.rating)
        ? Math.max(1, Math.min(5, source.rating))
        : undefined,
  };
};

// Client-side domain types

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
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  sort?: string;
  order?: "asc" | "desc" | string;
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

export interface AddToCartPayload {
  productId: string;
  quantity: number;
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

export interface ThemePreferenceResponse {
  theme: ThemeMode;
}

export interface CatalogViewPreferenceResponse {
  catalogViewMode: CatalogViewMode;
}

// Client-side product and catalog methods

const requestProducts = async (
  params: GetProductsCSRParams
): Promise<GetProductsCSRResult> => {
  const response = await apiClient.get(ENDPOINTS.PRODUCTS, {
    params: {
      page: params.page,
      limit: params.limit,
      ...(params.category ? { category: params.category } : {}),
      ...(params.brand ? { brand: params.brand } : {}),
      ...(params.isNew ? { isNewProduct: true } : {}),
      ...(params.isSale ? { isOnSale: true } : {}),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.minPrice?.trim() ? { minPrice: params.minPrice.trim() } : {}),
      ...(params.maxPrice?.trim() ? { maxPrice: params.maxPrice.trim() } : {}),
      ...(params.inStock ? { inStock: true } : {}),
      ...(params.sort ? { sort: params.sort } : {}),
      ...(params.order ? { order: params.order } : {}),
    },
  });

  return {
    products: mapApiPayloadToAppProducts(response.data),
    pagination: extractApiPagination(response.data),
  };
};

export async function getProductsCSR(
  params: GetProductsCSRParams
): Promise<GetProductsCSRResult> {
  return requestProducts(params);
}

export async function fetchProducts({
  page,
  limit,
  search,
}: FetchProductsParams): Promise<FetchProductsResult> {
  return requestProducts({ page, limit, search });
}

export async function getCategoryProductsCSR(
  category: CategoryLookupInput,
  limit = 90
): Promise<AppProduct[]> {
  const categoryTokens = [category.id, category.slug, category.name]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, array) => array.indexOf(value) === index);

  for (const token of categoryTokens) {
    const response = await apiClient.get(ENDPOINTS.PRODUCTS, {
      params: {
        page: 1,
        limit,
        category: token,
        sort: "rating",
        order: "desc",
      },
    });

    const products = mapApiPayloadToAppProducts(response.data);

    if (products.length > 0) {
      return products;
    }
  }

  return [];
}

export async function getProductReviewsCSR(
  productId: string
): Promise<ProductReviewsResult> {
  const response = await apiClient.get(
    `${ENDPOINTS.REVIEWS}/products/${productId}`
  );
  return normalizeProductReviewsResult(response.data);
}

// Client-side auth methods

export async function loginCSR(payload: LoginPayload): Promise<LoginData> {
  try {
    const response = await apiClient.post(`${ENDPOINTS.AUTH}/login`, payload);
    const data = unwrapApiData<LoginData>(response.data);

    return {
      ...data,
      user: normalizeUser(data.user as User & { _id?: string; name?: string }),
    };
  } catch (error) {
    if (getErrorStatus(error) === 429) {
      throw new Error("Забагато спроб входу. Спробуйте через кілька секунд");
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

  const response = await apiClient.post(`${ENDPOINTS.AUTH}/register`, {
    name: normalizedName || payload.firstName,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    password: payload.password,
    phone: payload.phone,
  });
  const data = unwrapApiData<RegisterData>(response.data);

  return {
    ...data,
    user: normalizeUser(data.user as User & { _id?: string; name?: string }),
  };
}

export async function logoutCSR(): Promise<void> {
  await apiClient.post(`${ENDPOINTS.AUTH}/logout`, {});
}

export async function logoutAllCSR(): Promise<void> {
  await apiClient.post(`${ENDPOINTS.AUTH}/logout-all`, {});
}

export async function getCurrentUserCSR(): Promise<User | null> {
  try {
    const response = await apiClient.get(`${ENDPOINTS.AUTH}/me`);
    return unwrapUser(response.data);
  } catch (error) {
    if (getErrorStatus(error) === 401) {
      return null;
    }

    throw error;
  }
}

export const getCurrentUser = getCurrentUserCSR;
export const logout = logoutCSR;

export async function validateSessionCSR(): Promise<ValidateSessionData> {
  const response = await apiClient.get(`${ENDPOINTS.AUTH}/validate`);
  return unwrapApiData<ValidateSessionData>(response.data);
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

  const response = await apiClient.put(
    `${ENDPOINTS.AUTH}/update-profile`,
    formData
  );
  return normalizeUser(
    unwrapApiData<User & { _id?: string; name?: string }>(response.data)
  );
}

export async function changePasswordCSR(
  payload: ChangePasswordPayload
): Promise<void> {
  await apiClient.put(`${ENDPOINTS.AUTH}/change-password`, payload);
}

export async function forgotPasswordCSR(
  payload: ForgotPasswordPayload
): Promise<void> {
  await apiClient.post(`${ENDPOINTS.AUTH}/forgot-password`, payload);
}

export async function resetPasswordCSR(
  token: string,
  payload: ResetPasswordPayload
): Promise<void> {
  await apiClient.put(`${ENDPOINTS.AUTH}/reset-password/${token}`, payload);
}

export function getOAuthRedirectUrl(
  provider: "google" | "facebook",
  returnTo?: string
): string {
  const search = new URLSearchParams();

  if (returnTo?.trim()) {
    search.set("state", returnTo.trim());
  }

  const query = search.toString();
  return query
    ? `${ENDPOINTS.AUTH}/${provider}?${query}`
    : `${ENDPOINTS.AUTH}/${provider}`;
}

// Client-side cart and wishlist methods

export async function getCartCSR(): Promise<CartData> {
  const response = await apiClient.get(ENDPOINTS.CART);
  return normalizeCartPayload(response.data);
}

export async function addToCartCSR(
  payload: AddToCartPayload
): Promise<CartData> {
  const response = await apiClient.post(ENDPOINTS.CART, payload);
  logCartMutationPayload("addToCart response", response.data);
  return hasCartPayload(response.data)
    ? normalizeCartPayload(response.data)
    : getCartCSR();
}

export async function updateCartItem(
  productId: string,
  quantity: number
): Promise<CartData> {
  const response = await apiClient.put(`${ENDPOINTS.CART}/${productId}`, {
    quantity,
  });
  logCartMutationPayload("updateCart response", response.data);
  return hasCartPayload(response.data)
    ? normalizeCartPayload(response.data)
    : getCartCSR();
}

export async function removeFromCartCSR(productId: string): Promise<CartData> {
  const response = await apiClient.delete(`${ENDPOINTS.CART}/${productId}`);
  logCartMutationPayload("removeFromCart response", response.data);
  return hasCartPayload(response.data)
    ? normalizeCartPayload(response.data)
    : getCartCSR();
}

export async function clearCartCSR(): Promise<CartData> {
  const response = await apiClient.delete(ENDPOINTS.CART);
  logCartMutationPayload("clearCart response", response.data);
  return hasCartPayload(response.data)
    ? normalizeCartPayload(response.data)
    : getCartCSR();
}

export const getCart = getCartCSR;
export const addToCart = addToCartCSR;
export const removeFromCart = removeFromCartCSR;
export const clearCart = clearCartCSR;

export async function getWishlistCSR(): Promise<WishlistResult> {
  const response = await apiClient.get(ENDPOINTS.WISHLIST);
  return normalizeWishlistPayload(response.data);
}

export async function addToWishlistCSR(
  productId: string
): Promise<WishlistResult> {
  const response = await apiClient.post(`${ENDPOINTS.WISHLIST}/${productId}`);
  return normalizeWishlistPayload(response.data);
}

export async function removeFromWishlistCSR(
  productId: string
): Promise<WishlistResult> {
  const response = await apiClient.delete(`${ENDPOINTS.WISHLIST}/${productId}`);
  return normalizeWishlistPayload(response.data);
}

export const getWishlist = getWishlistCSR;
export const addToWishlist = addToWishlistCSR;
export const removeFromWishlist = removeFromWishlistCSR;

// Client-side order, review, and preference methods

export async function getOrdersCSR(): Promise<OrdersResult> {
  const response = await apiClient.get(ENDPOINTS.ORDERS);
  return normalizeOrdersPayload(response.data);
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
  const rawPaymentMethod: string =
    typeof rawPayload.paymentMethod === "string"
      ? rawPayload.paymentMethod
      : "";
  const rawDeliveryMethod: string =
    typeof rawPayload.deliveryMethod === "string"
      ? rawPayload.deliveryMethod
      : "";

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

  const response = await apiClient.post(ENDPOINTS.ORDERS, {
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
  });

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

  const response = await apiClient.post(`${ENDPOINTS.ORDERS}/quick`, {
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
  });

  return normalizeOrderPayload(response.data);
}

export async function submitProductReviewCSR(
  payload: SubmitProductReviewPayload
): Promise<SubmitProductReviewResult> {
  const normalizedRating = Math.max(1, Math.min(5, Math.round(payload.rating)));
  const normalizedComment = payload.text?.trim();

  if (!normalizedComment || normalizedComment.length < 10) {
    throw new Error("Відгук має містити щонайменше 10 символів");
  }

  try {
    const response = await apiClient.post(
      `${ENDPOINTS.REVIEWS}/products/${payload.productId}`,
      {
        rating: normalizedRating,
        comment: normalizedComment,
        ...(payload.guestName?.trim()
          ? { guestName: payload.guestName.trim() }
          : {}),
      }
    );

    return extractSubmittedReview(response.data);
  } catch (error) {
    if (getErrorStatus(error) === 429) {
      throw new Error(
        "Занадто багато запитів. Повторіть відправку відгуку трохи пізніше"
      );
    }

    throw error;
  }
}

export async function updateThemePreferenceCSR(
  theme: ThemeMode
): Promise<ThemePreferenceResponse> {
  const response = await apiClient.put(ENDPOINTS.USERS_THEME, { theme });
  return unwrapApiData<ThemePreferenceResponse>(response.data);
}

export async function updateCatalogViewPreferenceCSR(
  catalogViewMode: CatalogViewMode
): Promise<CatalogViewPreferenceResponse> {
  const response = await apiClient.put(ENDPOINTS.USERS_CATALOG_VIEW, {
    catalogViewMode,
  });
  return unwrapApiData<CatalogViewPreferenceResponse>(response.data);
}
