import { NextResponse } from "next/server";

import { bazaarFetch } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const response = await bazaarFetch("/auth/otp/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  const payload = await response.json();

  return NextResponse.json(payload, { status: response.status });
}
