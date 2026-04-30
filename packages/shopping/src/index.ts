import type { AgentRole, BuyerPreference, ListingCandidate, Want } from "@bazaar/core";

export interface ShoppingSearchInput {
  want: Want;
  preferences: BuyerPreference[];
  limit?: number;
}

export interface ShoppingSourceAdapter {
  readonly sourceName: string;
  search(input: ShoppingSearchInput): Promise<ListingCandidate[]>;
}

export interface CandidateScorer {
  score(input: {
    want: Want;
    preferences: BuyerPreference[];
    candidate: ListingCandidate;
  }): Promise<ListingCandidate>;
}

export async function searchAllSources(
  adapters: ShoppingSourceAdapter[],
  input: ShoppingSearchInput,
): Promise<ListingCandidate[]> {
  const results = await Promise.all(adapters.map((adapter) => adapter.search(input)));
  return results.flat();
}

export interface DemoBuyer {
  id: string;
  phoneNumber: string;
  displayName: string;
  locationLabel: string;
  pickupRadiusMiles: number;
  budgetStyle: "lowest_price" | "best_value" | "premium_discount";
  approvalPolicy: "ask_before_contact" | "ask_before_offer" | "autonomous_until_purchase";
}

export interface DemoSeller {
  id: string;
  displayName: string;
  locationLabel: string;
  trustScore: number;
  responseSpeed: "fast" | "medium" | "slow";
  contactHandle: string;
  fulfillmentPolicy: "local_pickup" | "shipping" | "pickup_or_shipping";
  notes: string;
}

export interface DemoListing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  priceCents: number;
  currency: string;
  locationLabel: string;
  imageUrl?: string;
  condition: "excellent" | "good" | "fair" | "unknown";
  source: "demo";
  status: "available" | "pending" | "sold";
  riskNotes?: string;
  tags: string[];
}

export interface DemoMarketplaceData {
  buyers: DemoBuyer[];
  preferences: BuyerPreference[];
  sellers: DemoSeller[];
  listings: DemoListing[];
}

export interface AgentTraceEvent {
  role: AgentRole | "vision_agent";
  status: "PROMISE" | "COMPLETE";
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface SellerMatch {
  candidate: ListingCandidate;
  seller: DemoSeller;
  listing: DemoListing;
  fitScore: number;
  riskScore: number;
  whyThisMatched: string[];
}

export interface MarketplaceMatchResult {
  buyer: DemoBuyer;
  candidates: ListingCandidate[];
  rankedCandidates: ListingCandidate[];
  matches: SellerMatch[];
  matchedSeller?: DemoSeller;
  sellerOutreachDraft?: string;
  summary: string;
  nextAction: "approve_seller_outreach" | "refine_search";
  trace: AgentTraceEvent[];
}

export interface MarketplaceMatchInput {
  want: Want;
  buyer?: DemoBuyer;
  preferences?: BuyerPreference[];
  data?: DemoMarketplaceData;
  limit?: number;
}

const now = "2026-04-30T23:00:00.000Z";

export const demoBuyer: DemoBuyer = {
  id: "user-demo-1",
  phoneNumber: "+15555555555",
  displayName: "Jamie",
  locationLabel: "Brooklyn",
  pickupRadiusMiles: 8,
  budgetStyle: "best_value",
  approvalPolicy: "ask_before_contact",
};

export const demoBuyerPreferences: BuyerPreference[] = [
  {
    id: "pref-demo-ergonomic",
    userId: demoBuyer.id,
    category: "furniture",
    key: "chair_style",
    value: "ergonomic office chairs with known brands",
    confidence: 0.9,
    source: "manual",
    updatedAt: now,
  },
  {
    id: "pref-demo-local",
    userId: demoBuyer.id,
    category: "fulfillment",
    key: "pickup",
    value: "prefers Brooklyn pickup from responsive sellers",
    confidence: 0.85,
    source: "manual",
    updatedAt: now,
  },
  {
    id: "pref-demo-risk",
    userId: demoBuyer.id,
    category: "risk",
    key: "avoid",
    value: "avoid listings with vague photos, missing model details, or suspiciously low prices",
    confidence: 0.8,
    source: "manual",
    updatedAt: now,
  },
  {
    id: "pref-demo-electronics",
    userId: demoBuyer.id,
    category: "electronics",
    key: "audio",
    value: "prefers Apple audio gear with clear serial proof, local pickup, and no activation lock issues",
    confidence: 0.82,
    source: "manual",
    updatedAt: now,
  },
];

export const demoSellers: DemoSeller[] = [
  {
    id: "seller-brooklyn-aeron",
    displayName: "Maya in Williamsburg",
    locationLabel: "Williamsburg, Brooklyn",
    trustScore: 0.94,
    responseSpeed: "fast",
    contactHandle: "sms:+17185550102",
    fulfillmentPolicy: "local_pickup",
    notes: "Verified local seller with clear photos and flexible pickup after 6pm.",
  },
  {
    id: "seller-manhattan-stretch",
    displayName: "Office Renew NYC",
    locationLabel: "Flatiron, Manhattan",
    trustScore: 0.88,
    responseSpeed: "medium",
    contactHandle: "email:sales@officerenew.example",
    fulfillmentPolicy: "pickup_or_shipping",
    notes: "Reputable reseller with a higher-quality chair slightly above target budget.",
  },
  {
    id: "seller-risky-chair",
    displayName: "CashOnlyDeals",
    locationLabel: "Bushwick, Brooklyn",
    trustScore: 0.31,
    responseSpeed: "slow",
    contactHandle: "marketplace:cashonly-4821",
    fulfillmentPolicy: "local_pickup",
    notes: "Sparse profile and insists on deposit before viewing.",
  },
  {
    id: "seller-shipped-fallback",
    displayName: "Tri-State Office Outlet",
    locationLabel: "Newark, NJ",
    trustScore: 0.82,
    responseSpeed: "fast",
    contactHandle: "email:inventory@tristateoffice.example",
    fulfillmentPolicy: "shipping",
    notes: "Reliable shipped fallback with return policy, but less convenient than local pickup.",
  },
  {
    id: "seller-bike-park-slope",
    displayName: "Leo in Park Slope",
    locationLabel: "Park Slope, Brooklyn",
    trustScore: 0.9,
    responseSpeed: "fast",
    contactHandle: "sms:+17185550199",
    fulfillmentPolicy: "local_pickup",
    notes: "Local seller with detailed maintenance history.",
  },
  {
    id: "seller-airpods-dumbo",
    displayName: "Nina in Dumbo",
    locationLabel: "Dumbo, Brooklyn",
    trustScore: 0.92,
    responseSpeed: "fast",
    contactHandle: "sms:+17185550245",
    fulfillmentPolicy: "local_pickup",
    notes: "Verified seller with receipt photo, serial number, and same-day pickup near York St.",
  },
  {
    id: "seller-airpods-risky",
    displayName: "AudioFlip_88",
    locationLabel: "Bed-Stuy, Brooklyn",
    trustScore: 0.38,
    responseSpeed: "medium",
    contactHandle: "marketplace:audioflip-88",
    fulfillmentPolicy: "local_pickup",
    notes: "Avoids serial-number questions and asks for a deposit before meeting.",
  },
];

export const demoListings: DemoListing[] = [
  {
    id: "listing-aeron-420",
    sellerId: "seller-brooklyn-aeron",
    title: "Herman Miller Aeron Size B - black, used",
    description:
      "Clean used Aeron chair, size B, fully adjustable arms, lumbar pad, no tears. Pickup in Williamsburg this week.",
    priceCents: 42000,
    currency: "USD",
    locationLabel: "Williamsburg, Brooklyn",
    imageUrl: "https://images.unsplash.com/photo-1589384267710-7a170981ca78?q=80&w=1200&auto=format&fit=crop",
    condition: "good",
    source: "demo",
    status: "available",
    tags: ["herman miller", "aeron", "office chair", "ergonomic", "brooklyn", "local pickup"],
  },
  {
    id: "listing-aeron-575",
    sellerId: "seller-manhattan-stretch",
    title: "Refurbished Herman Miller Aeron with posture fit",
    description:
      "Professionally refurbished Aeron with posture fit, new casters, 30-day shop warranty. Pickup or courier from Flatiron.",
    priceCents: 57500,
    currency: "USD",
    locationLabel: "Flatiron, Manhattan",
    imageUrl: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?q=80&w=1200&auto=format&fit=crop",
    condition: "excellent",
    source: "demo",
    status: "available",
    tags: ["herman miller", "aeron", "refurbished", "office chair", "manhattan", "warranty"],
  },
  {
    id: "listing-aeron-risky",
    sellerId: "seller-risky-chair",
    title: "Designer office chair must go today",
    description: "Looks like expensive chair. Cash only. Deposit before address. No extra photos.",
    priceCents: 18000,
    currency: "USD",
    locationLabel: "Bushwick, Brooklyn",
    condition: "unknown",
    source: "demo",
    status: "available",
    riskNotes: "Suspiciously low price, vague model, deposit request, and missing photos.",
    tags: ["office chair", "designer", "brooklyn", "cash only", "deposit"],
  },
  {
    id: "listing-aeron-shipped",
    sellerId: "seller-shipped-fallback",
    title: "Used Herman Miller Aeron - ships to Brooklyn",
    description:
      "Used Aeron in good working order, ships boxed from NJ. Shipping estimate included for Brooklyn.",
    priceCents: 49900,
    currency: "USD",
    locationLabel: "Newark, NJ",
    imageUrl: "https://images.unsplash.com/photo-1505843490701-5be5d0b31b72?q=80&w=1200&auto=format&fit=crop",
    condition: "good",
    source: "demo",
    status: "available",
    tags: ["herman miller", "aeron", "office chair", "shipping", "new jersey"],
  },
  {
    id: "listing-road-bike-460",
    sellerId: "seller-bike-park-slope",
    title: "Trek road bike, 54cm, recently tuned",
    description: "Used aluminum Trek road bike with new chain and brake pads. Pickup near Prospect Park.",
    priceCents: 46000,
    currency: "USD",
    locationLabel: "Park Slope, Brooklyn",
    imageUrl: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1200&auto=format&fit=crop",
    condition: "good",
    source: "demo",
    status: "available",
    tags: ["road bike", "trek", "54cm", "brooklyn", "prospect park"],
  },
  {
    id: "listing-airpods-max-360",
    sellerId: "seller-airpods-dumbo",
    title: "Apple AirPods Max - silver, lightly used",
    description:
      "Silver AirPods Max with case, box, receipt photo, and visible serial number. Battery and ANC working. Pickup in Dumbo.",
    priceCents: 36000,
    currency: "USD",
    locationLabel: "Dumbo, Brooklyn",
    imageUrl: "https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?q=80&w=1200&auto=format&fit=crop",
    condition: "excellent",
    source: "demo",
    status: "available",
    tags: ["apple", "airpods max", "headphones", "over-ear headphones", "noise cancelling", "silver", "brooklyn"],
  },
  {
    id: "listing-airpods-max-250-risky",
    sellerId: "seller-airpods-risky",
    title: "AirPods Max cheap today only",
    description: "Works fine. No box. Need deposit to hold. Can send serial after payment.",
    priceCents: 25000,
    currency: "USD",
    locationLabel: "Bed-Stuy, Brooklyn",
    condition: "unknown",
    source: "demo",
    status: "available",
    riskNotes: "Too-cheap price, no box or serial proof, and deposit-before-serial request.",
    tags: ["airpods", "airpods max", "headphones", "cheap", "deposit", "brooklyn"],
  },
];

export const demoMarketplaceData: DemoMarketplaceData = {
  buyers: [demoBuyer],
  preferences: demoBuyerPreferences,
  sellers: demoSellers,
  listings: demoListings,
};

export function runMarketplaceMatch(input: MarketplaceMatchInput): MarketplaceMatchResult {
  const data = input.data ?? demoMarketplaceData;
  const buyer = input.buyer ?? data.buyers.find((candidate) => candidate.id === input.want.userId) ?? demoBuyer;
  const preferences =
    input.preferences ?? data.preferences.filter((preference) => preference.userId === buyer.id);
  const limit = input.limit ?? 4;
  const activeListings = data.listings.filter((listing) => listing.status === "available");

  const trace: AgentTraceEvent[] = [
    {
      role: "local_scout",
      status: "PROMISE",
      summary: `Searching seeded marketplace inventory near ${input.want.locationLabel ?? buyer.locationLabel}.`,
    },
    {
      role: "shipped_scout",
      status: "PROMISE",
      summary: "Checking shippable fallback sellers in the demo marketplace.",
    },
  ];

  const matches = activeListings
    .map((listing) => buildSellerMatch(input.want, buyer, preferences, data, listing))
    .filter((match): match is SellerMatch => Boolean(match))
    .sort((left, right) => {
      const leftScore = left.fitScore - left.riskScore * 0.45;
      const rightScore = right.fitScore - right.riskScore * 0.45;
      return rightScore - leftScore;
    })
    .slice(0, limit);

  trace.push(
    {
      role: "local_scout",
      status: "COMPLETE",
      summary: `Found ${matches.length} viable seller/listing matches.`,
      metadata: { listingIds: matches.map((match) => match.listing.id) },
    },
    {
      role: "fit_checker",
      status: "COMPLETE",
      summary: "Ranked candidates by brand/model relevance, budget fit, locality, and buyer preferences.",
    },
    {
      role: "risk_checker",
      status: "COMPLETE",
      summary: "Flagged weak seller signals and suspicious listing details before choosing the top match.",
    },
  );

  const topMatch = matches[0];
  const summary = topMatch ? buildSummary(input.want, topMatch, matches) : buildNoMatchSummary(input.want);
  const sellerOutreachDraft = topMatch ? buildSellerOutreachDraft(input.want, buyer, topMatch) : undefined;

  if (topMatch) {
    trace.push({
      role: "negotiator",
      status: "COMPLETE",
      summary: `Drafted buyer-approved outreach for ${topMatch.seller.displayName}.`,
      metadata: { sellerId: topMatch.seller.id, listingId: topMatch.listing.id },
    });
  }

  return {
    buyer,
    candidates: matches.map((match) => match.candidate),
    rankedCandidates: matches.map((match) => match.candidate),
    matches,
    matchedSeller: topMatch?.seller,
    sellerOutreachDraft,
    summary,
    nextAction: topMatch ? "approve_seller_outreach" : "refine_search",
    trace,
  };
}

function buildSellerMatch(
  want: Want,
  buyer: DemoBuyer,
  preferences: BuyerPreference[],
  data: DemoMarketplaceData,
  listing: DemoListing,
): SellerMatch | undefined {
  const seller = data.sellers.find((candidate) => candidate.id === listing.sellerId);
  if (!seller) {
    return undefined;
  }

  const wantedText = `${want.rawText} ${want.title} ${want.description ?? ""}`.toLowerCase();
  const listingText = `${listing.title} ${listing.description} ${listing.tags.join(" ")}`.toLowerCase();
  const relevance = keywordRelevance(wantedText, listingText);
  const budgetFit = scoreBudget(want.maxBudgetCents, listing.priceCents);
  const localityFit = scoreLocality(want.locationLabel ?? buyer.locationLabel, listing.locationLabel, seller);
  const preferenceFit = scorePreferences(preferences, listingText, seller);
  const conditionFit = scoreCondition(listing.condition);
  const fitScore = clamp01(relevance * 0.36 + budgetFit * 0.24 + localityFit * 0.18 + preferenceFit * 0.14 + conditionFit * 0.08);
  const riskScore = clamp01((1 - seller.trustScore) * 0.5 + (listing.riskNotes ? 0.35 : 0) + (seller.responseSpeed === "slow" ? 0.15 : 0));

  if (relevance < 0.28 && !wantedText.includes("fallback")) {
    return undefined;
  }

  if (fitScore < 0.24) {
    return undefined;
  }

  const candidate: ListingCandidate = {
    id: listing.id,
    wantId: want.id,
    source: "demo",
    title: listing.title,
    url: `https://bazaar.demo/listings/${listing.id}`,
    imageUrl: listing.imageUrl,
    priceCents: listing.priceCents,
    currency: listing.currency,
    locationLabel: listing.locationLabel,
    sellerLabel: seller.displayName,
    fitScore,
    riskScore,
    notes: buildCandidateNotes(listing, seller, fitScore, riskScore),
    createdAt: now,
  };

  return {
    candidate,
    seller,
    listing,
    fitScore,
    riskScore,
    whyThisMatched: buildMatchReasons(want, listing, seller, budgetFit, localityFit, riskScore),
  };
}

function keywordRelevance(wantedText: string, listingText: string): number {
  const tokens = wantedText
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !["find", "used", "under", "near", "this", "buy", "want"].includes(token));
  if (tokens.length === 0) {
    return 0.5;
  }
  const hits = tokens.filter((token) => listingText.includes(token)).length;
  const brandBoost = listingText.includes("herman miller") && wantedText.includes("herman miller") ? 0.22 : 0;
  const modelBoost = listingText.includes("aeron") && (wantedText.includes("aeron") || wantedText.includes("chair")) ? 0.16 : 0;
  return clamp01(hits / tokens.length + brandBoost + modelBoost);
}

function scoreBudget(maxBudgetCents: number | undefined, priceCents: number): number {
  if (!maxBudgetCents) {
    return 0.75;
  }
  if (priceCents <= maxBudgetCents) {
    return 1;
  }
  const overage = (priceCents - maxBudgetCents) / maxBudgetCents;
  return clamp01(1 - overage * 1.7);
}

function scoreLocality(wantLocation: string, listingLocation: string, seller: DemoSeller): number {
  const want = wantLocation.toLowerCase();
  const listing = listingLocation.toLowerCase();
  if (listing.includes(want) || want.includes(listing)) {
    return 1;
  }
  if (want.includes("brooklyn") && listing.includes("brooklyn")) {
    return 0.95;
  }
  if (want.includes("brooklyn") && (listing.includes("manhattan") || listing.includes("newark"))) {
    return seller.fulfillmentPolicy === "shipping" ? 0.58 : 0.65;
  }
  return seller.fulfillmentPolicy === "shipping" ? 0.6 : 0.45;
}

function scorePreferences(preferences: BuyerPreference[], listingText: string, seller: DemoSeller): number {
  let score = 0.55;
  if (preferences.some((preference) => preference.value.toLowerCase().includes("ergonomic")) && listingText.includes("ergonomic")) {
    score += 0.16;
  }
  if (preferences.some((preference) => preference.value.toLowerCase().includes("local")) && seller.fulfillmentPolicy !== "shipping") {
    score += 0.15;
  }
  if (seller.trustScore > 0.85) {
    score += 0.14;
  }
  return clamp01(score);
}

function scoreCondition(condition: DemoListing["condition"]): number {
  switch (condition) {
    case "excellent":
      return 1;
    case "good":
      return 0.84;
    case "fair":
      return 0.55;
    case "unknown":
      return 0.28;
  }
}

function buildCandidateNotes(listing: DemoListing, seller: DemoSeller, fitScore: number, riskScore: number): string {
  const parts = [
    `${Math.round(fitScore * 100)}% fit from seeded marketplace match.`,
    `${seller.displayName} has ${Math.round(seller.trustScore * 100)}% trust and ${seller.responseSpeed} responses.`,
  ];
  if (listing.riskNotes) {
    parts.push(`Risk note: ${listing.riskNotes}`);
  } else if (riskScore < 0.2) {
    parts.push("Risk looks low for the demo signals.");
  }
  return parts.join(" ");
}

function buildMatchReasons(
  want: Want,
  listing: DemoListing,
  seller: DemoSeller,
  budgetFit: number,
  localityFit: number,
  riskScore: number,
): string[] {
  const reasons = [
    `${listing.title} matches "${want.title}".`,
    budgetFit >= 1
      ? `Price is within the ${formatCurrency(want.maxBudgetCents ?? listing.priceCents, listing.currency)} target.`
      : `Price is above target, but still close enough to show as a stretch option.`,
    localityFit > 0.8
      ? `Seller is convenient for ${want.locationLabel ?? "the buyer's location"}.`
      : `Seller is less convenient, but still useful as a fallback.`,
  ];
  if (riskScore > 0.45) {
    reasons.push("Risk checker flags this as a weak option.");
  } else {
    reasons.push(`${seller.displayName} has strong seller signals for the demo.`);
  }
  return reasons;
}

function buildSummary(want: Want, topMatch: SellerMatch, matches: SellerMatch[]): string {
  const price = formatCurrency(topMatch.listing.priceCents, topMatch.listing.currency);
  const alternatives = Math.max(matches.length - 1, 0);
  return `Best match: ${topMatch.listing.title} for ${price} from ${topMatch.seller.displayName}. It fits the ${want.locationLabel ?? "target"} search, stays close to budget, and has lower risk than the alternatives. I found ${alternatives} backup option${alternatives === 1 ? "" : "s"}. Want me to contact the seller?`;
}

function buildNoMatchSummary(want: Want): string {
  return `I could not find a strong seeded seller match for "${want.title}" yet. The next best step is to ask one clarifying question or widen the search radius.`;
}

export function buildSellerOutreachDraft(want: Want, buyer: DemoBuyer, match: SellerMatch): string {
  return `Hi ${match.seller.displayName}, I am helping ${buyer.displayName} find ${want.title.toLowerCase()} near ${want.locationLabel ?? buyer.locationLabel}. Is your "${match.listing.title}" still available, and could they see or pick it up this week?`;
}

export function buildApprovalResult(input: {
  want: Want;
  buyer?: DemoBuyer;
  match?: SellerMatch;
  data?: DemoMarketplaceData;
}): {
  status: "contacting_seller";
  matchedSeller?: DemoSeller;
  sellerOutreachDraft?: string;
  trace: AgentTraceEvent[];
} {
  const result = input.match
    ? {
        buyer: input.buyer ?? demoBuyer,
        topMatch: input.match,
      }
    : (() => {
        const matchResult = runMarketplaceMatch({
          want: input.want,
          buyer: input.buyer,
          data: input.data,
          limit: 1,
        });
        return { buyer: matchResult.buyer, topMatch: matchResult.matches[0] };
      })();

  const sellerOutreachDraft = result.topMatch
    ? buildSellerOutreachDraft(input.want, result.buyer, result.topMatch)
    : undefined;

  return {
    status: "contacting_seller",
    matchedSeller: result.topMatch?.seller,
    sellerOutreachDraft,
    trace: [
      {
        role: "negotiator",
        status: "PROMISE",
        summary: "Buyer approved seller outreach.",
      },
      {
        role: "negotiator",
        status: "COMPLETE",
        summary: result.topMatch
          ? `Prepared outreach to ${result.topMatch.seller.displayName}.`
          : "No seller match was available for outreach.",
      },
    ],
  };
}

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number(value.toFixed(3))));
}
