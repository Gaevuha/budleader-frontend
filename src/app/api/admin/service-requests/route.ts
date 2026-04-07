import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { API_BASE_URL } from "@/services/api";
import { getUser } from "@/services/apiServer";

export const dynamic = "force-dynamic";

const emptyPayload = {
  success: true,
  data: {
    requests: [],
    pagination: {
      currentPage: 1,
      totalPages: 0,
      totalItems: 0,
    },
  },
};

const toJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json(emptyPayload, { status: 200 });
  }

  const cookie = request.headers.get("cookie");
  const targetUrl = new URL(`${API_BASE_URL}/api/service-requests/admin/all`);

  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const headers = new Headers({ Accept: "application/json" });

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const response = await fetch(targetUrl.toString(), {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const payload = await toJson(response);

  if (response.status === 401 || response.status === 403) {
    return NextResponse.json(emptyPayload, { status: 200 });
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        success: false,
        message: "Не вдалося отримати сервісні заявки",
        data: payload,
      },
      { status: response.status }
    );
  }

  return NextResponse.json(payload, { status: 200 });
}
