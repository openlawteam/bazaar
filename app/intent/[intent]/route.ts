import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type Intent = "buy" | "sell";

function isIntent(value: string): value is Intent {
  return value === "buy" || value === "sell";
}

export async function GET(request: Request, { params }: { params: Promise<{ intent: string }> }) {
  const { intent } = await params;
  if (!isIntent(intent)) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  const cookieStore = await cookies();
  const destination = cookieStore.get("bazaar_session")?.value ? "/dashboard" : "/auth";
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.cookies.set("bazaar_intent", intent, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
