import { NextResponse } from "next/server";

import { bazaarFetch } from "@/lib/api";

type VerifyPayload = {
  ok?: boolean;
  session?: {
    token?: string;
    expiresAt?: string;
  };
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.text();
  const response = await bazaarFetch("/auth/otp/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  const payload = (await response.json()) as VerifyPayload;
  const nextResponse = NextResponse.json(payload, { status: response.status });

  if (response.ok && payload.ok && payload.session?.token) {
    nextResponse.cookies.set("bazaar_session", payload.session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: payload.session.expiresAt ? new Date(payload.session.expiresAt) : undefined,
    });
  }

  return nextResponse;
}
