import { config } from "../config.js";
import { logger } from "../logger.js";
import { conversationRepo, usersRepo, wantsRepo } from "../db/repos.js";
import type { UserRow } from "../db/store.js";
import {
  issueOtpForPhone,
  mintSessionToken,
  resolveSession,
  verifyOtpForPhone,
} from "../auth/otp.js";
import { linqClient } from "../linq/client.js";
import { parseWantText, type ParsedWant } from "../wants/parser.js";
import { createSpacebaseClient } from "../spacebase/client.js";
import { gatewayClient } from "../gateway/client.js";
import { SMS_AGENT_SYSTEM_PROMPT, buildIntakeUserContext } from "../adin/prompt.js";
import { classifyIntent, type SmsIntent } from "./intent.js";
import { handleSellIntake } from "./sell.js";
import { handleDiscover } from "./discover.js";

const spacebase = createSpacebaseClient();

const HELP_TEXT = [
  "Bazaar by SMS. You can:",
  "- Tell me what you want (e.g. \"used Aeron under $500 near Brooklyn\")",
  "- List something to sell (e.g. \"selling Trek road bike $400 in Park Slope\")",
  "- Ask what's trending, what's new, or what's local to me",
].join("\n");

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

  const intent = classifyIntent(text);

  if (intent.kind === "help") {
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

  await dispatchIntent({ phone, user, text, intent });
}

async function dispatchIntent(args: {
  phone: string;
  user: UserRow;
  text: string;
  intent: SmsIntent;
}): Promise<void> {
  const { phone, user, text, intent } = args;
  switch (intent.kind) {
    case "help": {
      await reply(phone, user.id, HELP_TEXT);
      return;
    }
    case "sell": {
      const result = handleSellIntake({
        userId: user.id,
        rawText: text,
        remainder: intent.remainder,
      });
      await reply(phone, user.id, result.replyBody);
      return;
    }
    case "discover": {
      const result = handleDiscover({
        scope: intent.scope,
        user,
        locationHint: intent.locationHint,
      });
      await reply(phone, user.id, result.replyBody);
      return;
    }
    case "want": {
      await handleWantIntake({ phone, userId: user.id, text });
      return;
    }
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
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

  const replyBody = await composeIntakeReply({
    rawText: input.text,
    parsed,
    userId: input.userId,
  });
  await reply(input.phone, input.userId, replyBody);
}

async function composeIntakeReply(input: {
  rawText: string;
  parsed: ParsedWant;
  userId: string;
}): Promise<string> {
  if (gatewayClient.isConfigured()) {
    const gatewayResult = await gatewayClient.complete({
      systemPrompt: SMS_AGENT_SYSTEM_PROMPT,
      userMessage: buildIntakeUserContext({
        rawText: input.rawText,
        parsed: input.parsed,
      }),
    });
    if (gatewayResult.ok && gatewayResult.text) {
      logger.info("conversation.reply.source", {
        userId: input.userId,
        source: "gateway",
        model: gatewayResult.model,
      });
      return gatewayResult.text;
    }
    logger.warn("conversation.reply.gateway_fallback", {
      userId: input.userId,
      reason: gatewayResult.reason,
      model: gatewayResult.model,
    });
  }

  return formatWantAck(input.parsed);
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
