"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/UI/notifications/toast";

import { Container } from "@/components/layout/Container/Container";
import { Button } from "@/components/UI/Button/Button";
import { useUser } from "@/queries/authQueries";
import { CART_QUERY_KEY, useCartQuery } from "@/queries/cartQueries";
import { clearCartCSR, createOrderCSR } from "@/services/apiClient";
import { useCartStore } from "@/store/cart/cartStore";
import { useAuthModalStore } from "@/store/ui/authModalStore";
import styles from "./Checkout.module.css";

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const openAuthModal = useAuthModalStore((state) => state.open);

  const clearLocalCart = useCartStore((state) => state.clearCart);
  const localCart = useCartStore((state) => state.cart);
  const { data: currentUser } = useUser();
  const isAuthenticated = Boolean(currentUser);
  const cartQuery = useCartQuery(isAuthenticated);

  const items = useMemo(() => {
    if (isAuthenticated) {
      return cartQuery.data?.items ?? [];
    }

    return localCart.map((item) => ({
      id: item.id,
      productId: item.id,
      quantity: item.quantity,
      price: item.price,
      product: {
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
      },
    }));
  }, [cartQuery.data?.items, isAuthenticated, localCart]);
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isAuthenticated) {
      openAuthModal("login");
      return;
    }

    if (items.length === 0) {
      toast.error("Кошик порожній");
      return;
    }

    if (
      !fullName.trim() ||
      !phone.trim() ||
      !city.trim() ||
      !addressLine1.trim()
    ) {
      toast.error("Заповніть обов'язкові поля");
      return;
    }

    setIsSubmitting(true);

    try {
      await createOrderCSR({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        shippingAddress: {
          name: fullName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          street: addressLine1.trim(),
          building: "1",
        },
        paymentMethod: "cash",
        deliveryMethod: "post",
      });

      try {
        await clearCartCSR();
      } catch {
        // Do not fail completed order if cart cleanup request is temporarily unavailable.
      }

      clearLocalCart();
      queryClient.setQueryData(CART_QUERY_KEY, {
        items: [],
        subtotal: 0,
        itemsCount: 0,
      });

      toast.success("Замовлення успішно створено");
      router.push("/success");
    } catch (error) {
      const backendMessage =
        typeof error === "object" &&
        error &&
        "response" in error &&
        typeof (
          error as {
            response?: {
              data?: {
                error?: { message?: string };
                message?: string;
              };
            };
          }
        ).response?.data?.error?.message === "string"
          ? (
              error as {
                response?: {
                  data?: { error?: { message?: string } };
                };
              }
            ).response?.data?.error?.message
          : typeof (
              error as {
                response?: { data?: { message?: string } };
              }
            ).response?.data?.message === "string"
          ? (
              error as {
                response?: { data?: { message?: string } };
              }
            ).response?.data?.message
          : null;

      toast.error(backendMessage ?? "Не вдалося оформити замовлення");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container className={styles.container}>
      <h1 className={styles.title}>Оформлення замовлення</h1>

      {!isAuthenticated ? (
        <div className={styles.authGate}>
          <p>
            Перегляд замовлення доступний усім, але підтвердження доступне лише
            після входу.
          </p>
          <Button variant="primary" onClick={() => openAuthModal("login")}>
            Увійти для оформлення
          </Button>
        </div>
      ) : null}

      <div className={styles.layout}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            ПІБ
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>

          <label>
            Телефон
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>

          <label>
            Місто
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </label>

          <label>
            Адреса / Відділення
            <input
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />
          </label>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Оформлюємо..." : "Підтвердити замовлення"}
          </Button>
        </form>

        <aside className={styles.summary}>
          <h2>Ваш кошик</h2>
          {items.length === 0 ? (
            <p>Кошик порожній.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={`${item.productId}-${item.quantity}`}>
                  <span>{item.product?.name ?? "Товар"}</span>
                  <span>
                    {item.quantity} x {item.price} ₴
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.total}>Разом: {total.toLocaleString()} ₴</div>
        </aside>
      </div>
    </Container>
  );
}
