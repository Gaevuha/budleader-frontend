import { NextRequest, NextResponse } from "next/server";

import { proxyAuthRequest } from "@/app/api/auth/proxy";

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return proxyAuthRequest(request, ["change-password"]);
}
