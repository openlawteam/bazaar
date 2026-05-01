import { NextResponse } from "next/server";
import { z } from "zod";

import { issueOtpForPhone } from "@/lib/auth/otp";
import { phoneSchema } from "@/lib/bazaar";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const otpStartSchema = z.object({ phoneNumber: phoneSchema });

export async function POST(request: Request) {
  const body = otpStartSchema.parse(await request.json());
  const issued = issueOtpForPhone(body.phoneNumber);
  logger.info("auth.otp.demo_issued", {
    userId: issued.userId,
    phoneNumber: body.phoneNumber,
    expiresAt: issued.expiresAt,
    demoCode: issued.code,
  });

  return NextResponse.json({
    ok: true,
    expiresAt: issued.expiresAt,
    smsStatus: "demo",
    devCode: issued.code,
  });
}
