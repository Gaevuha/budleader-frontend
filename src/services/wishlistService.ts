import {
  addToWishlistCSR,
  getWishlistCSR,
  removeFromWishlistCSR,
  resetCommerceRequestCache,
  type WishlistResult,
} from "@/services/apiClient";

export async function getWishlist(): Promise<WishlistResult> {
  return getWishlistCSR();
}

export async function addToWishlist(
  productId: string
): Promise<WishlistResult> {
  resetCommerceRequestCache();
  return addToWishlistCSR(productId);
}

export async function removeFromWishlist(
  productId: string
): Promise<WishlistResult> {
  resetCommerceRequestCache();
  return removeFromWishlistCSR(productId);
}
