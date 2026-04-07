import { NextResponse } from "next/server";

import { getUser } from "@/services/apiServer";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const user = await getUser();

  return NextResponse.json({ user }, { status: 200 });
}
