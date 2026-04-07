"use client";

import { useEffect, useState } from "react";
import { Package, Search, Filter, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/UI/Modal/Modal";
import { apiFetch } from "@/services/api";
import { apiClient } from "@/services/apiClient";
import type { AppOrder, AppOrderStatus } from "@/types/app";
import styles from "./Orders.module.css";

type RawOrderUser = {
  name?: string;
  email?: string;
  phone?: string;
};

type RawOrderAddress = {
  name?: string;
  phone?: string;
  city?: string;
  street?: string;
  building?: string;
  apartment?: string;
  comment?: string;
};

type RawOrderItem = {
  product?:
    | { _id?: string; id?: string; name?: string; mainImage?: string }
    | string;
  name?: string;
  price?: number;
  quantity?: number;
  total?: number;
};

type RawStatusHistoryItem = {
  status?: string;
  date?: string;
  comment?: string;
};

type RawOrder = {
  id?: string;
  _id?: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  guestName?: string;
  guestPhone?: string;
  isGuest?: boolean;
  user?: RawOrderUser;
  shippingAddress?: RawOrderAddress;
  items?: RawOrderItem[];
  statusHistory?: RawStatusHistoryItem[];
  createdAt?: string;
  date?: string;
  totalAmount?: number;
  total?: number;
  subtotal?: number;
  deliveryCost?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveryMethod?: string;
  notes?: string;
  status?: string;
};

type RawServiceRequest = {
  id?: string;
  _id?: string;
  requestNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  isGuest?: boolean;
  user?: RawOrderUser;
  shippingAddress?: RawOrderAddress;
  serviceId?: string;
  serviceName?: string;
  servicePricePerHour?: number;
  createdAt?: string;
  date?: string;
  total?: number;
  subtotal?: number;
  deliveryCost?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveryMethod?: string;
  notes?: string;
  statusHistory?: RawStatusHistoryItem[];
  status?: string;
};

let adminOrdersRequest: Promise<AppOrder[]> | null = null;
let adminOrdersSnapshot: AppOrder[] | null = null;

const ORDER_STATUS_OPTIONS: Array<{ value: AppOrderStatus; label: string }> = [
  { value: "new", label: "Нова заявка" },
  { value: "pending", label: "Очікує" },
  { value: "paid", label: "Оплачено" },
  { value: "confirmed", label: "Підтверджено" },
  { value: "processing", label: "В обробці" },
  { value: "shipped", label: "Відправлено" },
  { value: "received", label: "Отримано" },
  { value: "delivered", label: "Доставлено" },
  { value: "cancelled", label: "Скасовано" },
  { value: "returned", label: "Повернено" },
];

const normalizeOrderStatus = (status?: string): AppOrderStatus => {
  const normalized = (status ?? "pending").toLowerCase();

  if (
    normalized === "pending" ||
    normalized === "paid" ||
    normalized === "confirmed" ||
    normalized === "processing" ||
    normalized === "shipped" ||
    normalized === "received" ||
    normalized === "delivered" ||
    normalized === "cancelled" ||
    normalized === "returned" ||
    normalized === "new"
  ) {
    return normalized;
  }

  return "pending";
};

const getStatusClass = (status: string, css: Record<string, string>) => {
  switch (status) {
    case "pending":
    case "new":
      return css.statusPending;
    case "paid":
    case "confirmed":
    case "processing":
    case "shipped":
    case "received":
      return css.statusProcessing;
    case "delivered":
    case "returned":
      return css.statusCompleted;
    case "cancelled":
      return css.statusCancelled;
    default:
      return "";
  }
};

const getStatusLabel = (status: AppOrderStatus) =>
  ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
  "Очікує";

const formatOrderNumber = (raw: RawOrder, id: string) =>
  raw.orderNumber?.trim() || `ORD-${id.slice(-6).toUpperCase()}`;

const formatPaymentMethod = (value?: string) => {
  switch (value) {
    case "cash":
      return "Готівка";
    case "card":
      return "Картка";
    case "online":
      return "Онлайн";
    default:
      return "Не вказано";
  }
};

const formatPaymentStatus = (value?: string) => {
  switch (value) {
    case "paid":
      return "Оплачено";
    case "failed":
      return "Помилка";
    case "refunded":
      return "Повернено";
    case "pending":
      return "Очікує";
    default:
      return "Не вказано";
  }
};

const formatDeliveryMethod = (value?: string) => {
  switch (value) {
    case "courier":
      return "Кур'єр";
    case "pickup":
      return "Самовивіз";
    case "post":
      return "Пошта";
    default:
      return "Не вказано";
  }
};

const formatAddress = (address?: AppOrder["shippingAddress"]) => {
  if (!address) {
    return "Адресу не вказано";
  }

  return [
    address.city,
    address.street,
    address.building,
    address.apartment ? `кв. ${address.apartment}` : null,
  ]
    .filter(Boolean)
    .join(", ");
};

const extractOrdersFromPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const objectPayload = payload as {
      orders?: unknown[];
      data?: { orders?: unknown[] };
    };

    if (Array.isArray(objectPayload.orders)) {
      return objectPayload.orders;
    }

    if (Array.isArray(objectPayload.data?.orders)) {
      return objectPayload.data.orders;
    }
  }

  return [];
};

const extractServiceRequestsFromPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const objectPayload = payload as {
      requests?: unknown[];
      data?: { requests?: unknown[] };
    };

    if (Array.isArray(objectPayload.requests)) {
      return objectPayload.requests;
    }

    if (Array.isArray(objectPayload.data?.requests)) {
      return objectPayload.data.requests;
    }
  }

  return [];
};

const extractSingleOrder = (payload: unknown): unknown => {
  if (payload && typeof payload === "object") {
    const objectPayload = payload as { data?: unknown };
    if (objectPayload.data) {
      return objectPayload.data;
    }
  }

  return payload;
};

const normalizeOrder = (item: unknown): AppOrder | null => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const raw = item as RawOrder;
  const id = raw.id ?? raw._id;

  if (!id) {
    return null;
  }

  const customerName =
    raw.customerName?.trim() ||
    raw.user?.name?.trim() ||
    raw.shippingAddress?.name?.trim() ||
    raw.guestName?.trim() ||
    "Користувач";

  const customerEmail =
    raw.customerEmail?.trim() || raw.user?.email?.trim() || "-";

  const customerPhone =
    raw.customerPhone?.trim() ||
    raw.user?.phone?.trim() ||
    raw.shippingAddress?.phone?.trim() ||
    raw.guestPhone?.trim() ||
    "-";

  return {
    id,
    orderNumber: formatOrderNumber(raw, id),
    orderType: "product",
    customerName,
    customerEmail,
    customerPhone,
    date: raw.date ?? raw.createdAt ?? new Date().toISOString(),
    totalAmount: raw.totalAmount ?? raw.total ?? 0,
    subtotalAmount: raw.subtotal ?? raw.totalAmount ?? raw.total ?? 0,
    deliveryCost: raw.deliveryCost ?? 0,
    paymentMethod: raw.paymentMethod,
    paymentStatus: raw.paymentStatus,
    deliveryMethod: raw.deliveryMethod,
    notes: raw.notes,
    isGuest: Boolean(raw.isGuest),
    shippingAddress: raw.shippingAddress
      ? {
          name: raw.shippingAddress.name ?? customerName,
          phone: raw.shippingAddress.phone ?? customerPhone,
          city: raw.shippingAddress.city ?? "",
          street: raw.shippingAddress.street ?? "",
          building: raw.shippingAddress.building ?? "",
          apartment: raw.shippingAddress.apartment,
          comment: raw.shippingAddress.comment,
        }
      : undefined,
    items: Array.isArray(raw.items)
      ? raw.items.map((orderItem) => {
          const product =
            orderItem.product && typeof orderItem.product === "object"
              ? orderItem.product
              : undefined;

          return {
            productId:
              typeof orderItem.product === "string"
                ? orderItem.product
                : product?._id ?? product?.id,
            productName: orderItem.name ?? product?.name ?? "Товар без назви",
            productImage: product?.mainImage,
            quantity: orderItem.quantity ?? 0,
            price: orderItem.price ?? 0,
            total:
              orderItem.total ??
              (orderItem.price ?? 0) * (orderItem.quantity ?? 0),
          };
        })
      : [],
    statusHistory: Array.isArray(raw.statusHistory)
      ? raw.statusHistory.map((entry) => ({
          status: normalizeOrderStatus(entry.status),
          date: entry.date ?? new Date().toISOString(),
          comment: entry.comment,
        }))
      : [],
    status: normalizeOrderStatus(raw.status),
  };
};

const normalizeServiceRequest = (item: unknown): AppOrder | null => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const raw = item as RawServiceRequest;
  const id = raw.id ?? raw._id;

  if (!id) {
    return null;
  }

  const customerName =
    raw.customerName?.trim() ||
    raw.user?.name?.trim() ||
    raw.shippingAddress?.name?.trim() ||
    raw.guestName?.trim() ||
    "Користувач";
  const customerEmail =
    raw.customerEmail?.trim() ||
    raw.user?.email?.trim() ||
    raw.guestEmail?.trim() ||
    "-";
  const customerPhone =
    raw.customerPhone?.trim() ||
    raw.user?.phone?.trim() ||
    raw.shippingAddress?.phone?.trim() ||
    raw.guestPhone?.trim() ||
    "-";
  const servicePrice = raw.servicePricePerHour ?? raw.total ?? 0;

  return {
    id,
    orderNumber:
      raw.requestNumber?.trim() || `SRV-${id.slice(-6).toUpperCase()}`,
    orderType: "service",
    customerName,
    customerEmail,
    customerPhone,
    date: raw.date ?? raw.createdAt ?? new Date().toISOString(),
    totalAmount: raw.total ?? servicePrice,
    subtotalAmount: raw.subtotal ?? servicePrice,
    deliveryCost: raw.deliveryCost ?? 0,
    paymentMethod: raw.paymentMethod,
    paymentStatus: raw.paymentStatus,
    deliveryMethod: raw.deliveryMethod,
    notes: raw.notes,
    serviceId: raw.serviceId,
    serviceName: raw.serviceName,
    servicePricePerHour: servicePrice,
    isGuest: Boolean(raw.isGuest),
    shippingAddress: raw.shippingAddress
      ? {
          name: raw.shippingAddress.name ?? customerName,
          phone: raw.shippingAddress.phone ?? customerPhone,
          city: raw.shippingAddress.city ?? "",
          street: raw.shippingAddress.street ?? "",
          building: raw.shippingAddress.building ?? "",
          apartment: raw.shippingAddress.apartment,
          comment: raw.shippingAddress.comment,
        }
      : undefined,
    items: raw.serviceName
      ? [
          {
            productId: raw.serviceId,
            productName: raw.serviceName,
            quantity: 1,
            price: servicePrice,
            total: servicePrice,
          },
        ]
      : [],
    statusHistory: Array.isArray(raw.statusHistory)
      ? raw.statusHistory.map((entry) => ({
          status: normalizeOrderStatus(entry.status),
          date: entry.date ?? new Date().toISOString(),
          comment: entry.comment,
        }))
      : [],
    status: normalizeOrderStatus(raw.status),
  };
};

const isServiceOrder = (order: AppOrder) => order.orderType === "service";

const fetchAdminOrders = async (): Promise<AppOrder[]> => {
  if (adminOrdersSnapshot) {
    return adminOrdersSnapshot;
  }

  if (!adminOrdersRequest) {
    adminOrdersRequest = Promise.all([
      apiFetch<{
        orders?: unknown[];
        pagination?: unknown;
      }>("/api/admin/orders"),
      apiFetch<{
        requests?: unknown[];
        pagination?: unknown;
      }>("/api/admin/service-requests").catch(() => ({ requests: [] })),
    ])
      .then(([ordersResponse, serviceRequestsResponse]) => {
        const normalizedOrders = extractOrdersFromPayload(ordersResponse)
          .map((item) => normalizeOrder(item))
          .filter((value): value is AppOrder => value !== null);
        const normalizedServiceRequests = extractServiceRequestsFromPayload(
          serviceRequestsResponse
        )
          .map((item) => normalizeServiceRequest(item))
          .filter((value): value is AppOrder => value !== null);

        const normalized = [
          ...normalizedOrders,
          ...normalizedServiceRequests,
        ].sort(
          (left, right) =>
            new Date(right.date).getTime() - new Date(left.date).getTime()
        );

        adminOrdersSnapshot = normalized;
        return normalized;
      })
      .finally(() => {
        adminOrdersRequest = null;
      });
  }

  return adminOrdersRequest;
};

export const Orders = () => {
  const [orders, setOrders] = useState<AppOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<AppOrder | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editStatus, setEditStatus] = useState<AppOrderStatus>("pending");
  const [editComment, setEditComment] = useState("");

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setOrders(await fetchAdminOrders());
      } catch {
        setOrders([]);
        toast.error("Не вдалося завантажити замовлення");
      }
    };

    void loadOrders();
  }, []);

  const upsertOrder = (order: AppOrder) => {
    setOrders((prev) => {
      const next = prev.map((item) => (item.id === order.id ? order : item));
      const updated = next.some((item) => item.id === order.id)
        ? next
        : [order, ...prev];
      adminOrdersSnapshot = updated;
      return updated;
    });
    setSelectedOrder((current) => (current?.id === order.id ? order : current));
  };

  const handleOpenModal = async (order: AppOrder, mode: "view" | "edit") => {
    setModalMode(mode);
    setSelectedOrder(order);
    setEditStatus(order.status);
    setEditComment("");
    setIsModalLoading(true);

    try {
      const normalizedOrder = isServiceOrder(order)
        ? normalizeServiceRequest(
            extractSingleOrder(
              await apiFetch(`/api/admin/service-requests/${order.id}`)
            )
          )
        : normalizeOrder(
            extractSingleOrder(
              (await apiClient.get(`/api/orders/${order.id}`)).data
            )
          );

      if (normalizedOrder) {
        upsertOrder(normalizedOrder);
        setSelectedOrder(normalizedOrder);
        setEditStatus(normalizedOrder.status);
      }
    } catch {
      toast.error("Не вдалося завантажити деталі замовлення");
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleStatusChange = async (
    order: AppOrder,
    status: AppOrderStatus
  ) => {
    try {
      const normalizedOrder = isServiceOrder(order)
        ? normalizeServiceRequest(
            extractSingleOrder(
              await apiFetch(`/api/admin/service-requests/${order.id}`, {
                method: "PATCH",
                body: { status },
              })
            )
          )
        : normalizeOrder(
            extractSingleOrder(
              (
                await apiClient.put(`/api/orders/admin/${order.id}/status`, {
                  status,
                })
              ).data
            )
          );

      if (normalizedOrder) {
        upsertOrder(normalizedOrder);
      } else {
        setOrders((prev) =>
          prev.map((item) =>
            item.id === order.id ? { ...item, status } : item
          )
        );
      }

      toast.success("Статус замовлення оновлено");
    } catch {
      toast.error("Не вдалося оновити статус");
    }
  };

  const handleSaveOrderChanges = async () => {
    if (!selectedOrder) {
      return;
    }

    setIsSaving(true);

    try {
      const normalizedOrder = isServiceOrder(selectedOrder)
        ? normalizeServiceRequest(
            extractSingleOrder(
              await apiFetch(
                `/api/admin/service-requests/${selectedOrder.id}`,
                {
                  method: "PATCH",
                  body: {
                    status: editStatus,
                    comment: editComment.trim() || undefined,
                  },
                }
              )
            )
          )
        : normalizeOrder(
            extractSingleOrder(
              (
                await apiClient.put(
                  `/api/orders/admin/${selectedOrder.id}/status`,
                  {
                    status: editStatus,
                    comment: editComment.trim() || undefined,
                  }
                )
              ).data
            )
          );

      if (normalizedOrder) {
        upsertOrder(normalizedOrder);
      } else {
        upsertOrder({ ...selectedOrder, status: editStatus });
      }

      toast.success("Зміни збережено");
      setModalMode(null);
      setEditComment("");
    } catch {
      toast.error("Не вдалося зберегти зміни");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const shouldDelete = window.confirm(
      "Видалити це замовлення? Дію неможливо скасувати."
    );

    if (!shouldDelete) {
      return;
    }

    try {
      const orderToDelete = orders.find((item) => item.id === orderId);

      if (orderToDelete && isServiceOrder(orderToDelete)) {
        await apiFetch(`/api/admin/service-requests/${orderId}`, {
          method: "DELETE",
        });
      } else {
        await apiClient.delete(`/api/orders/${orderId}`);
      }

      setOrders((prev) => {
        const updated = prev.filter((item) => item.id !== orderId);
        adminOrdersSnapshot = updated;
        return updated;
      });
      setSelectedOrder((current) => (current?.id === orderId ? null : current));
      setModalMode((current) =>
        selectedOrder?.id === orderId ? null : current
      );
      toast.success("Замовлення видалено");
    } catch {
      toast.error("Не вдалося видалити замовлення");
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.serviceName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const modalTitle =
    modalMode === "edit" ? "Редагування замовлення" : "Деталі замовлення";

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
            {ORDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Номер замовлення</th>
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
                  <td className={styles.orderId}>
                    <div className={styles.orderNumber}>
                      {order.orderNumber}
                    </div>
                    <div className={styles.orderMeta}>
                      ID: {order.id.slice(-8)}
                      {order.orderType === "service" && order.serviceName
                        ? ` • Послуга: ${order.serviceName}`
                        : ""}
                    </div>
                  </td>
                  <td>
                    <div className={styles.customerInfo}>
                      <span className={styles.customerName}>
                        {order.customerName}
                      </span>
                      <span className={styles.customerEmail}>
                        {order.customerEmail !== "-"
                          ? order.customerEmail
                          : order.customerPhone}
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
                        order.status,
                        styles
                      )}`}
                      value={order.status}
                      onChange={(e) =>
                        void handleStatusChange(
                          order,
                          e.target.value as AppOrderStatus
                        )
                      }
                    >
                      {ORDER_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => void handleOpenModal(order, "view")}
                        title="Переглянути деталі"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => void handleOpenModal(order, "edit")}
                        title="Редагувати"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => void handleDeleteOrder(order.id)}
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

      <Modal
        isOpen={modalMode !== null}
        onClose={() => {
          setModalMode(null);
          setEditComment("");
        }}
        title={modalTitle}
      >
        {isModalLoading ? (
          <div className={styles.modalLoading}>Завантаження деталей...</div>
        ) : selectedOrder ? (
          <div className={styles.modalContent}>
            <div className={styles.modalSummary}>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Замовлення</span>
                <strong>{selectedOrder.orderNumber}</strong>
                <span className={styles.summaryHint}>
                  {new Date(selectedOrder.date).toLocaleString("uk-UA")}
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Клієнт</span>
                <strong>{selectedOrder.customerName}</strong>
                <span className={styles.summaryHint}>
                  {selectedOrder.customerEmail !== "-"
                    ? selectedOrder.customerEmail
                    : selectedOrder.customerPhone}
                </span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>Сума</span>
                <strong>{selectedOrder.totalAmount.toLocaleString()} ₴</strong>
                <span className={styles.summaryHint}>
                  {getStatusLabel(selectedOrder.status)}
                </span>
              </div>
            </div>

            {modalMode === "edit" ? (
              <div className={styles.editPanel}>
                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Статус</span>
                  <select
                    className={styles.modalSelect}
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as AppOrderStatus)
                    }
                  >
                    {ORDER_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Коментар до зміни</span>
                  <textarea
                    className={styles.modalTextarea}
                    placeholder="Наприклад: передано кур'єру або підтверджено телефоном"
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    rows={4}
                  />
                </label>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setModalMode(null)}
                    disabled={isSaving}
                  >
                    Скасувати
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => void handleSaveOrderChanges()}
                    disabled={isSaving}
                  >
                    {isSaving ? "Збереження..." : "Зберегти"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className={styles.detailGrid}>
              <div className={styles.detailSection}>
                <h3 className={styles.sectionTitle}>Контакти</h3>
                <div className={styles.detailRow}>
                  <span>Ім&apos;я</span>
                  <strong>{selectedOrder.customerName}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Email</span>
                  <strong>{selectedOrder.customerEmail}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Телефон</span>
                  <strong>{selectedOrder.customerPhone}</strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Тип клієнта</span>
                  <strong>
                    {selectedOrder.isGuest ? "Гість" : "Зареєстрований"}
                  </strong>
                </div>
              </div>

              <div className={styles.detailSection}>
                <h3 className={styles.sectionTitle}>Доставка й оплата</h3>
                <div className={styles.detailRow}>
                  <span>Доставка</span>
                  <strong>
                    {formatDeliveryMethod(selectedOrder.deliveryMethod)}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Оплата</span>
                  <strong>
                    {formatPaymentMethod(selectedOrder.paymentMethod)}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Статус оплати</span>
                  <strong>
                    {formatPaymentStatus(selectedOrder.paymentStatus)}
                  </strong>
                </div>
                <div className={styles.detailRow}>
                  <span>Адреса</span>
                  <strong>
                    {formatAddress(selectedOrder.shippingAddress)}
                  </strong>
                </div>
              </div>
            </div>

            {selectedOrder.shippingAddress?.comment ? (
              <div className={styles.detailSection}>
                <h3 className={styles.sectionTitle}>Коментар до доставки</h3>
                <p className={styles.noteText}>
                  {selectedOrder.shippingAddress.comment}
                </p>
              </div>
            ) : null}

            {selectedOrder.notes ? (
              <div className={styles.detailSection}>
                <h3 className={styles.sectionTitle}>Нотатки</h3>
                <p className={styles.noteText}>{selectedOrder.notes}</p>
              </div>
            ) : null}

            <div className={styles.detailSection}>
              <h3 className={styles.sectionTitle}>
                {selectedOrder.orderType === "service" ? "Послуга" : "Товари"}
              </h3>
              <div className={styles.itemsList}>
                {selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((item, index) => (
                    <div
                      key={`${selectedOrder.id}-${
                        item.productId ?? item.productName
                      }-${index}`}
                      className={styles.itemRow}
                    >
                      <div>
                        <div className={styles.itemName}>
                          {item.productName}
                        </div>
                        <div className={styles.itemMeta}>
                          {item.quantity} x {item.price.toLocaleString()} ₴
                        </div>
                      </div>
                      <strong>{item.total.toLocaleString()} ₴</strong>
                    </div>
                  ))
                ) : (
                  <p className={styles.noteText}>Список товарів порожній.</p>
                )}
              </div>
            </div>

            <div className={styles.detailSection}>
              <h3 className={styles.sectionTitle}>Історія статусів</h3>
              <div className={styles.historyList}>
                {selectedOrder.statusHistory.length > 0 ? (
                  selectedOrder.statusHistory
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <div
                        key={`${selectedOrder.id}-${entry.date}-${entry.status}-${index}`}
                        className={styles.historyRow}
                      >
                        <div>
                          <div className={styles.itemName}>
                            {getStatusLabel(entry.status)}
                          </div>
                          <div className={styles.itemMeta}>
                            {new Date(entry.date).toLocaleString("uk-UA")}
                          </div>
                        </div>
                        <span className={styles.historyComment}>
                          {entry.comment || "Без коментаря"}
                        </span>
                      </div>
                    ))
                ) : (
                  <p className={styles.noteText}>
                    Історія статусів поки порожня.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.modalLoading}>Замовлення не знайдено.</div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
