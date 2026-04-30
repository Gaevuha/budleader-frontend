"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Container } from "@/components/layout/Container/Container";
import { Button } from "@/components/UI/Button/Button";
import { useUser } from "@/queries/authQueries";
import { useCartQuery } from "@/queries/cartQueries";
import { useCartStore } from "@/store/cart/cartStore";
import { useAuthModalStore } from "@/store/ui/authModalStore";
import { PRODUCT_PLACEHOLDER_SRC, resolveMediaUrl } from "@/utils/media";
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

const FALLBACK_IMAGE = PRODUCT_PLACEHOLDER_SRC;

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatPrice = (value: number): string => {
  return Math.max(0, toFiniteNumber(value)).toLocaleString("uk-UA");
};

const resolveCartProductId = <
  T extends {
    productId?: string;
    id?: string;
    product?: { id?: string; _id?: string };
  }
>(
  item: T
): string => {
  const candidates = [
    item.productId,
    item.product?.id,
    item.product?._id,
    item.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const normalized = candidate.trim();

      if (normalized) {
        return normalized;
      }
    }
  }

  return "";
};

export default function CartPage() {
  const router = useRouter();
  const openAuthModal = useAuthModalStore((state) => state.open);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [isClearPending, setIsClearPending] = useState(false);

  const { data: currentUser } = useUser();
  const isAuthenticated = Boolean(currentUser);

  const cartItems = useCartStore((state) => state.cart);
  const removeCartItem = useCartStore((state) => state.removeFromCart);
  const clearCart = useCartStore((state) => state.clearCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const cartIsSyncing = useCartStore((state) => state.isSyncing);
  const pendingCartProductIds = useCartStore(
    (state) => state.pendingProductIds
  );

  const cartQuery = useCartQuery(isAuthenticated);

  const cart = useMemo<CartViewItem[]>(() => {
    return cartItems.map((item) => ({
      id: item.id || resolveCartProductId(item),
      productId: resolveCartProductId(item),
      name: item.name ?? "Товар",
      image: resolveMediaUrl(item.image || FALLBACK_IMAGE),
      price: Math.max(0, toFiniteNumber(item.price)),
      quantity: item.quantity,
      availableStock:
        typeof item.stock === "number" && Number.isFinite(item.stock)
          ? Math.max(0, item.stock)
          : null,
    }));
  }, [cartItems]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const itemsCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const isLoading = isAuthenticated ? cartQuery.isLoading : false;

  const handleRemoveItem = async (productId: string) => {
    if (!productId) {
      return;
    }

    if (
      pendingCartProductIds.includes(productId) ||
      pendingProductId === productId
    ) {
      return;
    }

    setPendingProductId(productId);

    try {
      await removeCartItem(productId);
    } finally {
      setPendingProductId((current) =>
        current === productId ? null : current
      );
    }
  };

  const handleChangeQuantity = async (
    item: CartViewItem,
    operation: "inc" | "dec"
  ) => {
    if (
      pendingCartProductIds.includes(item.productId) ||
      pendingProductId === item.productId
    ) {
      return;
    }

    if (
      operation === "inc" &&
      item.availableStock !== null &&
      item.quantity >= item.availableStock
    ) {
      return;
    }

    const nextQuantity =
      operation === "inc" ? item.quantity + 1 : item.quantity - 1;

    if (nextQuantity < 0 || !item.productId) {
      return;
    }

    setPendingProductId(item.productId);

    try {
      await updateQuantity(item.productId, nextQuantity);
    } finally {
      setPendingProductId((current) =>
        current === item.productId ? null : current
      );
    }
  };

  const handleClear = async () => {
    setIsClearPending(true);

    try {
      await clearCart();
    } finally {
      setIsClearPending(false);
    }
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("budleader-auth-return-to", "/checkout");
      }

      openAuthModal("login");
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
            const isItemPending =
              pendingCartProductIds.includes(item.productId) ||
              pendingProductId === item.productId;

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
                  <div className={styles.itemPrice}>
                    {formatPrice(item.price)} ₴
                  </div>
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
                  ) : (
                    <div className={styles.stockHint}>
                      Наявність уточнюється
                    </div>
                  )}
                </div>

                <div className={styles.quantityControls}>
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    onClick={() => void handleChangeQuantity(item, "dec")}
                  >
                    -
                  </button>
                  <span className={styles.qtyValue}>{item.quantity}</span>
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    disabled={isIncreaseDisabled}
                    onClick={() => void handleChangeQuantity(item, "inc")}
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
                  {formatPrice(item.price * item.quantity)} ₴
                </div>

                <button
                  type="button"
                  className={styles.removeBtn}
                  disabled={isItemPending}
                  onClick={() => void handleRemoveItem(item.productId)}
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
            <span>{formatPrice(subtotal)} ₴</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Доставка</span>
            <span>За тарифами перевізника</span>
          </div>

          <div className={styles.divider} />

          <div className={`${styles.summaryRow} ${styles.totalRow}`}>
            <span>До сплати</span>
            <span>{formatPrice(subtotal)} ₴</span>
          </div>

          <Button
            variant="primary"
            size="lg"
            className={styles.checkoutBtn}
            onClick={handleCheckout}
            disabled={cartIsSyncing || isClearPending}
          >
            Оформити замовлення
          </Button>
          {!isAuthenticated ? (
            <p>
              Щоб підтвердити замовлення на наступному кроці, потрібно увійти в
              акаунт.
            </p>
          ) : null}

          <Button
            variant="secondary"
            size="lg"
            onClick={() => void handleClear()}
            disabled={cartIsSyncing || isClearPending}
          >
            Очистити кошик
          </Button>
        </div>
      </div>
    </Container>
  );

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
                  <div className={styles.itemPrice}>
                    {formatPrice(item.price)} ₴
                  </div>
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
                  ) : (
                    <div className={styles.stockHint}>
                      Наявність уточнюється
                    </div>
                  )}
                </div>

                <div className={styles.quantityControls}>
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    disabled={
                      cartIsSyncing || pendingProductId === item.productId
                    }
                    onClick={() => void handleChangeQuantity(item, "dec")}
                  >
                    -
                  </button>
                  <span className={styles.qtyValue}>{item.quantity}</span>
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    disabled={
                      isIncreaseDisabled ||
                      cartIsSyncing ||
                      pendingProductId === item.productId
                    }
                    onClick={() => void handleChangeQuantity(item, "inc")}
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
                  {formatPrice(item.price * item.quantity)} ₴
                </div>

                <button
                  type="button"
                  className={styles.removeBtn}
                  disabled={
                    cartIsSyncing || pendingProductId === item.productId
                  }
                  onClick={() => void handleRemoveItem(item.productId)}
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
            <span>{formatPrice(subtotal)} ₴</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Доставка</span>
            <span>За тарифами перевізника</span>
          </div>

          <div className={styles.divider} />

          <div className={`${styles.summaryRow} ${styles.totalRow}`}>
            <span>До сплати</span>
            <span>{formatPrice(subtotal)} ₴</span>
          </div>

          <Button
            variant="primary"
            size="lg"
            className={styles.checkoutBtn}
            onClick={handleCheckout}
            disabled={cartIsSyncing || isClearPending}
          >
            Оформити замовлення
          </Button>
          {!isAuthenticated ? (
            <p>
              Щоб підтвердити замовлення на наступному кроці, потрібно увійти в
              акаунт.
            </p>
          ) : null}

          <Button
            variant="secondary"
            size="lg"
            onClick={() => void handleClear()}
            disabled={cartIsSyncing || isClearPending}
          >
            Очистити кошик
          </Button>
        </div>
      </div>
    </Container>
  );
}
