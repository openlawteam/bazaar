import { demoMarketplaceData, type DemoListing, type DemoSeller } from "@bazaar/shopping";

import { userListingsRepo } from "../db/repos.js";
import type { UserListingRow, UserRow } from "../db/store.js";
import { logger } from "../logger.js";
import type { DiscoverScope } from "./intent.js";

const MAX_RESULTS = 3;
const MAX_SMS_BODY_CHARS = 320;

interface DiscoverItem {
  id: string;
  title: string;
  priceCents: number | null;
  currency: string;
  locationLabel: string | null;
  sellerLabel: string | null;
  source: "user" | "demo";
  trending: number;
  recencyTs: number;
}

export interface DiscoverInput {
  scope: DiscoverScope;
  user: UserRow;
  locationHint: string | null;
}

export interface DiscoverResult {
  replyBody: string;
  itemCount: number;
}

/**
 * Combine SMS-created listings with the seeded marketplace and pick the
 * top-N for the requested scope. Trending uses a synthetic seller-trust
 * proxy because we don't have view-counts yet; "new" uses createdAt; "local"
 * filters on the user's home location (or a hint embedded in the message
 * like "near Brooklyn").
 *
 * Output is hard-capped to ~320 chars so a single SMS segment usually fits.
 */
export function handleDiscover(input: DiscoverInput): DiscoverResult {
  const items = collectItems();
  const targetLocation = pickLocation(input);
  const ranked = rankItems(items, input.scope, targetLocation);
  const top = ranked.slice(0, MAX_RESULTS);

  logger.info("conversation.discover.served", {
    userId: input.user.id,
    scope: input.scope,
    targetLocation,
    candidateCount: items.length,
    returnedCount: top.length,
  });

  return {
    replyBody: formatReply({ scope: input.scope, targetLocation, items: top }),
    itemCount: top.length,
  };
}

function collectItems(): DiscoverItem[] {
  const sellersById = new Map<string, DemoSeller>(
    demoMarketplaceData.sellers.map((seller) => [seller.id, seller]),
  );

  const seeded: DiscoverItem[] = demoMarketplaceData.listings
    .filter((listing) => listing.status === "available")
    .map((listing) => fromDemoListing(listing, sellersById.get(listing.sellerId)));

  const userCreated: DiscoverItem[] = userListingsRepo
    .listAvailable()
    .map((listing) => fromUserListing(listing));

  return [...userCreated, ...seeded];
}

function fromDemoListing(listing: DemoListing, seller: DemoSeller | undefined): DiscoverItem {
  const trustScore = seller?.trustScore ?? 0.6;
  const responseBoost =
    seller?.responseSpeed === "fast" ? 0.15 : seller?.responseSpeed === "medium" ? 0.05 : 0;
  return {
    id: listing.id,
    title: listing.title,
    priceCents: listing.priceCents,
    currency: listing.currency,
    locationLabel: listing.locationLabel,
    sellerLabel: seller?.displayName ?? null,
    source: "demo",
    trending: trustScore + responseBoost,
    recencyTs: 0,
  };
}

function fromUserListing(listing: UserListingRow): DiscoverItem {
  return {
    id: listing.id,
    title: listing.title,
    priceCents: listing.priceCents,
    currency: listing.currency,
    locationLabel: listing.locationLabel,
    sellerLabel: "Bazaar member",
    source: "user",
    trending: 0.85,
    recencyTs: Date.parse(listing.createdAt) || 0,
  };
}

function pickLocation(input: DiscoverInput): string | null {
  if (input.locationHint) return input.locationHint;
  if (input.scope === "local") return input.user.homeLocationLabel;
  return null;
}

function rankItems(
  items: DiscoverItem[],
  scope: DiscoverScope,
  targetLocation: string | null,
): DiscoverItem[] {
  const filtered = targetLocation
    ? items.filter((item) =>
        item.locationLabel?.toLowerCase().includes(targetLocation.toLowerCase()),
      )
    : items;

  const pool = filtered.length > 0 ? filtered : items;

  switch (scope) {
    case "trending":
      return [...pool].sort((a, b) => b.trending - a.trending);
    case "new":
      return [...pool].sort((a, b) => {
        if (b.recencyTs !== a.recencyTs) return b.recencyTs - a.recencyTs;
        return Number(b.source === "user") - Number(a.source === "user");
      });
    case "local":
      return [...pool].sort((a, b) => b.trending - a.trending);
    default: {
      const _exhaustive: never = scope;
      return _exhaustive;
    }
  }
}

function formatPrice(priceCents: number | null, currency: string): string {
  if (priceCents === null) return "no price set";
  if (currency === "USD") return `$${(priceCents / 100).toFixed(0)}`;
  return `${(priceCents / 100).toFixed(0)} ${currency}`;
}

function scopeHeader(scope: DiscoverScope, targetLocation: string | null): string {
  if (scope === "local") {
    return targetLocation ? `Local picks near ${targetLocation}:` : "Local picks (set a home location for better results):";
  }
  if (scope === "new") return "Just listed:";
  return targetLocation ? `Trending near ${targetLocation}:` : "Trending now:";
}

function formatReply(args: {
  scope: DiscoverScope;
  targetLocation: string | null;
  items: DiscoverItem[];
}): string {
  if (args.items.length === 0) {
    return scopeHeader(args.scope, args.targetLocation) + "\nNothing to show yet. Tell me what you want and I'll start a search.";
  }

  const lines = [scopeHeader(args.scope, args.targetLocation)];
  for (const item of args.items) {
    const price = formatPrice(item.priceCents, item.currency);
    const location = item.locationLabel ? ` (${item.locationLabel})` : "";
    lines.push(`- ${item.title} - ${price}${location}`);
  }
  lines.push("Reply with one to ask the seller, or text a new want.");

  let body = lines.join("\n");
  if (body.length > MAX_SMS_BODY_CHARS) {
    body = body.slice(0, MAX_SMS_BODY_CHARS - 1) + "…";
  }
  return body;
}
