"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Container } from "@/components/layout/Container/Container";
import { AuthModal } from "@/components/UI/AuthModal/AuthModal";
import { Button } from "@/components/UI/Button/Button";
import { useCartQuery } from "@/queries/cartQueries";
import { createOrderCSR } from "@/services/apiClient";
import { useAuthStore } from "@/store/auth/authStore";
import styles from "./Checkout.module.css";

export default function CheckoutPage() {
  const router = useRouter();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [addressLine1, setAddressLine1] = useState("");

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const cartQuery = useCartQuery(isAuthenticated);

  const items = cartQuery.data?.items ?? [];
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isAuthenticated) {
      setIsAuthOpen(true);
      return;
    }

    if (items.length === 0) {
      toast.error("Кошик порожній");
      return;
    }

    if (!fullName.trim() || !phone.trim() || !city.trim() || !addressLine1.trim()) {
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
          fullName: fullName.trim(),
          phone: phone.trim(),
          country: "Україна",
          city: city.trim(),
          addressLine1: addressLine1.trim(),
        },
        paymentMethod: "cash_on_delivery",
        deliveryMethod: "nova_poshta",
      });

      toast.success("Замовлення успішно створено");
      router.push("/success");
    } catch {
      toast.error("Не вдалося оформити замовлення");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Container className={styles.container}>
        <div className={styles.authGate}>
          <h1>Оформлення замовлення</h1>
          <p>Щоб перейти до оформлення, увійдіть у свій акаунт.</p>
          <Button variant="primary" onClick={() => setIsAuthOpen(true)}>
            Увійти
          </Button>
        </div>

        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      </Container>
    );
  }

  return (
    <Container className={styles.container}>
      <h1 className={styles.title}>Оформлення замовлення</h1>

      <div className={styles.layout}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            ПІБ
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
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

          <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
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

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </Container>
  );
}
