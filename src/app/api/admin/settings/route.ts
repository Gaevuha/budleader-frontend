import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { API_BASE_URL } from "@/services/api";
import { getUser } from "@/services/apiServer";

const toJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const ensureAdmin = async () => {
  const user = await getUser();

  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { success: false, message: "Недостатньо прав" },
      { status: 403 }
    );
  }

  return null;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const forbidden = await ensureAdmin();

  if (forbidden) {
    return forbidden;
  }

  const cookie = request.headers.get("cookie");
  const headers = new Headers({
    Accept: "application/json",
  });

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const payload = await toJson(response);

  return NextResponse.json(payload, { status: response.status });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const forbidden = await ensureAdmin();

  if (forbidden) {
    return forbidden;
  }

  const cookie = request.headers.get("cookie");
  const body = await request.json();
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await toJson(response);

  return NextResponse.json(payload, { status: response.status });
}
