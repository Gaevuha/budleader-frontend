"use client";

import Link from "next/link";

import type { Order } from "@/types/order";

import { ProfileSection } from "./ProfileSection";
import styles from "./Profile.module.css";

interface ProfileOrdersSectionProps {
  orders: Order[];
  isLoading?: boolean;
  limit?: number;
  showLink?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Очікує",
  paid: "Оплачено",
  processing: "В обробці",
  shipped: "Відправлено",
  received: "Отримано",
  delivered: "Доставлено",
  cancelled: "Скасовано",
  new: "Нове",
};

const formatDate = (value?: string): string => {
  if (!value) {
    return "Невідома дата";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Невідома дата";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

export function ProfileOrdersSection({
  orders,
  isLoading = false,
  limit = 5,
  showLink = true,
}: ProfileOrdersSectionProps) {
  const previewOrders = orders.slice(0, limit);

  return (
    <ProfileSection
      title="Історія замовлень"
      description="Останні замовлення, їх статус та основний склад."
      aside={
        showLink ? (
          <Link href="/orders" className={styles.sectionLink}>
            Усі замовлення
          </Link>
        ) : null
      }
    >
      {isLoading ? (
        <div className={styles.orderList}>
          <div className={styles.orderCardSkeleton} />
          <div className={styles.orderCardSkeleton} />
        </div>
      ) : previewOrders.length > 0 ? (
        <div className={styles.orderList}>
          {previewOrders.map((order) => (
            <article key={order.id} className={styles.orderCard}>
              <div className={styles.orderTop}>
                <div>
                  <p className={styles.orderId}>
                    Замовлення #{order.id.slice(-8)}
                  </p>
                  <p className={styles.orderDate}>
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <span className={styles.orderStatus}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>

              <div className={styles.orderBody}>
                <p className={styles.orderTotal}>
                  {order.total.toLocaleString("uk-UA")} ₴
                </p>
                <ul className={styles.orderItems}>
                  {(order.items ?? []).slice(0, 3).map((item) => (
                    <li key={item.id} className={styles.orderItem}>
                      <span>{item.name}</span>
                      <span>x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyPanel}>
          <p className={styles.emptyPanelTitle}>Історія замовлень порожня</p>
          <p className={styles.emptyPanelText}>
            Після першого оформлення замовлення його статус і склад зʼявляться
            тут.
          </p>
          <Link href="/catalog" className={styles.sectionLink}>
            Перейти до покупок
          </Link>
        </div>
      )}
    </ProfileSection>
  );
}
