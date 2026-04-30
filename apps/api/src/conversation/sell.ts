import { userListingsRepo } from "../db/repos.js";
import type { UserListingRow } from "../db/store.js";
import { logger } from "../logger.js";

export interface ParsedSellPost {
  title: string;
  description: string | null;
  priceCents: number | null;
  currency: string;
  locationLabel: string | null;
  condition: UserListingRow["condition"];
  tags: string[];
}

const PRICE_REGEX = /\$\s*(\d{1,5})(?:\.(\d{2}))?|\b(\d{2,5})\s*(?:dollars|bucks|usd)\b/i;
const LOCATION_REGEX = /(?:in|near|from|located\s+in)\s+([A-Za-z][A-Za-z\s.'-]{2,60})/i;

const CONDITION_KEYWORDS: Array<{ pattern: RegExp; condition: UserListingRow["condition"] }> = [
  { pattern: /\b(brand\s*new|nwt|sealed|unopened|like\s*new|excellent|mint)\b/i, condition: "excellent" },
  { pattern: /\b(good|gently\s*used|lightly\s*used|used)\b/i, condition: "good" },
  { pattern: /\b(fair|worn|rough|as[\s-]*is|project)\b/i, condition: "fair" },
];

function stripPriceAndLocation(text: string): string {
  return text
    .replace(PRICE_REGEX, " ")
    .replace(LOCATION_REGEX, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[,;:\-]+\s*$/g, "")
    .trim();
}

function pickCondition(text: string): UserListingRow["condition"] {
  for (const { pattern, condition } of CONDITION_KEYWORDS) {
    if (pattern.test(text)) return condition;
  }
  return "unknown";
}

function pickTags(title: string, condition: UserListingRow["condition"], location: string | null): string[] {
  const tags = new Set<string>();
  for (const word of title.toLowerCase().split(/[^a-z0-9]+/)) {
    if (word.length >= 3 && word.length <= 24) tags.add(word);
  }
  if (condition !== "unknown") tags.add(condition);
  if (location) tags.add(location.toLowerCase());
  tags.add("user_listed");
  return Array.from(tags).slice(0, 12);
}

/**
 * Parses an SMS sell post into structured listing fields.
 *
 * `remainder` should already have the leading verb stripped by the intent
 * classifier (e.g. "selling " → ""), so we treat the entire remainder as the
 * candidate title/description and extract price + location from anywhere in
 * the string.
 */
export function parseSellText(rawText: string, remainder: string): ParsedSellPost {
  const source = remainder || rawText;
  const priceMatch = source.match(PRICE_REGEX);
  const dollars = priceMatch?.[1] ?? priceMatch?.[3];
  const cents = priceMatch?.[2];
  const priceCents =
    dollars !== undefined ? Number(dollars) * 100 + (cents ? Number(cents) : 0) : null;

  const locationMatch = source.match(LOCATION_REGEX);
  const locationLabel = locationMatch?.[1]?.trim() ?? null;

  const cleaned = stripPriceAndLocation(source);
  const title = cleaned.length > 0 ? cleaned.slice(0, 120) : source.slice(0, 120);
  const description = source.length > 200 ? source : null;
  const condition = pickCondition(source);

  return {
    title,
    description,
    priceCents,
    currency: "USD",
    locationLabel,
    condition,
    tags: pickTags(title, condition, locationLabel),
  };
}

export interface SellIntakeInput {
  userId: string;
  rawText: string;
  remainder: string;
}

export interface SellIntakeResult {
  listing: UserListingRow;
  replyBody: string;
  missingFields: Array<"price" | "location">;
}

/**
 * Persist a user-created listing and produce an SMS-friendly acknowledgement.
 *
 * The reply intentionally mentions any missing fields (price / location) so
 * the seller can text a follow-up without us needing a multi-turn state
 * machine. We don't post sell intents to Spacebase yet — the contract only
 * covers buyer wants.
 */
export function handleSellIntake(input: SellIntakeInput): SellIntakeResult {
  const parsed = parseSellText(input.rawText, input.remainder);
  const listing = userListingsRepo.create({
    userId: input.userId,
    rawText: input.rawText,
    title: parsed.title,
    description: parsed.description,
    priceCents: parsed.priceCents,
    currency: parsed.currency,
    locationLabel: parsed.locationLabel,
    condition: parsed.condition,
    status: "available",
    tags: parsed.tags,
    spacebaseIntentId: null,
  });

  const missing: SellIntakeResult["missingFields"] = [];
  if (listing.priceCents === null) missing.push("price");
  if (!listing.locationLabel) missing.push("location");

  logger.info("conversation.sell.created", {
    userId: input.userId,
    listingId: listing.id,
    priceCents: listing.priceCents,
    locationLabel: listing.locationLabel,
    condition: listing.condition,
  });

  return {
    listing,
    replyBody: formatSellAck(listing, missing),
    missingFields: missing,
  };
}

function formatPrice(priceCents: number | null, currency: string): string | null {
  if (priceCents === null) return null;
  if (currency === "USD") return `$${(priceCents / 100).toFixed(0)}`;
  return `${(priceCents / 100).toFixed(0)} ${currency}`;
}

function formatSellAck(listing: UserListingRow, missing: SellIntakeResult["missingFields"]): string {
  const parts = [`Listed: ${listing.title}`];
  const price = formatPrice(listing.priceCents, listing.currency);
  if (price) parts.push(`Asking ${price}`);
  if (listing.locationLabel) parts.push(`Pickup: ${listing.locationLabel}`);
  if (listing.condition !== "unknown") parts.push(`Condition: ${listing.condition}`);

  if (missing.length > 0) {
    parts.push(
      `Reply with ${missing.join(" and ")} so buyers can find it.`,
    );
  } else {
    parts.push("I'll surface this to matching buyers.");
  }
  return parts.join("\n");
}
