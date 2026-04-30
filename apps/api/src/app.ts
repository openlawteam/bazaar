import { Hono } from "hono";
import { z } from "zod";

import { defaultAgentRoles } from "@bazaar/agents";

import { config, describeReadiness } from "./config.js";
import { logger } from "./logger.js";
import {
  candidatesRepo,
  conversationRepo,
  inboundEventsRepo,
  preferencesRepo,
  usersRepo,
  wantsRepo,
} from "./db/repos.js";
import {
  issueOtpForPhone,
  mintSessionToken,
  resolveSession,
  verifyOtpForPhone,
} from "./auth/otp.js";
import { linqClient } from "./linq/client.js";
import { verifyLinqSignature } from "./linq/verify.js";
import { linqWebhookEnvelopeSchema, parseInboundMessage } from "./linq/types.js";
import { processInbound } from "./conversation/router.js";

const app = new Hono();

const phoneSchema = z
  .string()
  .min(7)
  .max(20)
  .regex(/^\+?[0-9]+$/, "Phone must be E.164-style digits, optional leading +");

app.get("/health", (context) =>
  context.json({
    ok: true,
    service: "bazaar-api",
    agentRoles: defaultAgentRoles,
    readiness: describeReadiness(),
  }),
);

app.post("/webhooks/linq/inbound", async (context) => {
  const rawBody = await context.req.text();

  if (!config.LINQ_WEBHOOK_SECRET && !config.DEMO_MODE) {
    logger.warn("linq.webhook.no_secret_configured");
    return context.json({ error: "linq_secret_not_configured" }, 503);
  }

  if (!config.DEMO_MODE && config.LINQ_WEBHOOK_SECRET) {
    const verification = verifyLinqSignature({
      rawBody,
      timestampHeader: context.req.header("x-webhook-timestamp") ?? null,
      signatureHeader: context.req.header("x-webhook-signature") ?? null,
      secret: config.LINQ_WEBHOOK_SECRET,
    });
    if (!verification.valid) {
      logger.warn("linq.webhook.invalid", { reason: verification.reason });
      return context.json({ error: "invalid_signature", reason: verification.reason }, 401);
    }
  }

  let envelope;
  try {
    envelope = linqWebhookEnvelopeSchema.parse(JSON.parse(rawBody));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    logger.warn("linq.webhook.bad_envelope", { message });
    return context.json({ error: "bad_envelope" }, 400);
  }

  if (inboundEventsRepo.hasSeen(envelope.event_id)) {
    return context.json({ ok: true, deduped: true });
  }
  inboundEventsRepo.record(envelope.event_id, envelope);

  const inbound = parseInboundMessage(envelope);
  if (!inbound) {
    return context.json({ ok: true, ignored: envelope.event_type });
  }

  processInbound({
    fromPhoneNumber: inbound.fromHandle,
    text: inbound.text,
  }).catch((error) => {
    logger.error("conversation.process.error", {
      eventId: inbound.eventId,
      message: error instanceof Error ? error.message : "unknown",
    });
  });

  return context.json({ ok: true });
});

const otpStartSchema = z.object({ phoneNumber: phoneSchema });
const otpVerifySchema = z.object({ phoneNumber: phoneSchema, code: z.string().min(4).max(8) });

app.post("/auth/otp/start", async (context) => {
  const body = otpStartSchema.parse(await context.req.json());
  const issued = issueOtpForPhone(body.phoneNumber);
  await linqClient.send({
    toPhoneNumber: body.phoneNumber,
    userId: issued.userId,
    body: `Bazaar verification code: ${issued.code}. Expires soon.`,
  });
  return context.json({
    ok: true,
    expiresAt: issued.expiresAt,
    devCode: config.NODE_ENV === "production" ? undefined : issued.code,
  });
});

app.post("/auth/otp/verify", async (context) => {
  const body = otpVerifySchema.parse(await context.req.json());
  const result = verifyOtpForPhone(body.phoneNumber, body.code);
  if (!result.ok || !result.userId) {
    return context.json({ ok: false, reason: result.reason }, 401);
  }
  conversationRepo.upsert(result.userId, { state: "ready" });
  const session = mintSessionToken(result.userId);
  return context.json({
    ok: true,
    session,
    user: usersRepo.findById(result.userId) ?? null,
  });
});

function getSessionUser(authorizationHeader: string | undefined) {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const session = resolveSession(match[1]);
  if (!session) return null;
  return usersRepo.findById(session.userId) ?? null;
}

app.get("/me", (context) => {
  const user = getSessionUser(context.req.header("authorization"));
  if (!user) return context.json({ error: "unauthorized" }, 401);
  return context.json({ user });
});

app.get("/me/preferences", (context) => {
  const user = getSessionUser(context.req.header("authorization"));
  if (!user) return context.json({ error: "unauthorized" }, 401);
  return context.json({ preferences: preferencesRepo.listForUser(user.id) });
});

app.get("/me/wants", (context) => {
  const user = getSessionUser(context.req.header("authorization"));
  if (!user) return context.json({ error: "unauthorized" }, 401);
  return context.json({ wants: wantsRepo.listForUser(user.id) });
});

app.get("/me/wants/:id", (context) => {
  const user = getSessionUser(context.req.header("authorization"));
  if (!user) return context.json({ error: "unauthorized" }, 401);
  const want = wantsRepo.findById(context.req.param("id"));
  if (!want || want.userId !== user.id) return context.json({ error: "not_found" }, 404);
  const candidates = candidatesRepo.listForWant(want.id);
  return context.json({ want, candidates });
});

const wantIngestSchema = z.object({
  phoneNumber: phoneSchema.optional(),
  text: z.string().min(1).max(2000),
});

app.post("/wants", async (context) => {
  const body = wantIngestSchema.parse(await context.req.json());
  const sessionUser = getSessionUser(context.req.header("authorization"));
  const phone = body.phoneNumber ?? sessionUser?.phoneNumber;
  if (!phone) return context.json({ error: "phone_required" }, 400);

  await processInbound({ fromPhoneNumber: phone, text: body.text });
  return context.json({ ok: true });
});

export { app };
export default app;
