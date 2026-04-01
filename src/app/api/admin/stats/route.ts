import { NextRequest, NextResponse } from "next/server";

const normalizeApiBaseUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.replace(/\/+$/, "");
  return trimmed.replace(/\/api$/i, "");
};

const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
);

const toJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const countFromPagination = (payload: unknown): number => {
  if (!payload || typeof payload !== "object") {
    return 0;
  }

  const raw = payload as { data?: { pagination?: { total?: number } } };
  return raw.data?.pagination?.total ?? 0;
};

const normalizeOrders = (payload: unknown): Array<{ totalAmount: number }> => {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const raw = payload as {
    orders?: Array<{ totalAmount?: number; total?: number }>;
    data?: {
      orders?: Array<{ totalAmount?: number; total?: number }>;
    };
  };

  const rows = Array.isArray(raw.orders)
    ? raw.orders
    : Array.isArray(raw.data?.orders)
    ? raw.data.orders
    : [];

  return rows.map((order) => ({
    totalAmount: order.totalAmount ?? order.total ?? 0,
  }));
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");

  const forwardHeaders = new Headers({
    Accept: "application/json",
  });

  if (authorization) {
    forwardHeaders.set("Authorization", authorization);
  }

  if (cookie) {
    forwardHeaders.set("Cookie", cookie);
  }

  const [ordersRes, usersRes, productsRes] = await Promise.all([
    fetch(`${API_BASE_URL}/api/orders/admin/all?page=1&limit=5`, {
      headers: forwardHeaders,
      method: "GET",
    }),
    fetch(`${API_BASE_URL}/api/users?page=1&limit=1`, {
      headers: forwardHeaders,
      method: "GET",
    }),
    fetch(`${API_BASE_URL}/api/products?page=1&limit=1`, {
      headers: forwardHeaders,
      method: "GET",
    }),
  ]);

  const [ordersPayload, usersPayload, productsPayload] = await Promise.all([
    toJson(ordersRes),
    toJson(usersRes),
    toJson(productsRes),
  ]);

  if (!ordersRes.ok || !usersRes.ok || !productsRes.ok) {
    const firstFailure = !ordersRes.ok
      ? ordersPayload
      : !usersRes.ok
      ? usersPayload
      : productsPayload;

    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося отримати адмін-статистику",
        data: firstFailure,
      },
      {
        status: !ordersRes.ok
          ? ordersRes.status
          : !usersRes.ok
          ? usersRes.status
          : productsRes.status,
      }
    );
  }

  const orders = normalizeOrders(ordersPayload);
  const revenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return NextResponse.json({
    success: true,
    data: {
      stats: [
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
          value: String(orders.length),
          trend: "Останні 5 записів",
          icon: "orders",
        },
        {
          id: "products",
          title: "Товари",
          value: String(countFromPagination(productsPayload)),
          trend: "Загалом у каталозі",
          icon: "products",
        },
        {
          id: "users",
          title: "Користувачі",
          value: String(countFromPagination(usersPayload)),
          trend: "Зареєстрованих",
          icon: "users",
        },
      ],
      orders,
    },
  });
}
