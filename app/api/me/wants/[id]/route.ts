import { NextResponse } from "next/server";

import { userWantPayload } from "@/lib/bazaar";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const payload = userWantPayload(user.id, id);
  if (!payload) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(payload);
}
