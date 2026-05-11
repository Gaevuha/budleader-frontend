"use server";

import type { AxiosInstance } from "axios";

import {
  ENDPOINTS,
  type AddToCartPayload,
  type QuickOrderPayload,
  type WishlistResult,
  hasCartPayload,
  normalizeCartPayload,
  normalizeWishlistPayload,
} from "@/services/api";
import { createApiServer } from "@/services/apiServer";
import type { CartData } from "@/types/cart";

type ServerApi = AxiosInstance;

type MergeGuestCartItem = {
  productId: string;
  quantity: number;
};

const getServerCart = async (api?: ServerApi): Promise<CartData> => {
  const serverApi = api ?? (await createApiServer());
  const response = await serverApi.get(ENDPOINTS.CART);
  return normalizeCartPayload(response.data);
};

const getServerWishlist = async (api?: ServerApi): Promise<WishlistResult> => {
  const serverApi = api ?? (await createApiServer());
  const response = await serverApi.get(ENDPOINTS.WISHLIST);
  return normalizeWishlistPayload(response.data);
};

const normalizeCartMutationResponse = (
  payload: unknown,
  api: ServerApi
): Promise<CartData> | CartData => {
  return hasCartPayload(payload)
    ? normalizeCartPayload(payload)
    : getServerCart(api);
};

const updateServerCartItem = async (
  api: ServerApi,
  productId: string,
  quantity: number
): Promise<CartData> => {
  const response = await api.put(`${ENDPOINTS.CART}/${productId}`, {
    quantity,
  });

  return normalizeCartMutationResponse(response.data, api);
};

const addServerCartItem = async (
  api: ServerApi,
  payload: AddToCartPayload
): Promise<CartData> => {
  const response = await api.post(ENDPOINTS.CART, payload);

  return normalizeCartMutationResponse(response.data, api);
};

const removeServerCartItem = async (
  api: ServerApi,
  productId: string
): Promise<CartData> => {
  const response = await api.delete(`${ENDPOINTS.CART}/${productId}`);

  return normalizeCartMutationResponse(response.data, api);
};

const clearServerCart = async (api: ServerApi): Promise<CartData> => {
  const response = await api.delete(ENDPOINTS.CART);

  return normalizeCartMutationResponse(response.data, api);
};

const getWishlistIdSet = (wishlist: WishlistResult): Set<string> => {
  return new Set(
    wishlist.items
      .map((item) => item.id)
      .filter((productId): productId is string => Boolean(productId))
  );
};

const normalizeGuestCartItems = (
  items: MergeGuestCartItem[]
): MergeGuestCartItem[] => {
  return items
    .map((item) => ({
      productId: item.productId.trim(),
      quantity: Math.max(1, item.quantity),
    }))
    .filter((item) => item.productId.length > 0);
};

const getMergedCartQuantity = (
  currentCart: CartData,
  productId: string,
  quantity: number
): number => {
  const existing = currentCart.items.find(
    (item) => item.productId === productId
  );

  return (existing?.quantity ?? 0) + Math.max(1, quantity);
};

const getServerCartResponse = async (api: ServerApi): Promise<CartData> => {
  const response = await api.get(ENDPOINTS.CART);
  return normalizeCartPayload(response.data);
};

export async function addToCartAction(
  payload: AddToCartPayload
): Promise<CartData> {
  const api = await createApiServer();
  return addServerCartItem(api, payload);
}

export async function updateCartItemAction(
  productId: string,
  quantity: number
): Promise<CartData> {
  const api = await createApiServer();
  return updateServerCartItem(api, productId, quantity);
}

export async function removeFromCartAction(
  productId: string
): Promise<CartData> {
  const api = await createApiServer();
  return removeServerCartItem(api, productId);
}

export async function clearCartAction(): Promise<CartData> {
  const api = await createApiServer();
  return clearServerCart(api);
}

export async function toggleWishlistAction(
  productId: string,
  shouldAdd: boolean
): Promise<WishlistResult> {
  const api = await createApiServer();

  if (shouldAdd) {
    await api.post(`${ENDPOINTS.WISHLIST}/${productId}`);
  } else {
    await api.delete(`${ENDPOINTS.WISHLIST}/${productId}`);
  }

  return getServerWishlist(api);
}

export async function mergeGuestCartAction(
  items: MergeGuestCartItem[]
): Promise<CartData> {
  const api = await createApiServer();
  const normalizedItems = normalizeGuestCartItems(items);

  if (normalizedItems.length === 0) {
    return getServerCartResponse(api);
  }

  let currentCart = await getServerCartResponse(api);

  for (const item of normalizedItems) {
    const mergedQuantity = getMergedCartQuantity(
      currentCart,
      item.productId,
      item.quantity
    );

    currentCart = currentCart.items.some(
      (cartItem) => cartItem.productId === item.productId
    )
      ? await updateServerCartItem(api, item.productId, mergedQuantity)
      : await addServerCartItem(api, {
          productId: item.productId,
          quantity: item.quantity,
        });
  }

  return currentCart;
}

export async function mergeGuestWishlistAction(
  productIds: string[]
): Promise<WishlistResult> {
  const api = await createApiServer();
  const normalizedIds = productIds
    .map((productId) => productId.trim())
    .filter((productId) => productId.length > 0);

  if (normalizedIds.length === 0) {
    return getServerWishlist(api);
  }

  let currentWishlist = await getServerWishlist(api);
  const existingIds = getWishlistIdSet(currentWishlist);

  for (const productId of normalizedIds) {
    if (existingIds.has(productId)) {
      continue;
    }

    await api.post(`${ENDPOINTS.WISHLIST}/${productId}`);
    existingIds.add(productId);
  }

  currentWishlist = await getServerWishlist(api);
  return currentWishlist;
}

export async function createQuickOrderAction(
  payload: QuickOrderPayload
): Promise<void> {
  const api = await createApiServer();
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
  const fallbackAddressValue = "Не вказано";

  await api.post(`${ENDPOINTS.ORDERS}/quick`, {
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
}
