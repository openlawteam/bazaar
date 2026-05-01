import { z } from "zod";

import { type Want, wantSchema } from "@/lib/core";
import { config, describeReadiness } from "@/lib/config";
import {
  candidatesRepo,
  conversationRepo,
  listingsRepo,
  outboundRepo,
  preferencesRepo,
  usersRepo,
  wantsRepo,
} from "@/lib/db/repos";
import { loadDemoMarketplaceData, saveDemoMatchRun } from "@/lib/demo-db";
import { analyzeProductImage, productFactsToWantText } from "@/lib/vision";
import {
  buildApprovalResult,
  demoMarketplaceData,
  runMarketplaceMatch,
  type AgentTraceEvent,
} from "@/lib/shopping";
import { defaultAgentRoles } from "@/lib/agents";

export type ListingDetail = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  priceCents: number | null;
  currency: string;
  locationLabel: string | null;
  status: string;
  condition: string;
  source: "user" | "marketplace";
  sellerLabel: string | null;
  sellerContactHandle: string | null;
  tags: string[];
};

export type SaleListing = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  priceCents: number | null;
  currency: string;
  locationLabel: string | null;
  status: string;
  source: "user" | "marketplace";
};

const FALLBACK_LISTING_IMAGES = {
  chair: "/demo/demo-aeron.jpg",
  audio: "/demo/airpods-max.jpg",
  default: "/demo/real-chair.jpg",
} as const;

export const phoneSchema = z
  .string()
  .min(7)
  .max(20)
  .regex(/^\+?[0-9]+$/, "Phone must be E.164-style digits, optional leading +");

export const listingCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  locationLabel: z.string().max(120).optional(),
});

export const wantIngestSchema = z.object({
  phoneNumber: phoneSchema.optional(),
  text: z.string().min(1).max(2000),
});

export const approvalSchema = z.object({
  userId: z.string().default("user-demo-1"),
  listingId: z.string().optional(),
  want: wantSchema.optional(),
});

export function healthPayload() {
  return {
    ok: true,
    service: "bazaar-next",
    agentRoles: defaultAgentRoles,
    readiness: describeReadiness(),
  };
}

export function userPayload(userId: string) {
  return {
    user: usersRepo.findById(userId) ?? null,
  };
}

export function userPreferencesPayload(userId: string) {
  return {
    preferences: preferencesRepo.listForUser(userId),
  };
}

export function userWantsPayload(userId: string) {
  return {
    wants: wantsRepo.listForUser(userId),
  };
}

export function userWantPayload(userId: string, wantId: string) {
  const want = wantsRepo.findById(wantId);
  if (!want || want.userId !== userId) return null;
  return {
    want,
    candidates: candidatesRepo.listForWant(want.id),
  };
}

export function userListingsPayload(userId: string) {
  return {
    listings: listingsRepo.listForUser(userId).map((listing) => ({
      ...listing,
      imageUrl: userListingImageUrl(listing.id, listing.title, listing.imageUrl),
    })),
  };
}

export async function forSaleInventoryPayload(userId: string): Promise<{ listings: SaleListing[] }> {
  const userListings = userListingsPayload(userId).listings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    imageUrl: listing.imageUrl,
    priceCents: listing.priceCents,
    currency: listing.currency,
    locationLabel: listing.locationLabel,
    status: listing.status,
    source: "user" as const,
  }));
  const data = await loadDemoMarketplaceData();
  const marketplaceListings = data.listings
    .filter((listing) => listing.status === "available")
    .map((listing) => ({
      id: listing.id,
      title: listing.title,
      description: listing.description,
      imageUrl: marketplaceListingImageUrl(listing.id, listing.title, listing.imageUrl),
      priceCents: listing.priceCents,
      currency: listing.currency,
      locationLabel: listing.locationLabel,
      status: listing.status,
      source: "marketplace" as const,
    }));

  return {
    listings: [...userListings, ...marketplaceListings],
  };
}

export async function listingDetailPayload(userId: string, listingId: string): Promise<ListingDetail | null> {
  const userListing = listingsRepo.findForUser(userId, listingId);
  if (userListing) {
    return {
      id: userListing.id,
      title: userListing.title,
      description: userListing.description,
      imageUrl: userListingImageUrl(userListing.id, userListing.title, userListing.imageUrl),
      priceCents: userListing.priceCents,
      currency: userListing.currency,
      locationLabel: userListing.locationLabel,
      status: userListing.status,
      condition: userListing.condition,
      source: "user",
      sellerLabel: "Your listing",
      sellerContactHandle: userListing.userId,
      tags: userListing.tags,
    };
  }

  const data = await loadDemoMarketplaceData();
  const marketplaceListing = data.listings.find((listing) => listing.id === listingId);
  if (!marketplaceListing) return null;
  const seller = data.sellers.find((candidate) => candidate.id === marketplaceListing.sellerId);

  return {
    id: marketplaceListing.id,
    title: marketplaceListing.title,
    description: marketplaceListing.description,
    imageUrl: marketplaceListingImageUrl(marketplaceListing.id, marketplaceListing.title, marketplaceListing.imageUrl),
    priceCents: marketplaceListing.priceCents,
    currency: marketplaceListing.currency,
    locationLabel: marketplaceListing.locationLabel,
    status: marketplaceListing.status,
    condition: marketplaceListing.condition,
    source: "marketplace",
    sellerLabel: seller?.displayName ?? null,
    sellerContactHandle: seller?.contactHandle ?? null,
    tags: marketplaceListing.tags,
  };
}

export async function alertSellerForListing(userId: string, listingId: string) {
  const listing = await listingDetailPayload(userId, listingId);
  if (!listing) return null;
  const buyer = usersRepo.findById(userId);
  const body = [
    `Bazaar buyer alert: ${buyer?.phoneNumber ?? "A buyer"} wants to buy "${listing.title}".`,
    listing.locationLabel ? `Listing location: ${listing.locationLabel}.` : null,
    `Agent next step: confirm availability and preferred handoff window.`,
  ]
    .filter(Boolean)
    .join(" ");

  const alert = outboundRepo.record({
    userId,
    toPhoneNumber: listing.sellerContactHandle ?? listing.sellerLabel ?? "seller:unknown",
    body,
    status: "queued",
    providerMessageId: null,
    errorMessage: null,
    sentAt: null,
  });

  return {
    alert,
    listing,
  };
}

export async function userFeedPayload() {
  const data = await loadDemoMarketplaceData();
  const feed = data.listings
    .filter((listing) => listing.status === "available")
    .slice(0, 6)
    .map((listing) => ({
      ...listing,
      imageUrl: marketplaceListingImageUrl(listing.id, listing.title, listing.imageUrl),
    }));
  return { feed };
}

export function createListingForUser(userId: string, input: z.infer<typeof listingCreateSchema>) {
  return listingsRepo.create({
    userId,
    rawText: [input.title, input.description].filter(Boolean).join("\n\n"),
    title: input.title,
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? fallbackListingImageUrl(input.title),
    priceCents: input.priceCents ?? null,
    currency: "USD",
    locationLabel: input.locationLabel ?? null,
    condition: "unknown",
    status: "available",
    tags: [],
    spacebaseIntentId: null,
  });
}

function fallbackListingImageUrl(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("airpod") || lower.includes("headphone") || lower.includes("audio")) {
    return FALLBACK_LISTING_IMAGES.audio;
  }
  if (lower.includes("chair") || lower.includes("aeron") || lower.includes("herman")) {
    return FALLBACK_LISTING_IMAGES.chair;
  }
  return FALLBACK_LISTING_IMAGES.default;
}

function marketplaceListingImageUrl(id: string, title: string, imageUrl: string | undefined): string {
  if (imageUrl?.startsWith("/")) return imageUrl;
  return imageUrl ?? generatedListingImageUrl(id, title);
}

function userListingImageUrl(id: string, title: string, imageUrl: string | null): string {
  return imageUrl ?? fallbackListingImageUrl(title);
}

function generatedListingImageUrl(id: string, title: string): string {
  return `/api/listing-images/${encodeURIComponent(id)}?title=${encodeURIComponent(title)}`;
}

export async function createWantForUser(userId: string, text: string) {
  const want = createWantFromText({ userId, rawText: text });
  wantsRepo.create({
    id: want.id,
    userId: want.userId,
    rawText: want.rawText,
    title: want.title,
    description: want.description ?? null,
    status: want.status,
    maxBudgetCents: want.maxBudgetCents ?? null,
    currency: want.currency,
    locationLabel: want.locationLabel ?? null,
    spacebaseIntentId: want.spacebaseIntentId ?? null,
  });
  const shopping = await matchAndSave(want, "text");
  return {
    accepted: true,
    next: shopping.nextAction,
    want,
    shopping,
  };
}

export async function createWantFromPayload(rawBody: unknown, sessionUserId?: string) {
  const directWant = wantSchema.safeParse(rawBody);
  if (directWant.success) {
    const shopping = await matchAndSave(directWant.data, "text");
    return {
      status: 200,
      body: {
        accepted: true,
        next: shopping.nextAction,
        want: directWant.data,
        shopping,
      },
    };
  }

  const body = wantIngestSchema.parse(rawBody);
  if (!sessionUserId) {
    return {
      status: 401,
      body: { error: "unauthorized" },
    };
  }

  return {
    status: 200,
    body: await createWantForUser(sessionUserId, body.text),
  };
}

export async function createWantFromImagePayload(formData: FormData) {
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return {
      status: 400,
      body: { error: "Multipart field `image` is required." },
    };
  }

  if (!file.type.startsWith("image/")) {
    return {
      status: 400,
      body: { error: "`image` must be an image file." },
    };
  }

  if (file.size > 5 * 1024 * 1024) {
    return {
      status: 413,
      body: { error: "Image upload must be 5MB or smaller." },
    };
  }

  const userId = readFormString(formData.get("userId")) ?? "user-demo-1";
  const message = readFormString(formData.get("message")) ?? "I wanna buy this";
  const locationLabel = readFormString(formData.get("locationLabel")) ?? "Brooklyn";
  const maxBudgetCents = readOptionalInteger(formData.get("maxBudgetCents")) ?? 50000;
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

  return {
    status: 202,
    body: {
      accepted: true,
      next: shopping.nextAction,
      vision,
      want,
      shopping,
    },
  };
}

export async function approveSellerOutreach(wantId: string, rawPayload: unknown) {
  const payload = approvalSchema.parse(rawPayload ?? {});
  const want =
    payload.want ??
    createWantFromText({
      id: wantId,
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

  return {
    accepted: true,
    want: {
      ...want,
      status: "contacting_seller",
      updatedAt: new Date().toISOString(),
    },
    approval,
  };
}

async function matchAndSave(want: Want, inputMode: "text" | "image", prefixTrace: AgentTraceEvent[] = []) {
  const data = (await loadDemoMarketplaceData()) ?? demoMarketplaceData;
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

export function markUserReady(userId: string): void {
  conversationRepo.upsert(userId, { state: "ready" });
}
