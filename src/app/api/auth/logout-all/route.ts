import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { API_BASE_URL } from "@/services/api";

export const dynamic = "force-dynamic";

const AUTH_COOKIE_NAMES = ["accessToken", "refreshToken"];

const toJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const clearAuthCookies = (response: NextResponse) => {
  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
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

  const upstream = await fetch(`${API_BASE_URL}/api/auth/logout-all`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
    cache: "no-store",
  });

  const payload = await toJson(upstream);
  const response = NextResponse.json(payload, { status: upstream.status });
  clearAuthCookies(response);

  return response;
}
