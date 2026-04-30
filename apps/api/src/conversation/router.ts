import { config } from "../config.js";
import { logger } from "../logger.js";
import { conversationRepo, usersRepo, wantsRepo } from "../db/repos.js";
import {
  issueOtpForPhone,
  mintSessionToken,
  resolveSession,
  verifyOtpForPhone,
} from "../auth/otp.js";
import { linqClient } from "../linq/client.js";
import { parseWantText } from "../wants/parser.js";
import { createSpacebaseClient } from "../spacebase/client.js";

const spacebase = createSpacebaseClient();

const HELP_TEXT =
  "Hi from Bazaar. Tell me what you're looking for, e.g. \"used Herman Miller chair under $500 near Brooklyn\" and I'll have agents find options.";

const VERIFY_PROMPT =
  "Welcome to Bazaar. Reply with the 6-digit code I just sent to verify this number.";

const VERIFIED_ACK = "Verified. Tell me what you'd like Bazaar to find for you.";

const OTP_REGEX = /^\s*(\d{6})\s*$/;

function normalizePhoneNumber(phoneNumber: string): string {
  const trimmed = phoneNumber.trim();
  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return `${hasLeadingPlus ? "+" : ""}${digits}`;
}

function phoneAccessKey(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, "");
}

function configuredSmsNumbers(): Set<string> {
  return new Set(
    [...config.SMS_ALLOWED_PHONE_NUMBERS, ...config.SMS_TRUSTED_PHONE_NUMBERS].map((phoneNumber) =>
      phoneAccessKey(phoneNumber),
    ),
  );
}

function isSmsAllowed(phoneNumber: string): boolean {
  const configured = configuredSmsNumbers();
  return configured.size === 0 || configured.has(phoneAccessKey(phoneNumber));
}

function isTrustedSmsPhone(phoneNumber: string): boolean {
  const trusted = new Set(
    config.SMS_TRUSTED_PHONE_NUMBERS.map((trustedPhoneNumber) =>
      phoneAccessKey(trustedPhoneNumber),
    ),
  );
  return trusted.has(phoneAccessKey(phoneNumber));
}

interface ProcessOptions {
  fromPhoneNumber: string;
  text: string;
}

export async function processInbound(options: ProcessOptions): Promise<void> {
  const phone = normalizePhoneNumber(options.fromPhoneNumber);
  const text = options.text.trim();
  if (!phone || !text) return;

  if (!isSmsAllowed(phone)) {
    logger.warn("conversation.sms.blocked", { phone });
    return;
  }

  const user = usersRepo.upsertByPhone(phone);
  let conversation =
    conversationRepo.get(user.id) ??
    conversationRepo.upsert(user.id, { state: "needs_verification" });

  if (text.toLowerCase() === "help") {
    await reply(phone, user.id, HELP_TEXT);
    return;
  }

  if (config.DEMO_MODE) {
    if (!user.phoneVerifiedAt) {
      usersRepo.markVerified(user.id);
      conversation = conversationRepo.upsert(user.id, { state: "ready" });
    }
  }

  if (isTrustedSmsPhone(phone) && !user.phoneVerifiedAt) {
    usersRepo.markVerified(user.id);
    conversation = conversationRepo.upsert(user.id, { state: "ready" });
    logger.info("conversation.sms.trusted_verified", { userId: user.id, phone });
  }

  if (conversation.state === "needs_verification" && !user.phoneVerifiedAt) {
    const otpMatch = text.match(OTP_REGEX);
    if (otpMatch) {
      const verification = verifyOtpForPhone(phone, otpMatch[1] ?? "");
      if (verification.ok) {
        conversationRepo.upsert(user.id, { state: "ready" });
        await reply(phone, user.id, VERIFIED_ACK);
        return;
      }
      await reply(phone, user.id, "That code didn't match. Try again or text START.");
      return;
    }

    const issued = issueOtpForPhone(phone);
    logger.info("conversation.otp.issued", {
      userId: user.id,
      phone,
      expiresAt: issued.expiresAt,
      demoCode: config.NODE_ENV === "production" ? undefined : issued.code,
    });
    await reply(
      phone,
      user.id,
      `${VERIFY_PROMPT}${config.NODE_ENV === "production" ? "" : ` Dev code: ${issued.code}`}`,
    );
    return;
  }

  await handleWantIntake({ phone, userId: user.id, text });
}

async function handleWantIntake(input: { phone: string; userId: string; text: string }) {
  const parsed = await parseWantText(input.text);
  const want = wantsRepo.create({
    userId: input.userId,
    rawText: input.text,
    title: parsed.title,
    description: parsed.description,
    status: "intake",
    maxBudgetCents: parsed.maxBudgetCents,
    currency: parsed.currency,
    locationLabel: parsed.locationLabel,
    spacebaseIntentId: null,
  });

  const posted = await spacebase.postWant({
    userId: input.userId,
    wantId: want.id,
    content: parsed.title,
  });
  wantsRepo.patch(want.id, {
    status: "searching",
    spacebaseIntentId: posted.intentId,
  });

  conversationRepo.upsert(input.userId, {
    state: "awaiting_approval",
    pendingWantId: want.id,
  });

  const summary = formatWantAck(parsed);
  await reply(input.phone, input.userId, summary);
}

function formatWantAck(parsed: {
  title: string;
  maxBudgetCents: number | null;
  locationLabel: string | null;
}): string {
  const parts: string[] = ["Got it: " + parsed.title];
  if (parsed.maxBudgetCents !== null) {
    parts.push(`Budget cap: $${(parsed.maxBudgetCents / 100).toFixed(0)}`);
  }
  if (parsed.locationLabel) {
    parts.push(`Near: ${parsed.locationLabel}`);
  }
  parts.push("Searching now. I'll text options when ready.");
  return parts.join("\n");
}

async function reply(toPhoneNumber: string, userId: string, body: string): Promise<void> {
  const result = await linqClient.send({ toPhoneNumber, userId, body });
  if (!result.ok) {
    logger.warn("conversation.reply.failed", {
      userId,
      toPhoneNumber,
      reason: result.errorMessage,
    });
  }
}

export { mintSessionToken, resolveSession };
