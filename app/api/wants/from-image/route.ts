import { NextResponse } from "next/server";

import { createWantFromImagePayload } from "@/lib/bazaar";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const result = await createWantFromImagePayload(await request.formData());
  return NextResponse.json(result.body, { status: result.status });
}
