import { createHash, randomBytes, randomInt } from "node:crypto";

import { config } from "../config";
import { otpRepo, sessionsRepo, usersRepo } from "../db/repos";

const SESSION_TTL_DAYS = 30;

function hashCode(code: string, secret: string): string {
  return createHash("sha256").update(`${secret}:${code}`).digest("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function nowPlusSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export interface IssueOtpResult {
  userId: string;
  code: string;
  expiresAt: string;
}

export function issueOtpForPhone(phoneNumber: string): IssueOtpResult {
  const user = usersRepo.upsertByPhone(phoneNumber);
  const code = generateCode();
  const expiresAt = nowPlusSeconds(config.OTP_CODE_TTL_SECONDS);
  otpRepo.create({
    userId: user.id,
    codeHash: hashCode(code, config.SESSION_SECRET),
    expiresAt,
  });
  return { userId: user.id, code, expiresAt };
}

export interface VerifyOtpResult {
  ok: boolean;
  reason?: "no_code" | "expired" | "too_many_attempts" | "bad_code";
  userId?: string;
}

export function verifyOtpForPhone(phoneNumber: string, code: string): VerifyOtpResult {
  const user = usersRepo.findByPhone(phoneNumber);
  if (!user) return { ok: false, reason: "no_code" };

  const otp = otpRepo.latestForUser(user.id);
  if (!otp) return { ok: false, reason: "no_code" };
  if (new Date(otp.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  if (otp.attempts >= config.OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }
  otpRepo.recordAttempt(otp.id);

  const expected = hashCode(code, config.SESSION_SECRET);
  if (expected !== otp.codeHash) {
    return { ok: false, reason: "bad_code" };
  }

  otpRepo.consume(otp.id);
  usersRepo.markVerified(user.id);
  return { ok: true, userId: user.id };
}

export interface SessionToken {
  token: string;
  expiresAt: string;
}

export function mintSessionToken(userId: string): SessionToken {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  sessionsRepo.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });
  return { token, expiresAt };
}

export function resolveSession(token: string | undefined): { userId: string } | null {
  if (!token) return null;
  const session = sessionsRepo.findByTokenHash(hashToken(token));
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;
  return { userId: session.userId };
}
