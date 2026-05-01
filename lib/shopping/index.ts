import type { AgentRole, BuyerPreference, ListingCandidate, Want } from "@/lib/core";

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
  {
    id: "seller-williamsburg-closet",
    displayName: "Mika in Williamsburg",
    locationLabel: "Williamsburg, Brooklyn",
    trustScore: 0.9,
    responseSpeed: "fast",
    contactHandle: "marketplace:mika-williamsburg-closet",
    fulfillmentPolicy: "local_pickup",
    notes: "Closet cleanout seller with clear pickup windows near Bedford Ave.",
  },
  {
    id: "seller-bushwick-studio",
    displayName: "Jules in Bushwick",
    locationLabel: "Bushwick, Brooklyn",
    trustScore: 0.86,
    responseSpeed: "fast",
    contactHandle: "marketplace:jules-bushwick-studio",
    fulfillmentPolicy: "pickup_or_shipping",
    notes: "Studio-apartment reset with solid photos and quick replies.",
  },
  {
    id: "seller-greenpoint-tech",
    displayName: "Noah in Greenpoint",
    locationLabel: "Greenpoint, Brooklyn",
    trustScore: 0.88,
    responseSpeed: "medium",
    contactHandle: "marketplace:noah-greenpoint-tech",
    fulfillmentPolicy: "local_pickup",
    notes: "Tech and creator gear seller; prefers evening handoff near McCarren Park.",
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
    imageUrl: "/demo/demo-aeron.jpg",
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
      "Professionally refurbished Aeron with posture fit, new casters, 30-day shop warranty. Local pickup or courier from Flatiron.",
    priceCents: 57500,
    currency: "USD",
    locationLabel: "Flatiron, Manhattan",
    imageUrl: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?q=80&w=1200&auto=format&fit=crop",
    condition: "excellent",
    source: "demo",
    status: "available",
    tags: ["herman miller", "aeron", "refurbished", "office chair", "manhattan", "warranty", "local pickup"],
  },
  {
    id: "listing-aeron-risky",
    sellerId: "seller-risky-chair",
    title: "Designer office chair must go today",
    description:
      "Looks like expensive chair. Local pickup only, cash only. Deposit before address. No extra photos.",
    priceCents: 18000,
    currency: "USD",
    locationLabel: "Bushwick, Brooklyn",
    imageUrl: "https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=1200&auto=format&fit=crop",
    condition: "unknown",
    source: "demo",
    status: "available",
    riskNotes: "Suspiciously low price, vague model, deposit request, and missing photos.",
    tags: ["office chair", "designer", "brooklyn", "cash only", "deposit", "local pickup"],
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
    description: "Used aluminum Trek road bike with new chain and brake pads. Local pickup near Prospect Park.",
    priceCents: 46000,
    currency: "USD",
    locationLabel: "Park Slope, Brooklyn",
    imageUrl: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1200&auto=format&fit=crop",
    condition: "good",
    source: "demo",
    status: "available",
    tags: ["road bike", "trek", "54cm", "brooklyn", "prospect park", "local pickup"],
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
    imageUrl: "/demo/airpods-max.jpg",
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
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop",
    riskNotes: "Too-cheap price, no box or serial proof, and deposit-before-serial request.",
    tags: ["airpods", "airpods max", "headphones", "cheap", "deposit", "brooklyn"],
  },
  {
    id: "listing-telfar-small-black",
    sellerId: "seller-williamsburg-closet",
    title: "Small black Telfar shopping bag",
    description: "Used twice, clean corners, dust bag included. Pickup off Bedford or Lorimer.",
    priceCents: 12800,
    currency: "USD",
    locationLabel: "Williamsburg, Brooklyn",
    condition: "excellent",
    source: "demo",
    status: "available",
    imageUrl: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=1200&auto=format&fit=crop",
    tags: ["telfar", "bag", "streetwear", "brooklyn", "williamsburg", "local pickup"],
  },
  {
    id: "listing-doc-martens-1461",
    sellerId: "seller-williamsburg-closet",
    title: "Dr. Martens 1461 black oxfords, size 8",
    description: "Broken in but not beat, yellow stitching clean, good for fall fits.",
    priceCents: 7400,
    currency: "USD",
    locationLabel: "Williamsburg, Brooklyn",
    condition: "good",
    source: "demo",
    status: "available",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop",
    tags: ["docs", "dr martens", "shoes", "black", "gen z", "brooklyn"],
  },
  {
    id: "listing-carhartt-detroit-faded",
    sellerId: "seller-bushwick-studio",
    title: "Faded Carhartt Detroit jacket",
    description: "Canvas jacket with nice wear, blanket lining, no major holes. Very Bushwick uniform.",
    priceCents: 16500,
    currency: "USD",
    locationLabel: "Bushwick, Brooklyn",
    condition: "good",
    source: "demo",
    status: "available",
    imageUrl: "https://images.unsplash.com/photo-1544923246-77307dd654cb?q=80&w=1200&auto=format&fit=crop",
    tags: ["carhartt", "detroit jacket", "workwear", "vintage", "bushwick"],
  },
  {
    id: "listing-fujifilm-x100v-silver",
    sellerId: "seller-greenpoint-tech",
    title: "Fujifilm X100V silver body",
    description: "Street photo camera with strap, battery, charger, and a small scuff on the top plate.",
    priceCents: 112000,
    currency: "USD",
    locationLabel: "Greenpoint, Brooklyn",
    condition: "good",
    source: "demo",
    status: "available",
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1200&auto=format&fit=crop",
    tags: ["fujifilm", "x100v", "camera", "street photography", "greenpoint"],
  },
  {
    id: "listing-technics-sl1200",
    sellerId: "seller-bushwick-studio",
    title: "Technics SL-1200 turntable",
    description: "Classic deck, tested last week, includes dust cover and cartridge. Pickup near Myrtle-Wyckoff.",
    priceCents: 52000,
    currency: "USD",
    locationLabel: "Bushwick, Brooklyn",
    condition: "good",
    source: "demo",
    status: "available",
    imageUrl: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?q=80&w=1200&auto=format&fit=crop",
    tags: ["technics", "turntable", "vinyl", "dj", "bushwick"],
  },
  {
    id: "listing-ikea-varmblixt-lamp",
    sellerId: "seller-williamsburg-closet",
    title: "IKEA VARMBLIXT donut lamp",
    description: "Orange glow lamp, works perfectly, still has the box. TikTok apartment upgrade.",
    priceCents: 6800,
    currency: "USD",
    locationLabel: "Williamsburg, Brooklyn",
    condition: "excellent",
    source: "demo",
    status: "available",
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=1200&auto=format&fit=crop",
    tags: ["ikea", "varmblixt", "lamp", "apartment", "tiktok"],
  },
  {
    id: "listing-blundstone-585",
    sellerId: "seller-bushwick-studio",
    title: "Blundstone 585 boots, rustic brown",
    description: "Chelsea boots with good tread and normal wear. Ready for coffee-shop winter.",
    priceCents: 9200,
    currency: "USD",
    locationLabel: "Bushwick, Brooklyn",
    condition: "good",
    source: "demo",
    status: "available",
    imageUrl: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=1200&auto=format&fit=crop",
    tags: ["blundstone", "boots", "chelsea boots", "brown", "brooklyn"],
  },
  {
    id: "listing-casio-digicam",
    sellerId: "seller-greenpoint-tech",
    title: "Casio Exilim pocket digicam",
    description: "Tiny silver 2000s digital camera with charger and SD card. Y2K photos without the filter.",
    priceCents: 14500,
    currency: "USD",
    locationLabel: "Greenpoint, Brooklyn",
    condition: "good",
    source: "demo",
    status: "available",
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1200&auto=format&fit=crop",
    tags: ["digicam", "casio", "y2k", "camera", "greenpoint"],
  },
  {
    id: "listing-mini-projector",
    sellerId: "seller-greenpoint-tech",
    title: "Anker mini projector for bedroom movies",
    description: "Compact projector with HDMI, charger, and remote. Good for blank-wall movie nights.",
    priceCents: 13500,
    currency: "USD",
    locationLabel: "Greenpoint, Brooklyn",
    condition: "good",
    source: "demo",
    status: "available",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop",
    tags: ["projector", "anker", "movie night", "apartment", "brooklyn"],
  },
  {
    id: "listing-sony-wh1000xm4",
    sellerId: "seller-williamsburg-closet",
    title: "Sony WH-1000XM4 headphones",
    description: "Black noise-canceling headphones, case included, battery still strong.",
    priceCents: 16800,
    currency: "USD",
    locationLabel: "Williamsburg, Brooklyn",
    condition: "excellent",
    source: "demo",
    status: "available",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1200&auto=format&fit=crop",
    tags: ["sony", "headphones", "noise cancelling", "commute", "williamsburg"],
  },
  {
    id: "listing-muji-acrylic-storage",
    sellerId: "seller-bushwick-studio",
    title: "MUJI acrylic desk storage stack",
    description: "Three clear drawers for makeup, stationery, or tiny apartment chaos control.",
    priceCents: 3600,
    currency: "USD",
    locationLabel: "Bushwick, Brooklyn",
    condition: "excellent",
    source: "demo",
    status: "available",
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop",
    tags: ["muji", "storage", "desk", "apartment", "bushwick"],
  },
  {
    id: "listing-tabby-cat-print",
    sellerId: "seller-williamsburg-closet",
    title: "Framed tabby cat art print",
    description: "Cute 18x24 print in a black frame. Good wall filler for a first Brooklyn room.",
    priceCents: 2800,
    currency: "USD",
    locationLabel: "Williamsburg, Brooklyn",
    condition: "excellent",
    source: "demo",
    status: "available",
    imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&auto=format&fit=crop",
    tags: ["art print", "cat", "decor", "bedroom", "williamsburg"],
  },
];

const demoCities = [
  "Brooklyn",
  "Manhattan",
  "Queens",
  "Jersey City",
  "Hoboken",
  "Newark",
  "Astoria",
  "Long Island City",
  "Park Slope",
  "Williamsburg",
];

const buyerFirstNames = [
  "Alex",
  "Priya",
  "Marcus",
  "Nora",
  "Eli",
  "Sam",
  "Avery",
  "Mina",
  "Theo",
  "Riley",
  "June",
  "Owen",
  "Lena",
  "Cam",
  "Iris",
  "Noah",
  "Zoe",
  "Miles",
  "Anika",
  "Ben",
  "Talia",
  "Kai",
  "Maya",
  "Dev",
  "Sofia",
  "Jonah",
  "Amara",
  "Cole",
  "Nina",
  "Leo",
  "Ari",
  "Pia",
  "Remy",
  "Gia",
  "Mateo",
  "Liv",
  "Ezra",
  "Rae",
  "Hana",
  "Jules",
  "Ivy",
  "Max",
  "Mira",
  "Drew",
  "Cleo",
  "Finn",
  "Sage",
  "Quinn",
  "Mae",
];

const buyerWishlists = [
  ["iPad Air", "Apple Pencil"],
  ["Nike running shoes", "lightweight rain jacket"],
  ["Breville coffee grinder", "espresso accessories"],
  ["vintage Levi's denim jacket", "black Chelsea boots"],
  ["Sonos speaker", "turntable"],
  ["standing desk", "monitor arm"],
  ["Fujifilm camera", "prime lens"],
  ["baby stroller", "travel crib"],
  ["Nintendo Switch", "party games"],
  ["road bike", "bike lock"],
  ["linen sofa", "wool rug"],
  ["MacBook Air", "USB-C monitor"],
  ["ceramic dinnerware", "Dutch oven"],
  ["winter coat", "cashmere sweater"],
  ["AirPods Pro", "portable charger"],
  ["guitar amp", "pedal board"],
  ["camping tent", "sleeping pad"],
  ["robot vacuum", "air purifier"],
  ["designer tote", "leather wallet"],
  ["kids bike", "scooter"],
];

function generatedBuyers(): DemoBuyer[] {
  return buyerFirstNames.slice(0, 49).map((name, index) => ({
    id: `buyer-demo-${String(index + 2).padStart(2, "0")}`,
    phoneNumber: `+1555012${String(index + 2).padStart(4, "0")}`,
    displayName: name,
    locationLabel: demoCities[index % demoCities.length]!,
    pickupRadiusMiles: [3, 5, 8, 12, 20][index % 5]!,
    budgetStyle: (["best_value", "lowest_price", "premium_discount"] as const)[index % 3]!,
    approvalPolicy: (["ask_before_contact", "ask_before_offer", "autonomous_until_purchase"] as const)[
      index % 3
    ]!,
  }));
}

function generatedBuyerPreferences(buyers: DemoBuyer[]): BuyerPreference[] {
  return buyers.flatMap((buyer, index) => {
    const wishlist = buyerWishlists[index % buyerWishlists.length]!;
    return [
      {
        id: `pref-${buyer.id}-primary`,
        userId: buyer.id,
        category: "wishlist",
        key: "looking_for_primary",
        value: wishlist[0]!,
        confidence: 0.9,
        source: "manual",
        updatedAt: now,
      },
      {
        id: `pref-${buyer.id}-secondary`,
        userId: buyer.id,
        category: "wishlist",
        key: "looking_for_secondary",
        value: wishlist[1]!,
        confidence: 0.75,
        source: "manual",
        updatedAt: now,
      },
      {
        id: `pref-${buyer.id}-fulfillment`,
        userId: buyer.id,
        category: "fulfillment",
        key: "preferred_location",
        value: `prefers ${buyer.locationLabel} pickup or fast shipping`,
        confidence: 0.8,
        source: "manual",
        updatedAt: now,
      },
    ];
  });
}

const sellerNames = [
  "Northside Tech Closet",
  "SoHo Sneaker Shelf",
  "Astoria Home Goods",
  "Jersey Camera Exchange",
  "Park Slope Parent Swap",
  "Williamsburg Vintage Rack",
  "Queens Audio Corner",
  "Hoboken Coffee Gear",
  "Downtown Desk Supply",
  "Greenpoint Bike Room",
  "Chelsea Closet Cleanout",
  "LIC Apartment Finds",
  "Newark Warehouse Deals",
  "Brooklyn Book Nook",
  "Fort Greene Kitchen Goods",
  "Bushwick Studio Sale",
  "Upper West Kids Gear",
  "Red Hook Outdoor Kit",
  "Dumbo Designer Resale",
  "Flatiron Electronics",
  "Prospect Heights Music",
  "Sunnyside Small Appliances",
  "Tribeca Travel Gear",
  "Bed-Stuy Plant Stand",
  "Clinton Hill Furniture",
  "Ridgewood Records",
  "Kips Bay Fitness Gear",
  "Carroll Gardens Decor",
  "Harlem Camera Bag",
  "Morningside Baby Gear",
  "Crown Heights Console",
  "Boerum Hill Bags",
  "NoMad Workstation",
  "Gowanus Tool Bench",
  "Midtown Menswear",
  "Cobble Hill Cookshop",
  "Inwood Outdoor Sale",
  "Murray Hill Student Deals",
  "Bay Ridge Sports Closet",
  "Union Square Audio",
  "Battery Park Board Games",
  "Stuytown Home Office",
  "Long Island City Wardrobe",
  "West Village Denim",
  "Journal Square Finds",
];

const listingTemplates = [
  {
    title: "Apple iPad Air 5th gen, 64GB, blue",
    description: "Lightly used iPad Air with clean screen, USB-C cable, and a slim case.",
    priceCents: 38500,
    tags: ["ipad", "tablet", "apple", "school", "drawing"],
    condition: "excellent" as const,
    imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Apple Pencil 2 with spare tips",
    description: "Second-generation Apple Pencil, pairs cleanly and includes two spare tips.",
    priceCents: 7200,
    tags: ["apple pencil", "ipad", "stylus", "drawing"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Nike Pegasus running shoes, men's 10",
    description: "Road running shoes with low mileage and clean uppers.",
    priceCents: 6800,
    tags: ["nike", "running shoes", "sneakers", "fitness"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Patagonia Torrentshell rain jacket, medium",
    description: "Packable waterproof shell, navy, no rips or delamination.",
    priceCents: 8900,
    tags: ["rain jacket", "patagonia", "outdoor", "clothes"],
    condition: "excellent" as const,
    imageUrl: "https://images.unsplash.com/photo-1548883354-7622d03aca27?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Breville Smart Grinder Pro",
    description: "Coffee grinder with burrs recently cleaned, dosing cup included.",
    priceCents: 13500,
    tags: ["coffee grinder", "breville", "espresso", "kitchen"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Levi's trucker denim jacket, vintage wash",
    description: "Classic denim jacket with soft broken-in feel and no major wear.",
    priceCents: 5800,
    tags: ["levis", "denim jacket", "vintage", "clothes"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1601333144130-8cbb312386b6?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Sonos One smart speaker",
    description: "White Sonos One speaker, factory reset, sounds great.",
    priceCents: 11800,
    tags: ["sonos", "speaker", "audio", "home"],
    condition: "excellent" as const,
    imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Uplift standing desk, walnut top",
    description: "Electric sit-stand desk with keypad memory controls and cable tray.",
    priceCents: 36000,
    tags: ["standing desk", "home office", "workstation"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Fujifilm X-T30 camera body",
    description: "Mirrorless camera body with battery, charger, and strap.",
    priceCents: 52000,
    tags: ["fujifilm", "camera", "mirrorless", "photography"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Uppababy Cruz stroller",
    description: "Clean stroller with rain cover and under-seat basket.",
    priceCents: 28000,
    tags: ["stroller", "uppababy", "baby gear", "parents"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Nintendo Switch OLED bundle",
    description: "OLED Switch with dock, two Joy-Cons, case, and Mario Kart.",
    priceCents: 28500,
    tags: ["nintendo switch", "games", "console", "oled"],
    condition: "excellent" as const,
    imageUrl: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Trek Domane AL 2 road bike, 54cm",
    description: "Aluminum road bike tuned this month with fresh bar tape.",
    priceCents: 64000,
    tags: ["road bike", "trek", "cycling", "54cm"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "West Elm linen sofa, oatmeal",
    description: "Apartment-size sofa with removable cushions and light wear.",
    priceCents: 47500,
    tags: ["sofa", "west elm", "linen", "furniture"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "MacBook Air M1, 8GB RAM, 256GB",
    description: "Battery health 91 percent, includes charger and sleeve.",
    priceCents: 53500,
    tags: ["macbook air", "laptop", "apple", "m1"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Le Creuset Dutch oven, 5.5 qt",
    description: "Round Dutch oven in flame orange with clean enamel interior.",
    priceCents: 16500,
    tags: ["dutch oven", "le creuset", "cookware", "kitchen"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1585515320310-259814833e62?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "North Face Nuptse puffer jacket, small",
    description: "Warm black puffer with strong loft and no zipper issues.",
    priceCents: 14500,
    tags: ["winter coat", "north face", "jacket", "clothes"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1544923246-77307dd654cb?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "AirPods Pro 2 with MagSafe case",
    description: "Clean earbuds with extra tips, case holds charge well.",
    priceCents: 12500,
    tags: ["airpods pro", "headphones", "apple", "audio"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Fender Champion 40 guitar amp",
    description: "Practice amp with clean and drive channels, works perfectly.",
    priceCents: 11500,
    tags: ["guitar amp", "fender", "music", "instrument"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "REI Half Dome 2 Plus tent",
    description: "Two-person camping tent with footprint and stakes.",
    priceCents: 17500,
    tags: ["tent", "camping", "rei", "outdoor"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Dyson V8 cordless vacuum",
    description: "Cordless vacuum with wall dock, crevice tool, and new filter.",
    priceCents: 18000,
    tags: ["dyson", "vacuum", "home", "appliance"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1558317374-067fb5f30001?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Madewell leather transport tote",
    description: "Brown leather tote with patina and plenty of structure.",
    priceCents: 7800,
    tags: ["tote", "madewell", "bag", "leather"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=1200&auto=format&fit=crop",
  },
  {
    title: "Woom 3 kids bike",
    description: "Lightweight kids bike with bell and kickstand, ready to ride.",
    priceCents: 25000,
    tags: ["kids bike", "woom", "children", "cycling"],
    condition: "good" as const,
    imageUrl: "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?q=80&w=1200&auto=format&fit=crop",
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generatedSellers(): DemoSeller[] {
  return sellerNames.map((name, index) => ({
    id: `seller-demo-${String(index + 6).padStart(2, "0")}`,
    displayName: name,
    locationLabel: demoCities[index % demoCities.length]!,
    trustScore: Math.min(0.98, 0.72 + (index % 9) * 0.025),
    responseSpeed: (["fast", "medium", "fast", "slow"] as const)[index % 4]!,
    contactHandle:
      index % 3 === 0
        ? `sms:+1555987${String(index + 1).padStart(4, "0")}`
        : `marketplace:${slugify(name)}-${String(index + 1).padStart(2, "0")}`,
    fulfillmentPolicy: (["local_pickup", "pickup_or_shipping", "shipping"] as const)[index % 3]!,
    notes:
      index % 7 === 0
        ? "Newer seller with good item photos but fewer completed transactions."
        : "Responsive demo seller with clear photos, realistic pricing, and flexible handoff windows.",
  }));
}

function fulfillmentDetails(seller: DemoSeller): string {
  switch (seller.fulfillmentPolicy) {
    case "local_pickup":
      return `Local pickup in ${seller.locationLabel}; buyer and seller coordinate a public handoff window.`;
    case "pickup_or_shipping":
      return `Pickup in ${seller.locationLabel} or tracked shipping at buyer's expense.`;
    case "shipping":
      return "Tracked shipping available; seller can provide carrier and handling estimate before payment.";
    default: {
      const exhaustive: never = seller.fulfillmentPolicy;
      return exhaustive;
    }
  }
}

function supplementalListingsForExistingSellers(): DemoListing[] {
  const sellerIds = demoSellers.map((seller) => seller.id);
  return sellerIds.map((sellerId, index) => {
    const template = listingTemplates[(index + 5) % listingTemplates.length]!;
    const seller = demoSellers[index]!;
    return {
      id: `listing-${slugify(sellerId)}-extra`,
      sellerId,
      title: template.title,
      description: `${template.description} Also available from ${seller.displayName}. ${fulfillmentDetails(seller)}`,
      priceCents: template.priceCents + (index % 3) * 1200,
      currency: "USD",
      locationLabel: seller.locationLabel,
      imageUrl: template.imageUrl,
      condition: template.condition,
      source: "demo",
      status: "available",
      riskNotes: index === 2 ? "Seller has sparse details; verify before outreach." : undefined,
      tags: [
        ...template.tags,
        seller.locationLabel.toLowerCase(),
        seller.fulfillmentPolicy.replaceAll("_", " "),
        "demo",
      ],
    };
  });
}

function generatedListings(sellers: DemoSeller[]): DemoListing[] {
  return sellers.flatMap((seller, index) => [0, 1].map((slot) => {
    const template = listingTemplates[(index * 2 + slot) % listingTemplates.length]!;
    const priceAdjustment = ((index + slot) % 5) * 900;
    const condition = slot === 1 && index % 6 === 0 ? "fair" : template.condition;
    return {
      id: `listing-${slugify(seller.id)}-${slot + 1}`,
      sellerId: seller.id,
      title: template.title,
      description: `${template.description} ${fulfillmentDetails(seller)} ${seller.notes}`,
      priceCents: Math.max(3500, template.priceCents + priceAdjustment - (condition === "fair" ? 1800 : 0)),
      currency: "USD",
      locationLabel: seller.locationLabel,
      imageUrl: template.imageUrl,
      condition,
      source: "demo",
      status: "available",
      riskNotes: seller.trustScore < 0.78 || seller.responseSpeed === "slow" ? "Verify availability and condition before contacting." : undefined,
      tags: [...template.tags, seller.locationLabel.toLowerCase(), seller.fulfillmentPolicy.replaceAll("_", " ")],
    };
  }));
}

const generatedDemoBuyers = generatedBuyers();
const generatedDemoSellers = generatedSellers();

export const demoMarketplaceData: DemoMarketplaceData = {
  buyers: [demoBuyer, ...generatedDemoBuyers],
  preferences: [...demoBuyerPreferences, ...generatedBuyerPreferences(generatedDemoBuyers)],
  sellers: [...demoSellers, ...generatedDemoSellers],
  listings: [
    ...demoListings,
    ...supplementalListingsForExistingSellers(),
    ...generatedListings(generatedDemoSellers),
  ],
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
