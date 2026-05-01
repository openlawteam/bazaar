import { NextResponse } from "next/server";

import { createListingForUser, listingCreateSchema, userListingsPayload } from "@/lib/bazaar";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(userListingsPayload(user.id));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = listingCreateSchema.parse(await request.json());
  return NextResponse.json({ listing: createListingForUser(user.id, body) }, { status: 201 });
}
