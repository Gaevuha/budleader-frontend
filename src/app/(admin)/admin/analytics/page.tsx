"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart2, Package, ShoppingCart, Users } from "lucide-react";

import { apiClient } from "@/services/apiClient";
import styles from "../users/Users.module.css";

type SimpleOrder = {
  id: string;
  totalAmount: number;
  status: string;
};

const normalizeOrders = (raw: unknown): SimpleOrder[] => {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const payload = raw as
    | { orders?: unknown[]; data?: { orders?: unknown[] } }
    | unknown[];

  const rawOrders = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.orders)
    ? payload.orders
    : Array.isArray(payload.data?.orders)
    ? payload.data.orders
    : [];

  return rawOrders
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as {
        id?: string;
        _id?: string;
        totalAmount?: number;
        total?: number;
        status?: string;
      };

      const id = row.id ?? row._id;
      if (!id) {
        return null;
      }

      return {
        id,
        totalAmount: row.totalAmount ?? row.total ?? 0,
        status: row.status ?? "pending",
      };
    })
    .filter((item): item is SimpleOrder => item !== null);
};

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<SimpleOrder[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [ordersRes, usersRes, productsRes] = await Promise.all([
          apiClient.get("/api/orders/admin/all", {
            params: { page: 1, limit: 100 },
          }),
          apiClient.get("/api/users", {
            params: { page: 1, limit: 1 },
          }),
          apiClient.get("/api/products", {
            params: { page: 1, limit: 1 },
          }),
        ]);

        setOrders(normalizeOrders(ordersRes.data));

        const usersTotal =
          (usersRes.data as { data?: { pagination?: { total?: number } } })
            ?.data?.pagination?.total ?? 0;
        const productsTotal =
          (productsRes.data as { data?: { pagination?: { total?: number } } })
            ?.data?.pagination?.total ?? 0;

        setUsersCount(usersTotal);
        setProductsCount(productsTotal);
      } catch {
        setOrders([]);
        setUsersCount(0);
        setProductsCount(0);
      }
    };

    void loadAnalytics();
  }, []);

  const revenue = useMemo(
    () => orders.reduce((sum, order) => sum + order.totalAmount, 0),
    [orders]
  );

  const byStatus = useMemo(() => {
    return orders.reduce<Record<string, number>>((acc, order) => {
      const key = (order.status || "pending").toLowerCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [orders]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <BarChart2 size={24} color="var(--primary)" />
        <h2 className={styles.title}>Аналітика</h2>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginBottom: 24,
        }}
      >
        <div className={styles.tableWrapper} style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <ShoppingCart size={18} />
            <strong>Замовлень</strong>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{orders.length}</div>
        </div>

        <div className={styles.tableWrapper} style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <Users size={18} />
            <strong>Користувачів</strong>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{usersCount}</div>
        </div>

        <div className={styles.tableWrapper} style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <Package size={18} />
            <strong>Товарів</strong>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{productsCount}</div>
        </div>

        <div className={styles.tableWrapper} style={{ padding: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Виторг</strong>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {revenue.toLocaleString()} ₴
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Статус</th>
              <th className={styles.th}>Кількість</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(byStatus).map(([status, count]) => (
              <tr key={status}>
                <td className={styles.td}>{status}</td>
                <td className={styles.td}>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
