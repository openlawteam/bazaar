import { NextResponse } from "next/server";

import { approveSellerOutreach } from "@/lib/bazaar";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await request.json().catch(() => ({}));
  return NextResponse.json(await approveSellerOutreach(id, payload));
}
