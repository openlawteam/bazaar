import { NextResponse } from "next/server";

import { healthPayload } from "@/lib/bazaar";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(healthPayload());
}
