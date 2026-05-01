import { NextResponse } from "next/server";

import { userWantsPayload } from "@/lib/bazaar";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(userWantsPayload(user.id));
}
