"use client";

import { useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { Container } from "@/components/layout/Container/Container";
import { Button } from "@/components/UI/Button/Button";
import { useUser } from "@/queries/authQueries";
import {
  CART_QUERY_KEY,
  setCartQueryData,
  useAddToCartMutation,
  useCartQuery,
  useClearCartMutation,
  useRemoveFromCartMutation,
} from "@/queries/cartQueries";
import { addToCartCSR, removeFromCartCSR } from "@/services/apiClient";
import { useCartStore } from "@/store/cart/cartStore";
import type { CartData } from "@/types/cart";
import styles from "./Cart.module.css";

type CartViewItem = {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  availableStock: number | null;
};

const FALLBACK_IMAGE = "https://placehold.co/80x80?text=No+Image";

const preserveCartOrder = <T extends { productId: string }>(
  items: T[],
  previousOrder: string[]
): T[] => {
  const orderIndex = new Map(
    previousOrder.map((productId, index) => [productId, index])
  );

  return [...items].sort((left, right) => {
    const leftIndex = orderIndex.get(left.productId) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex =
      orderIndex.get(right.productId) ?? Number.MAX_SAFE_INTEGER;

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.productId.localeCompare(right.productId);
  });
};

const toCartData = (items: CartData["items"]): CartData => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    subtotal,
    itemsCount,
  };
};

export default function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: currentUser } = useUser();
  const isAuthenticated = Boolean(currentUser);

  const localCart = useCartStore((state) => state.cart);
  const removeLocal = useCartStore((state) => state.removeFromCart);
  const clearLocal = useCartStore((state) => state.clearCart);
  const setQuantityLocal = useCartStore((state) => state.setQuantity);

  const cartQuery = useCartQuery(isAuthenticated);
  const addToCartMutation = useAddToCartMutation();
  const removeFromCartMutation = useRemoveFromCartMutation();
  const clearCartMutation = useClearCartMutation();
  const serverCartOrderRef = useRef<string[]>([]);

  const cart = useMemo<CartViewItem[]>(() => {
    if (!isAuthenticated) {
      return localCart.map((item) => ({
        id: item.id,
        productId: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        availableStock:
          typeof item.stock === "number" && Number.isFinite(item.stock)
            ? Math.max(0, item.stock)
            : null,
      }));
    }

    const items = cartQuery.data?.items ?? [];
    const previousOrder = serverCartOrderRef.current;
    const sortedItems = preserveCartOrder(items, previousOrder);

    serverCartOrderRef.current = sortedItems.map((item) => item.productId);

    return sortedItems.map((item) => ({
      id: item.id || item.productId,
      productId: item.productId,
      name: item.product?.name ?? "Товар",
      image: item.product?.image ?? FALLBACK_IMAGE,
      price: item.price,
      quantity: item.quantity,
      availableStock:
        typeof item.product?.stock === "number" &&
        Number.isFinite(item.product.stock)
          ? Math.max(0, item.product.stock)
          : null,
    }));
  }, [cartQuery.data?.items, isAuthenticated, localCart]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const itemsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const isLoading = isAuthenticated ? cartQuery.isLoading : false;

  const patchServerCartOptimistically = (
    updater: (currentItems: CartData["items"]) => CartData["items"]
  ) => {
    const prev = queryClient.getQueryData<CartData>(CART_QUERY_KEY);

    if (!prev) {
      return null;
    }

    queryClient.setQueryData<CartData>(
      CART_QUERY_KEY,
      toCartData(updater(prev.items))
    );

    return prev;
  };

  const handleRemoveItem = (productId: string) => {
    if (!isAuthenticated) {
      removeLocal(productId);
      return;
    }

    const prev = patchServerCartOptimistically((items) =>
      items.filter((item) => item.productId !== productId)
    );

    removeFromCartMutation.mutate(productId, {
      onError: () => {
        if (prev) {
          queryClient.setQueryData(CART_QUERY_KEY, prev);
        }
      },
    });
  };

  const handleChangeQuantity = (
    item: CartViewItem,
    operation: "inc" | "dec"
  ) => {
    if (
      operation === "inc" &&
      item.availableStock !== null &&
      item.quantity >= item.availableStock
    ) {
      return;
    }

    const nextQuantity =
      operation === "inc" ? item.quantity + 1 : item.quantity - 1;

    if (nextQuantity < 0) {
      return;
    }

    if (!isAuthenticated) {
      if (nextQuantity === 0) {
        removeLocal(item.productId);
        return;
      }

      setQuantityLocal(item.productId, nextQuantity);
      return;
    }

    if (operation === "inc") {
      const prev = patchServerCartOptimistically((items) =>
        items.map((cartItem) =>
          cartItem.productId === item.productId
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );

      addToCartMutation.mutate(
        {
          productId: item.productId,
          quantity: 1,
        },
        {
          onError: () => {
            if (prev) {
              queryClient.setQueryData(CART_QUERY_KEY, prev);
            }
          },
        }
      );

      return;
    }

    const prev = patchServerCartOptimistically((items) => {
      if (nextQuantity === 0) {
        return items.filter(
          (cartItem) => cartItem.productId !== item.productId
        );
      }

      return items.map((cartItem) =>
        cartItem.productId === item.productId
          ? { ...cartItem, quantity: nextQuantity }
          : cartItem
      );
    });

    void (async () => {
      try {
        if (nextQuantity === 0) {
          const updatedCart = await removeFromCartCSR(item.productId);
          setCartQueryData(queryClient, updatedCart);
          return;
        }

        await removeFromCartCSR(item.productId);

        const updatedCart = await addToCartCSR({
          productId: item.productId,
          quantity: nextQuantity,
        });

        setCartQueryData(queryClient, updatedCart);
      } catch {
        if (prev) {
          queryClient.setQueryData(CART_QUERY_KEY, prev);
        }
      }
    })();
  };

  const handleClear = () => {
    if (!isAuthenticated) {
      clearLocal();
      return;
    }

    const prev = patchServerCartOptimistically(() => []);

    clearCartMutation.mutate(undefined, {
      onError: () => {
        if (prev) {
          queryClient.setQueryData(CART_QUERY_KEY, prev);
        }
      },
    });
  };

  const handleCheckout = () => {
    router.push("/checkout");
  };

  if (isLoading) {
    return (
      <Container className={styles.container}>
        <div className={styles.emptyCart}>
          <h2>Завантаження кошика...</h2>
        </div>
      </Container>
    );
  }

  if (isAuthenticated && cartQuery.isError) {
    return (
      <Container className={styles.container}>
        <div className={styles.emptyCart}>
          <h2>Не вдалося завантажити кошик</h2>
          <p>Спробуйте оновити сторінку або увійти повторно.</p>
        </div>
      </Container>
    );
  }

  if (cart.length === 0) {
    return (
      <Container className={styles.container}>
        <div className={styles.emptyCart}>
          <div className={styles.emptyIcon} aria-hidden>
            BAG
          </div>
          <h2>Ваш кошик порожній</h2>
          <p>Додайте товари з каталогу, щоб зробити замовлення.</p>
          <Link href="/catalog" className={styles.continueBtn}>
            Перейти до каталогу
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className={styles.container}>
      <h1 className={styles.pageTitle}>Кошик</h1>

      <div className={styles.layout}>
        <ul className={styles.itemsList}>
          {cart.map((item) => {
            const remainingStock =
              item.availableStock === null
                ? null
                : Math.max(item.availableStock - item.quantity, 0);
            const isIncreaseDisabled =
              item.availableStock !== null &&
              item.quantity >= item.availableStock;

            return (
              <li key={item.productId} className={styles.cartItem}>
                <div className={styles.itemImageWrapper}>
                  <Image
                    src={item.image || FALLBACK_IMAGE}
                    alt={item.name}
                    className={styles.itemImage}
                    width={80}
                    height={80}
                    unoptimized
                  />
                </div>

                <div className={styles.itemInfo}>
                  <h3 className={styles.itemName}>{item.name}</h3>
                  <div className={styles.itemPrice}>{item.price} ₴</div>
                  {item.availableStock !== null ? (
                    <div
                      className={`${styles.stockHint} ${
                        remainingStock === 0 ? styles.stockHintLimit : ""
                      }`}
                    >
                      {remainingStock === 0
                        ? "Ліміт по складу досягнуто"
                        : `Залишок: ${remainingStock} шт`}
                    </div>
                  ) : null}
                </div>

                <div className={styles.quantityControls}>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => handleChangeQuantity(item, "dec")}
                  >
                    -
                  </button>
                  <span className={styles.qtyValue}>{item.quantity}</span>
                  <button
                    className={styles.qtyBtn}
                    disabled={isIncreaseDisabled}
                    onClick={() => handleChangeQuantity(item, "inc")}
                    title={
                      isIncreaseDisabled
                        ? "Більше товару на складі немає"
                        : "Збільшити кількість"
                    }
                  >
                    +
                  </button>
                </div>

                <div className={styles.itemTotal}>
                  {(item.price * item.quantity).toLocaleString()} ₴
                </div>

                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => handleRemoveItem(item.productId)}
                >
                  x
                </button>
              </li>
            );
          })}
        </ul>

        <div className={styles.summary}>
          <h2 className={styles.summaryTitle}>Ваше замовлення</h2>

          <div className={styles.summaryRow}>
            <span>Товари ({itemsCount})</span>
            <span>{subtotal.toLocaleString()} ₴</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Доставка</span>
            <span>За тарифами перевізника</span>
          </div>

          <div className={styles.divider} />

          <div className={`${styles.summaryRow} ${styles.totalRow}`}>
            <span>До сплати</span>
            <span>{subtotal.toLocaleString()} ₴</span>
          </div>

          <Button
            variant="primary"
            size="lg"
            className={styles.checkoutBtn}
            onClick={handleCheckout}
          >
            Оформити замовлення
          </Button>
          {!isAuthenticated ? (
            <p>
              Щоб підтвердити замовлення на наступному кроці, потрібно увійти в
              акаунт.
            </p>
          ) : null}

          <Button variant="secondary" size="lg" onClick={handleClear}>
            Очистити кошик
          </Button>
        </div>
      </div>
    </Container>
  );
}
