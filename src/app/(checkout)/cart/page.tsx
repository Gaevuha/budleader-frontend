"use client";

import { useMemo, useState } from "react";
import { Container } from "@/components/layout/Container/Container";
import { Button } from "@/components/UI/Button/Button";
import Image from "next/image";
import Link from "next/link";
import { useAddToCartMutation, useCartQuery } from "@/queries/cartQueries";
import styles from "./Cart.module.css";

type CartItem = {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

export const Cart = () => {
  const [productIdInput, setProductIdInput] = useState("");
  const [quantityInput, setQuantityInput] = useState(1);
  const cartQuery = useCartQuery();
  const addToCartMutation = useAddToCartMutation();

  const cart = useMemo(() => {
    const items = cartQuery.data?.items ?? [];

    return items.map<CartItem>((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product?.name ?? "Товар",
      image: item.product?.image ?? "https://placehold.co/80x80?text=No+Image",
      price: item.price,
      quantity: item.quantity,
    }));
  }, [cartQuery.data]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const handleAddToCart = async () => {
    const productId = productIdInput.trim();
    const quantity = Number(quantityInput);

    if (!productId || Number.isNaN(quantity) || quantity <= 0) {
      return;
    }

    await addToCartMutation.mutateAsync({
      productId,
      quantity,
    });

    setProductIdInput("");
    setQuantityInput(1);
  };

  const handleCheckout = () => {
    if (typeof window !== "undefined") {
      window.alert("Ваше замовлення успішно оформлено!");
    }
  };

  if (cartQuery.isLoading) {
    return (
      <Container className={styles.container}>
        <div className={styles.emptyCart}>
          <h2>Завантаження кошика...</h2>
        </div>
      </Container>
    );
  }

  if (cartQuery.isError) {
    return (
      <Container className={styles.container}>
        <div className={styles.emptyCart}>
          <h2>Не вдалося завантажити кошик</h2>
          <p>Спробуйте оновити сторінку або увійти у свій акаунт.</p>
        </div>
      </Container>
    );
  }

  if (cart.length === 0) {
    return (
      <Container className={styles.container}>
        <div className={styles.emptyCart}>
          <div style={{ width: "100%", maxWidth: 420, marginBottom: 20 }}>
            <h3 style={{ marginBottom: 10 }}>
              CSR приклад: додати товар у кошик
            </h3>
            <input
              type="text"
              value={productIdInput}
              onChange={(event) => setProductIdInput(event.target.value)}
              placeholder="ID товару"
              style={{
                width: "100%",
                height: 40,
                marginBottom: 10,
                padding: "0 10px",
              }}
            />
            <input
              type="number"
              min={1}
              value={quantityInput}
              onChange={(event) => setQuantityInput(Number(event.target.value))}
              placeholder="Кількість"
              style={{
                width: "100%",
                height: 40,
                marginBottom: 10,
                padding: "0 10px",
              }}
            />
            <Button
              variant="primary"
              onClick={handleAddToCart}
              disabled={addToCartMutation.isPending}
            >
              {addToCartMutation.isPending ? "Додаємо..." : "Додати у кошик"}
            </Button>
          </div>

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

      <div style={{ marginBottom: 16, maxWidth: 520 }}>
        <h3 style={{ marginBottom: 10 }}>CSR приклад: додати товар у кошик</h3>
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
            onClick={handleAddToCart}
            disabled={addToCartMutation.isPending}
          >
            {addToCartMutation.isPending ? "..." : "Додати"}
          </Button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.itemsList}>
          <>
            {cart.map((item) => (
              <div key={item.id} className={styles.cartItem}>
                <div className={styles.itemImageWrapper}>
                  <Image
                    src={item.image}
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
                  <button className={styles.qtyBtn} disabled>
                    -
                  </button>
                  <span className={styles.qtyValue}>{item.quantity}</span>
                  <button className={styles.qtyBtn} disabled>
                    +
                  </button>
                </div>

                <div className={styles.itemTotal}>
                  {(item.price * item.quantity).toLocaleString()} ₴
                </div>

                <button className={styles.removeBtn} disabled>
                  x
                </button>
              </div>
            ))}
          </>
        </div>

        <div className={styles.summary}>
          <h2 className={styles.summaryTitle}>Ваше замовлення</h2>

          <div className={styles.summaryRow}>
            <span>
              Товари ({cart.reduce((sum, item) => sum + item.quantity, 0)})
            </span>
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
        </div>
      </div>
    </Container>
  );
};

export default Cart;
