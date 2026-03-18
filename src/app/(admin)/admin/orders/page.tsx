"use client";

import { useEffect, useState } from "react";
import type { AppOrder } from "@/types/app";
import { apiClient } from "@/services/apiClient";
import { Package, Search, Filter, Edit, Trash2, Eye } from "lucide-react";
import styles from "./Orders.module.css";

export const Orders = () => {
  const [orders, setOrders] = useState<AppOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await apiClient.get("/api/orders/admin/all");
        const payload = response.data as
          | { orders?: unknown[]; data?: { orders?: unknown[] } }
          | unknown[];

        const rawOrders = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.orders)
          ? payload.orders
          : Array.isArray(payload.data?.orders)
          ? payload.data.orders
          : [];

        setOrders(
          rawOrders
            .map((item) => {
              if (!item || typeof item !== "object") {
                return null;
              }

              const raw = item as {
                id?: string;
                _id?: string;
                customerName?: string;
                customerEmail?: string;
                createdAt?: string;
                date?: string;
                totalAmount?: number;
                total?: number;
                status?: AppOrder["status"];
              };

              const id = raw.id ?? raw._id;
              if (!id) {
                return null;
              }

              return {
                id,
                customerName: raw.customerName ?? "Користувач",
                customerEmail: raw.customerEmail ?? "-",
                date: raw.date ?? raw.createdAt ?? new Date().toISOString(),
                totalAmount: raw.totalAmount ?? raw.total ?? 0,
                status: raw.status ?? "new",
              } satisfies AppOrder;
            })
            .filter((value): value is AppOrder => value !== null)
        );
      } catch {
        setOrders([]);
      }
    };

    void loadOrders();
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
        return styles.statusProcessing;
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

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Замовлення</h1>
          <p className={styles.subtitle}>Управління замовленнями клієнтів</p>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} size={20} />
          <input
            type="text"
            placeholder="Пошук замовлень..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.filterWrapper}>
          <Filter className={styles.filterIcon} size={20} />
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Всі статуси</option>
            <option value="new">Нові</option>
            <option value="processing">В обробці</option>
            <option value="shipped">Відправлені</option>
            <option value="delivered">Доставлені</option>
            <option value="cancelled">Скасовані</option>
          </select>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID Замовлення</th>
              <th>Клієнт</th>
              <th>Дата</th>
              <th>Сума</th>
              <th>Статус</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td className={styles.orderId}>#{order.id}</td>
                  <td>
                    <div className={styles.customerInfo}>
                      <span className={styles.customerName}>
                        {order.customerName}
                      </span>
                      <span className={styles.customerEmail}>
                        {order.customerEmail}
                      </span>
                    </div>
                  </td>
                  <td>{new Date(order.date).toLocaleDateString("uk-UA")}</td>
                  <td className={styles.amount}>
                    {order.totalAmount.toLocaleString()} ₴
                  </td>
                  <td>
                    <select
                      className={`${styles.statusSelect} ${getStatusClass(
                        order.status
                      )}`}
                      value={order.status}
                      onChange={(e) => {
                        const nextStatus = e.target.value as AppOrder["status"];
                        setOrders((prev) =>
                          prev.map((item) =>
                            item.id === order.id
                              ? { ...item, status: nextStatus }
                              : item
                          )
                        );
                      }}
                    >
                      <option value="new">Нове</option>
                      <option value="processing">В обробці</option>
                      <option value="shipped">Відправлено</option>
                      <option value="delivered">Доставлено</option>
                      <option value="cancelled">Скасовано</option>
                    </select>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionBtn}
                        title="Переглянути деталі"
                      >
                        <Eye size={18} />
                      </button>
                      <button className={styles.actionBtn} title="Редагувати">
                        <Edit size={18} />
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        title="Видалити"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  <div className={styles.emptyContent}>
                    <Package size={48} className={styles.emptyIcon} />
                    <h3>Замовлень не знайдено</h3>
                    <p>Спробуйте змінити параметри пошуку або фільтри.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
