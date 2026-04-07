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

const buildHeaders = (cookie: string | null, withJson = false) => {
  const headers = new Headers({ Accept: "application/json" });

  if (withJson) {
    headers.set("Content-Type", "application/json");
  }

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  return headers;
};

const ensureAdmin = async () => {
  const user = await getUser();
  return Boolean(user && user.role === "admin");
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!(await ensureAdmin())) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const response = await fetch(`${API_BASE_URL}/api/service-requests/${id}`, {
    method: "GET",
    headers: buildHeaders(request.headers.get("cookie")),
    cache: "no-store",
  });

  const payload = await toJson(response);
  return NextResponse.json(payload, { status: response.status });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!(await ensureAdmin())) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const body = await request.text();
  const response = await fetch(
    `${API_BASE_URL}/api/service-requests/admin/${id}/status`,
    {
      method: "PATCH",
      headers: buildHeaders(request.headers.get("cookie"), true),
      body,
      cache: "no-store",
    }
  );

  const payload = await toJson(response);
  return NextResponse.json(payload, { status: response.status });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!(await ensureAdmin())) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await context.params;
  const response = await fetch(`${API_BASE_URL}/api/service-requests/${id}`, {
    method: "DELETE",
    headers: buildHeaders(request.headers.get("cookie")),
    cache: "no-store",
  });

  const payload = await toJson(response);
  return NextResponse.json(payload, { status: response.status });
}
