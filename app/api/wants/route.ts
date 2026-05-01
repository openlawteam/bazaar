import { NextResponse } from "next/server";

import { createWantFromPayload } from "@/lib/bazaar";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const result = await createWantFromPayload(await request.json(), user?.id);
  return NextResponse.json(result.body, { status: result.status });
}
