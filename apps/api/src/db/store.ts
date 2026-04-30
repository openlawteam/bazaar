import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { config } from "../config.js";

export interface DbState {
  users: UserRow[];
  otpCodes: OtpRow[];
  sessions: SessionRow[];
  buyerPreferences: BuyerPreferenceRow[];
  conversationStates: ConversationStateRow[];
  wants: WantRow[];
  listingCandidates: ListingCandidateRow[];
  inboundEvents: InboundEventRow[];
  outboundMessages: OutboundMessageRow[];
}

export interface UserRow {
  id: string;
  phoneNumber: string;
  displayName: string | null;
  homeLocationLabel: string | null;
  pickupRadiusMiles: number | null;
  shippingPreference: "local_only" | "shipping_ok" | "prefer_shipping";
  budgetStyle: "lowest_price" | "best_value" | "premium_discount";
  approvalPolicy: "ask_before_contact" | "ask_before_offer" | "autonomous_until_purchase";
  phoneVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OtpRow {
  id: string;
  userId: string;
  codeHash: string;
  expiresAt: string;
  attempts: number;
  consumedAt: string | null;
  createdAt: string;
}

export interface SessionRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface BuyerPreferenceRow {
  id: string;
  userId: string;
  category: string;
  key: string;
  value: string;
  confidence: number;
  source: "sms_interview" | "ios_interview" | "inferred" | "manual";
  updatedAt: string;
}

export interface ConversationStateRow {
  userId: string;
  state: "needs_verification" | "profiling" | "ready" | "awaiting_approval";
  pendingWantId: string | null;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export interface WantRow {
  id: string;
  userId: string;
  rawText: string;
  title: string;
  description: string | null;
  status:
    | "intake"
    | "searching"
    | "awaiting_approval"
    | "contacting_seller"
    | "completed"
    | "cancelled";
  maxBudgetCents: number | null;
  currency: string;
  locationLabel: string | null;
  spacebaseIntentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListingCandidateRow {
  id: string;
  wantId: string;
  source: "local_marketplace" | "ebay" | "web" | "manual" | "demo";
  title: string;
  url: string | null;
  priceCents: number | null;
  currency: string;
  locationLabel: string | null;
  sellerLabel: string | null;
  fitScore: number | null;
  riskScore: number | null;
  notes: string | null;
  createdAt: string;
}

export interface InboundEventRow {
  eventId: string;
  receivedAt: string;
  source: "linq";
  rawPayload: unknown;
}

export interface OutboundMessageRow {
  id: string;
  userId: string | null;
  toPhoneNumber: string;
  body: string;
  status: "queued" | "sent" | "failed" | "demo";
  providerMessageId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

const initialState: DbState = {
  users: [],
  otpCodes: [],
  sessions: [],
  buyerPreferences: [],
  conversationStates: [],
  wants: [],
  listingCandidates: [],
  inboundEvents: [],
  outboundMessages: [],
};

function dataPath(): string {
  return resolve(process.cwd(), config.DATA_DIR, "store.json");
}

function ensureDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

function load(): DbState {
  const filePath = dataPath();
  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<DbState>;
    return { ...initialState, ...parsed };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "ENOENT") {
      return { ...initialState };
    }
    throw error;
  }
}

function persist(state: DbState): void {
  const filePath = dataPath();
  ensureDir(filePath);
  const tempPath = join(dirname(filePath), `.${Date.now()}.tmp`);
  writeFileSync(tempPath, JSON.stringify(state, null, 2));
  writeFileSync(filePath, JSON.stringify(state, null, 2));
}

let cachedState: DbState | null = null;

export function getState(): DbState {
  if (!cachedState) {
    cachedState = load();
  }
  return cachedState;
}

export function update(mutator: (state: DbState) => void): void {
  const state = getState();
  mutator(state);
  persist(state);
}
