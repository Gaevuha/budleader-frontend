import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { API_BASE_URL } from "@/services/api";

export const dynamic = "force-dynamic";

const toJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cookie = request.headers.get("cookie");

  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers,
    cache: "no-store",
  });

  const payload = await toJson(response);

  if (response.status === 401 || response.status === 403) {
    return NextResponse.json(
      {
        success: false,
        message: "Сесію не вдалося оновити",
      },
      { status: 200 }
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        success: false,
        message: "Помилка оновлення сесії",
        data: payload,
      },
      { status: response.status }
    );
  }

  return NextResponse.json({
    success: true,
    data: payload,
  });
}
