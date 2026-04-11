import { NextRequest, NextResponse } from "next/server";

import { proxyAuthRequest } from "@/app/api/auth/proxy";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  const { token } = await context.params;
  return proxyAuthRequest(request, ["reset-password", token]);
}
