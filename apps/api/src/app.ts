import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { serveStatic } from "@hono/node-server/serve-static";
import { z } from "zod";

import { defaultAgentRoles } from "@bazaar/agents";
import { type Want, wantSchema } from "@bazaar/core";
import { buildApprovalResult, demoMarketplaceData, runMarketplaceMatch, type AgentTraceEvent } from "@bazaar/shopping";

import { config, describeReadiness } from "./config.js";
import { logger } from "./logger.js";
import {
  candidatesRepo,
  conversationRepo,
  inboundEventsRepo,
  listingsRepo,
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
import { loadDemoMarketplaceData, saveDemoMatchRun } from "./db.js";
import { analyzeProductImage, productFactsToWantText } from "./vision.js";

const app = new Hono();

app.use("/demo/*", serveStatic({ root: "./public" }));

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

const listingCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priceCents: z.number().int().nonnegative().optional(),
  locationLabel: z.string().max(120).optional(),
});

app.get("/me/listings", (context) => {
  const user = getSessionUser(context.req.header("authorization"));
  if (!user) return context.json({ error: "unauthorized" }, 401);
  return context.json({ listings: listingsRepo.listForUser(user.id) });
});

app.post("/me/listings", async (context) => {
  const user = getSessionUser(context.req.header("authorization"));
  if (!user) return context.json({ error: "unauthorized" }, 401);
  const body = listingCreateSchema.parse(await context.req.json());
  const listing = listingsRepo.create({
    userId: user.id,
    rawText: [body.title, body.description].filter(Boolean).join("\n\n"),
    title: body.title,
    description: body.description ?? null,
    priceCents: body.priceCents ?? null,
    currency: "USD",
    locationLabel: body.locationLabel ?? null,
    condition: "unknown",
    status: "available",
    tags: [],
    spacebaseIntentId: null,
  });

  return context.json({ listing }, 201);
});

app.get("/me/feed", async (context) => {
  const user = getSessionUser(context.req.header("authorization"));
  if (!user) return context.json({ error: "unauthorized" }, 401);
  const data = (await loadDemoMarketplaceData()) ?? demoMarketplaceData;
  const feed = data.listings.filter((listing) => listing.status === "available").slice(0, 6);

  return context.json({ feed });
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
  const rawBody = await context.req.json();
  const directWant = wantSchema.safeParse(rawBody);

  if (directWant.success) {
    const shopping = await matchAndSave(directWant.data, "text");
    return context.json({
      accepted: true,
      next: shopping.nextAction,
      want: directWant.data,
      shopping,
    });
  }

  const body = wantIngestSchema.parse(rawBody);
  const sessionUser = getSessionUser(context.req.header("authorization"));
  const phone = body.phoneNumber ?? sessionUser?.phoneNumber;
  if (!phone) return context.json({ error: "phone_required" }, 400);

  await processInbound({ fromPhoneNumber: phone, text: body.text });
  return context.json({ ok: true });
});

app.post(
  "/wants/from-image",
  bodyLimit({
    maxSize: 5 * 1024 * 1024,
    onError: (context) => context.json({ error: "Image upload must be 5MB or smaller." }, 413),
  }),
  async (context) => {
    const body = await context.req.parseBody();
    const file = body.image;

    if (!(file instanceof File)) {
      return context.json({ error: "Multipart field `image` is required." }, 400);
    }

    if (!file.type.startsWith("image/")) {
      return context.json({ error: "`image` must be an image file." }, 400);
    }

    const userId = readFormString(body.userId) ?? "user-demo-1";
    const message = readFormString(body.message) ?? "I wanna buy this";
    const locationLabel = readFormString(body.locationLabel) ?? "Brooklyn";
    const maxBudgetCents = readOptionalInteger(body.maxBudgetCents) ?? 50000;
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const vision = await analyzeProductImage({
      imageBuffer,
      fileName: file.name,
      message,
    });
    const rawText = productFactsToWantText(vision, message);
    const want = createWantFromText({
      userId,
      rawText,
      locationLabel,
      maxBudgetCents,
    });
    const shopping = await matchAndSave(want, "image", [
      {
        role: "vision_agent",
        status: "COMPLETE",
        summary: `Identified ${vision.brandGuess ?? "unknown brand"} ${vision.modelGuess ?? ""} ${vision.itemType}.`.replace(
          /\s+/g,
          " ",
        ),
        metadata: {
          labels: vision.labels,
          webEntities: vision.webEntities,
          extractedText: vision.extractedText,
          confidence: vision.confidence,
          fallbackUsed: vision.fallbackUsed,
        },
      },
    ]);

    return context.json(
      {
        accepted: true,
        next: shopping.nextAction,
        vision,
        want,
        shopping,
      },
      202,
    );
  },
);

const approvalSchema = z.object({
  userId: z.string().default("user-demo-1"),
  listingId: z.string().optional(),
  want: wantSchema.optional(),
});

app.post("/wants/:id/approve-outreach", async (context) => {
  const payload = approvalSchema.parse(await context.req.json().catch(() => ({})));
  const want =
    payload.want ??
    createWantFromText({
      id: context.req.param("id"),
      userId: payload.userId,
      rawText: "Find me a used Herman Miller chair under $500 near Brooklyn",
    });
  const data = await loadDemoMarketplaceData();
  const matchResult = runMarketplaceMatch({ want, data });
  const selectedMatch = payload.listingId
    ? matchResult.matches.find((match) => match.listing.id === payload.listingId)
    : matchResult.matches[0];
  const approval = buildApprovalResult({
    want,
    buyer: matchResult.buyer,
    match: selectedMatch,
    data,
  });

  await saveDemoMatchRun({
    id: `approval-${want.id}`,
    buyerId: matchResult.buyer.id,
    wantId: want.id,
    inputMode: "approval",
    selectedListingId: selectedMatch?.listing.id,
    summary: approval.trace.at(-1)?.summary ?? "Buyer approved seller outreach.",
    outreachDraft: approval.sellerOutreachDraft,
    trace: approval.trace,
  });

  return context.json({
    accepted: true,
    want: {
      ...want,
      status: "contacting_seller",
      updatedAt: new Date().toISOString(),
    },
    approval,
  });
});

async function matchAndSave(want: Want, inputMode: "text" | "image", prefixTrace: AgentTraceEvent[] = []) {
  const data = await loadDemoMarketplaceData();
  const shopping = runMarketplaceMatch({ want, data });
  const trace = [...prefixTrace, ...shopping.trace];
  const result = withAbsoluteImageUrls({ ...shopping, trace });

  await saveDemoMatchRun({
    id: `${inputMode}-${want.id}`,
    buyerId: shopping.buyer.id,
    wantId: want.id,
    inputMode,
    selectedListingId: shopping.matches[0]?.listing.id,
    summary: shopping.summary,
    outreachDraft: shopping.sellerOutreachDraft,
    trace,
  });

  return result;
}

function withAbsoluteImageUrls<T extends ReturnType<typeof runMarketplaceMatch>>(shopping: T): T {
  const absolutize = (value: string | undefined) =>
    value?.startsWith("/") ? new URL(value, config.PUBLIC_APP_URL).toString() : value;

  for (const candidate of shopping.candidates) {
    candidate.imageUrl = absolutize(candidate.imageUrl);
  }
  for (const candidate of shopping.rankedCandidates) {
    candidate.imageUrl = absolutize(candidate.imageUrl);
  }
  for (const match of shopping.matches) {
    match.candidate.imageUrl = absolutize(match.candidate.imageUrl);
    match.listing.imageUrl = absolutize(match.listing.imageUrl);
  }
  return shopping;
}

function createWantFromText(input: {
  id?: string;
  userId: string;
  rawText: string;
  locationLabel?: string;
  maxBudgetCents?: number;
}): Want {
  const createdAt = new Date().toISOString();
  const maxBudgetCents = input.maxBudgetCents ?? extractBudgetCents(input.rawText);
  const locationLabel = input.locationLabel ?? extractLocation(input.rawText);
  const title = buildWantTitle(input.rawText);

  return wantSchema.parse({
    id: input.id ?? `want-${crypto.randomUUID()}`,
    userId: input.userId,
    rawText: input.rawText,
    title,
    status: "searching",
    maxBudgetCents,
    currency: "USD",
    locationLabel,
    createdAt,
    updatedAt: createdAt,
  });
}

function buildWantTitle(rawText: string): string {
  const lower = rawText.toLowerCase();
  if (lower.includes("airpods") || lower.includes("airpod") || lower.includes("headphone")) {
    return "Used Apple AirPods Max";
  }
  if (lower.includes("herman") || lower.includes("aeron") || lower.includes("chair")) {
    return "Used Herman Miller Aeron chair";
  }
  if (lower.includes("bike") || lower.includes("bicycle")) {
    return "Used road bike";
  }
  return rawText.replace(/^find me\s+/i, "").replace(/^i want to buy\s+/i, "").trim() || "Buyer want";
}

function extractBudgetCents(rawText: string): number | undefined {
  const match = rawText.match(/\$?(\d{2,5})(?:\s?dollars)?/i);
  return match?.[1] ? Number(match[1]) * 100 : undefined;
}

function extractLocation(rawText: string): string | undefined {
  const nearMatch = rawText.match(/\bnear\s+([a-z\s]+?)(?:[,.!?]|$)/i);
  if (nearMatch?.[1]) {
    return toTitleCase(nearMatch[1].trim());
  }
  return rawText.toLowerCase().includes("brooklyn") ? "Brooklyn" : undefined;
}

function readFormString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readOptionalInteger(value: unknown): number | undefined {
  const parsed = Number(readFormString(value));
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function toTitleCase(value: string): string {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export { app };
export default app;
