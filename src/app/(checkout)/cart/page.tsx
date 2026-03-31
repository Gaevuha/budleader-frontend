"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Container } from "@/components/layout/Container/Container";
import { Button } from "@/components/UI/Button/Button";
import { AuthModal } from "@/components/UI/AuthModal/AuthModal";
import {
  useAddToCartMutation,
  useCartQuery,
  useClearCartMutation,
  useRemoveFromCartMutation,
} from "@/queries/cartQueries";
import { useAuthStore } from "@/store/auth/authStore";
import { useCartStore } from "@/store/cart/cartStore";
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

export default function CartPage() {
  const router = useRouter();
  const [productIdInput, setProductIdInput] = useState("");
  const [quantityInput, setQuantityInput] = useState(1);
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

  const handleAddById = async () => {
    const productId = productIdInput.trim();
    const quantity = Number(quantityInput);

    if (!productId || Number.isNaN(quantity) || quantity <= 0) {
      return;
    }

    await addToCartMutation.mutateAsync({ productId, quantity });
    setProductIdInput("");
    setQuantityInput(1);
  };

  const handleRemoveItem = async (productId: string) => {
    if (!isAuthenticated) {
      removeLocal(productId);
      return;
    }

    await removeFromCartMutation.mutateAsync(productId);
  };

  const handleChangeQuantity = async (
    item: CartViewItem,
    operation: "inc" | "dec"
  ) => {
    const nextQuantity =
      operation === "inc" ? item.quantity + 1 : item.quantity - 1;

    if (nextQuantity < 1) {
      return;
    }

    if (!isAuthenticated) {
      setQuantityLocal(item.productId, nextQuantity);
      return;
    }

    if (operation === "inc") {
      await addToCartMutation.mutateAsync({
        productId: item.productId,
        quantity: 1,
      });
      return;
    }

    // Backend has no decrement endpoint, so fallback: remove and re-add remaining quantity.
    await removeFromCartMutation.mutateAsync(item.productId);
    if (nextQuantity > 0) {
      await addToCartMutation.mutateAsync({
        productId: item.productId,
        quantity: nextQuantity,
      });
    }
  };

  const handleClear = async () => {
    if (!isAuthenticated) {
      clearLocal();
      return;
    }

    await clearCartMutation.mutateAsync();
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

      {isAuthenticated && (
        <div style={{ marginBottom: 16, maxWidth: 520 }}>
          <h3 style={{ marginBottom: 10 }}>CSR: додати товар по ID</h3>
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "1fr 120px auto",
            }}
          >
            <input
              type="text"
              value={productIdInput}
              onChange={(event) => setProductIdInput(event.target.value)}
              placeholder="ID товару"
              style={{ height: 40, padding: "0 10px" }}
            />
            <input
              type="number"
              min={1}
              value={quantityInput}
              onChange={(event) => setQuantityInput(Number(event.target.value))}
              placeholder="К-сть"
              style={{ height: 40, padding: "0 10px" }}
            />
            <Button
              variant="primary"
              onClick={handleAddById}
              disabled={addToCartMutation.isPending}
            >
              {addToCartMutation.isPending ? "..." : "Додати"}
            </Button>
          </div>
        </div>
      )}

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
                  onClick={() => void handleChangeQuantity(item, "dec")}
                >
                  -
                </button>
                <span className={styles.qtyValue}>{item.quantity}</span>
                <button
                  className={styles.qtyBtn}
                  onClick={() => void handleChangeQuantity(item, "inc")}
                >
                  +
                </button>
              </div>

              <div className={styles.itemTotal}>
                {(item.price * item.quantity).toLocaleString()} ₴
              </div>

              <button
                className={styles.removeBtn}
                onClick={() => void handleRemoveItem(item.productId)}
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

          <Button
            variant="secondary"
            size="lg"
            onClick={() => void handleClear()}
          >
            Очистити кошик
          </Button>
        </div>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </Container>
  );
}
