"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { Container } from "@/components/layout/Container/Container";
import { Button } from "@/components/UI/Button/Button";
import { AuthModal } from "@/components/UI/AuthModal/AuthModal";
import {
  CART_QUERY_KEY,
  useAddToCartMutation,
  useCartQuery,
  useClearCartMutation,
  useRemoveFromCartMutation,
} from "@/queries/cartQueries";
import { useAuthStore } from "@/store/auth/authStore";
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
};

const FALLBACK_IMAGE = "https://placehold.co/80x80?text=No+Image";

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
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = Boolean(accessToken);

  const localCart = useCartStore((state) => state.cart);
  const removeLocal = useCartStore((state) => state.removeFromCart);
  const clearLocal = useCartStore((state) => state.clearCart);
  const setQuantityLocal = useCartStore((state) => state.setQuantity);

  const cartQuery = useCartQuery(isAuthenticated);
  const addToCartMutation = useAddToCartMutation();
  const removeFromCartMutation = useRemoveFromCartMutation();
  const clearCartMutation = useClearCartMutation();

  const cart = useMemo<CartViewItem[]>(() => {
    if (!isAuthenticated) {
      return localCart.map((item) => ({
        id: item.id,
        productId: item.id,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
      }));
    }

    const items = cartQuery.data?.items ?? [];

    return items.map((item) => ({
      id: item.id || item.productId,
      productId: item.productId,
      name: item.product?.name ?? "Товар",
      image: item.product?.image ?? FALLBACK_IMAGE,
      price: item.price,
      quantity: item.quantity,
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
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      },
    });
  };

  const handleChangeQuantity = (
    item: CartViewItem,
    operation: "inc" | "dec"
  ) => {
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
          onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
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
        await removeFromCartMutation.mutateAsync(item.productId);

        if (nextQuantity > 0) {
          await addToCartMutation.mutateAsync({
            productId: item.productId,
            quantity: nextQuantity,
          });
        }
      } catch {
        if (prev) {
          queryClient.setQueryData(CART_QUERY_KEY, prev);
        }
      } finally {
        void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
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
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      },
    });
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      setIsAuthOpen(true);
      return;
    }

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

        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      </Container>
    );
  }

  return (
    <Container className={styles.container}>
      <h1 className={styles.pageTitle}>Кошик</h1>

      <div className={styles.layout}>
        <div className={styles.itemsList}>
          {cart.map((item) => (
            <div key={item.id} className={styles.cartItem}>
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
                  onClick={() => handleChangeQuantity(item, "inc")}
                >
                  +
                </button>
              </div>

              <div className={styles.itemTotal}>
                {(item.price * item.quantity).toLocaleString()} ₴
              </div>

              <button
                className={styles.removeBtn}
                onClick={() => handleRemoveItem(item.productId)}
              >
                x
              </button>
            </div>
          ))}
        </div>

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

          <Button variant="secondary" size="lg" onClick={handleClear}>
            Очистити кошик
          </Button>
        </div>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </Container>
  );
}
