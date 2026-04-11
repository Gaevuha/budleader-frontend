import { NextRequest, NextResponse } from "next/server";

import { proxyAuthRequest } from "@/app/api/auth/proxy";

export async function GET(request: NextRequest): Promise<NextResponse> {
  return proxyAuthRequest(request, ["facebook"]);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return proxyAuthRequest(request, ["facebook"]);
}
