import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { API_BASE_URL } from "@/services/api";

const toJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cookie = request.headers.get("cookie");
  const payload = await request.text();

  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const response = await fetch(`${API_BASE_URL}/api/service-requests`, {
    method: "POST",
    headers,
    body: payload,
    cache: "no-store",
  });

  const data = await toJson(response);

  return NextResponse.json(data, { status: response.status });
}
