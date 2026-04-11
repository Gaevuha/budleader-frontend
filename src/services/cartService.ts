import { apiFetch } from "@/services/api";
import {
  type AddToCartPayload,
  getCartCSR,
  removeFromCartCSR,
  clearCartCSR,
  resetCommerceRequestCache,
} from "@/services/apiClient";
import type { CartData } from "@/types/cart";

const CART_PROXY_BASE = "/api/proxy/api/users/cart";

export async function getCart(): Promise<CartData> {
  return getCartCSR();
}

export async function addToCart(payload: AddToCartPayload): Promise<CartData> {
  await apiFetch(CART_PROXY_BASE, {
    method: "POST",
    body: payload,
  });

  resetCommerceRequestCache();
  return getCartCSR();
}

export async function updateCartItem(
  productId: string,
  quantity: number
): Promise<CartData> {
  await apiFetch(`${CART_PROXY_BASE}/${productId}`, {
    method: "PUT",
    body: { quantity },
  });

  resetCommerceRequestCache();
  return getCartCSR();
}

export async function removeFromCart(productId: string): Promise<CartData> {
  return removeFromCartCSR(productId);
}

export async function clearCart(): Promise<CartData> {
  return clearCartCSR();
}
