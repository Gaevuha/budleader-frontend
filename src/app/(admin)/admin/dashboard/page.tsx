"use client";

import { useEffect, useState } from "react";
import { Package, ShoppingCart, Users, TrendingUp } from "lucide-react";

import { apiClient as api } from "@/services/apiClient";
import type { AdminOrder, DashboardStat } from "@/types/dashboard";
import styles from "./Dashboard.module.css";

const iconMap = {
  revenue: TrendingUp,
  orders: ShoppingCart,
  products: Package,
  users: Users,
};

const normalizeOrders = (raw: unknown): AdminOrder[] => {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const candidate = raw as {
    orders?: AdminOrder[];
    data?: { orders?: AdminOrder[] };
  };

  if (Array.isArray(candidate.orders)) {
    return candidate.orders;
  }

  if (candidate.data && Array.isArray(candidate.data.orders)) {
    return candidate.data.orders;
  }

  return [];
};

const normalizeStatsFromAdmin = (raw: unknown): DashboardStat[] => {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const candidate = raw as {
    stats?: DashboardStat[];
    data?: { stats?: DashboardStat[] };
  };

  if (Array.isArray(candidate.stats)) {
    return candidate.stats;
  }

  if (candidate.data && Array.isArray(candidate.data.stats)) {
    return candidate.data.stats;
  }

  return [];
};

const normalizeRecentOrdersFromAdmin = (raw: unknown): AdminOrder[] => {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const candidate = raw as {
    orders?: unknown[];
    data?: { orders?: unknown[] };
  };

  const rows = Array.isArray(candidate.orders)
    ? candidate.orders
    : Array.isArray(candidate.data?.orders)
    ? candidate.data.orders
    : [];

  return rows
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as {
        id?: string;
        _id?: string;
        customerName?: string;
        status?: string;
        totalAmount?: number;
        total?: number;
      };

      const id = row.id ?? row._id;
      if (!id) {
        return null;
      }

      return {
        id,
        customerName: row.customerName ?? "Користувач",
        status: row.status ?? "pending",
        totalAmount: row.totalAmount ?? row.total ?? 0,
      } satisfies AdminOrder;
    })
    .filter((item): item is AdminOrder => item !== null);
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const statsRes = await api.get("/api/admin/stats");
        const statsPayload = statsRes.data as {
          data?: { stats?: DashboardStat[]; orders?: unknown[] };
          stats?: DashboardStat[];
          orders?: unknown[];
        };

        const adminStats = normalizeStatsFromAdmin(statsPayload);
        const adminOrders = normalizeRecentOrdersFromAdmin(statsPayload);

        if (adminStats.length > 0) {
          setStats(adminStats);
        }

        if (adminOrders.length > 0) {
          setOrders(adminOrders);
          return;
        }

        const [ordersRes, usersRes, productsRes] = await Promise.all([
          api.get("/api/orders/admin/all", {
            params: { page: 1, limit: 5 },
          }),
          api.get("/api/users", {
            params: { page: 1, limit: 1 },
          }),
          api.get("/api/products", {
            params: { page: 1, limit: 1 },
          }),
        ]);

        const recentOrders = normalizeOrders(ordersRes.data);

        const usersTotal =
          (usersRes.data as { data?: { pagination?: { total?: number } } })
            ?.data?.pagination?.total ?? 0;
        const productsTotal =
          (productsRes.data as { data?: { pagination?: { total?: number } } })
            ?.data?.pagination?.total ?? 0;

        const revenue = recentOrders.reduce(
          (sum, order) => sum + order.totalAmount,
          0
        );

        setStats([
          {
            id: "revenue",
            title: "Виторг (останні 5)",
            value: `${revenue.toLocaleString()} ₴`,
            trend: "Оновлюється в реальному часі",
            icon: "revenue",
          },
          {
            id: "orders",
            title: "Замовлення",
            value: String(recentOrders.length),
            trend: "Останні 5 записів",
            icon: "orders",
          },
          {
            id: "products",
            title: "Товари",
            value: String(productsTotal),
            trend: "Загалом у каталозі",
            icon: "products",
          },
          {
            id: "users",
            title: "Користувачі",
            value: String(usersTotal),
            trend: "Зареєстрованих",
            icon: "users",
          },
        ]);
        setOrders(recentOrders);
      } catch {
        setStats([]);
        setOrders([]);
      }
    };

    void loadDashboard();
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Очікує";
      case "paid":
        return "Оплачено";
      case "new":
        return "Нове";
      case "processing":
        return "В обробці";
      case "shipped":
        return "Відправлено";
      case "received":
        return "Отримано";
      case "delivered":
        return "Доставлено";
      case "cancelled":
        return "Скасовано";
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "pending":
      case "new":
        return styles.statusPending;
      case "paid":
      case "processing":
      case "shipped":
      case "received":
        return styles.statusProcessing;
      case "delivered":
        return styles.statusCompleted;
      case "cancelled":
        return styles.statusCancelled;
      default:
        return "";
    }
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.statsGrid}>
        {stats.map((stat, i) => {
          const Icon =
            iconMap[(stat.icon as keyof typeof iconMap) ?? "revenue"] ??
            TrendingUp;

          return (
            <div key={stat.id ?? String(i)} className={styles.statCard}>
              <div className={styles.statHeader}>
                <h3 className={styles.statTitle}>{stat.title}</h3>
                <Icon size={20} className={styles.statIcon} />
              </div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stat.value}</div>
                <div className={styles.statTrend}>
                  <span>{stat.trend}</span> за останній місяць
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.recentOrders}>
        <h3 className={styles.sectionTitle}>Останні замовлення</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID Замовлення</th>
                <th>Клієнт</th>
                <th>Статус</th>
                <th>Сума</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.customerName}</td>
                  <td>
                    <span
                      className={`${styles.status} ${getStatusClass(
                        order.status
                      )}`}
                    >
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td>{order.totalAmount.toLocaleString()} ₴</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
