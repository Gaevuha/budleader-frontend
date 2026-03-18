"use client";

import { useEffect, useState } from "react";
import { Package, ShoppingCart, Users, TrendingUp } from "lucide-react";

import { apiClient as api } from "@/services/apiClient";
import type { ApiResponse } from "@/types/api";
import type {
  AdminOrder,
  DashboardStat,
  DashboardStatsData,
} from "@/types/dashboard";
import styles from "./Dashboard.module.css";

const iconMap = {
  revenue: TrendingUp,
  orders: ShoppingCart,
  products: Package,
  users: Users,
};

const normalizeStats = (raw: unknown): DashboardStat[] => {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const candidate = raw as DashboardStatsData | { data?: DashboardStatsData };

  if ("stats" in candidate && Array.isArray(candidate.stats)) {
    return candidate.stats;
  }

  if (
    "data" in candidate &&
    candidate.data &&
    Array.isArray(candidate.data.stats)
  ) {
    return candidate.data.stats;
  }

  return [];
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          api.get<ApiResponse<DashboardStatsData> | DashboardStatsData>(
            "/api/admin/stats"
          ),
          api.get<
            ApiResponse<{ orders: AdminOrder[] }> | { orders: AdminOrder[] }
          >("/api/orders?limit=5"),
        ]);

        setStats(normalizeStats(statsRes.data));
        setOrders(normalizeOrders(ordersRes.data));
      } catch {
        setStats([]);
        setOrders([]);
      }
    };

    void loadDashboard();
  }, []);

  const getStatusText = (status: string) => {
    switch (status) {
      case "new":
        return "Нове";
      case "processing":
        return "В обробці";
      case "shipped":
        return "Відправлено";
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
      case "new":
        return styles.statusPending;
      case "processing":
      case "shipped":
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
