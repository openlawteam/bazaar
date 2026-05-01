import { NextResponse } from "next/server";
import { z } from "zod";

import { mintSessionToken, verifyOtpForPhone } from "@/lib/auth/otp";
import { markUserReady, phoneSchema } from "@/lib/bazaar";
import { usersRepo } from "@/lib/db/repos";

export const runtime = "nodejs";

const otpVerifySchema = z.object({ phoneNumber: phoneSchema, code: z.string().min(4).max(8) });

type VerifyPayload = {
  ok: boolean;
  reason?: "no_code" | "expired" | "too_many_attempts" | "bad_code";
  session?: {
    token: string;
    expiresAt: string;
  };
  user?: unknown;
};

export async function POST(request: Request) {
  const body = otpVerifySchema.parse(await request.json());
  const result = verifyOtpForPhone(body.phoneNumber, body.code);
  if (!result.ok || !result.userId) {
    return NextResponse.json({ ok: false, reason: result.reason } satisfies VerifyPayload, { status: 401 });
  }

  markUserReady(result.userId);
  const session = mintSessionToken(result.userId);
  const payload: VerifyPayload = {
    ok: true,
    session,
    user: usersRepo.findById(result.userId) ?? null,
  };
  const response = NextResponse.json(payload);
  response.cookies.set("bazaar_session", session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt),
  });
  return response;
}
