import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { config } from "../config";

/**
 * On Vercel serverless functions the working directory (`/var/task`) is read-only,
 * so a relative `DATA_DIR` like `.data` will EROFS on first write. When we detect
 * a Vercel runtime, anchor relative paths under `/tmp` (the only writable surface
 * inside a Lambda-style sandbox) instead of the cwd. This keeps local dev pointed
 * at the repo `.data/` directory while letting prod functions persist within a
 * single warm container. Cross-invocation persistence still requires Postgres or
 * another shared store.
 */
const ON_VERCEL = process.env.VERCEL === "1" || process.env.VERCEL === "true";
const VERCEL_WRITABLE_ROOT = "/tmp/bazaar-store";

export interface DbState {
  users: UserRow[];
  otpCodes: OtpRow[];
  sessions: SessionRow[];
  buyerPreferences: BuyerPreferenceRow[];
  conversationStates: ConversationStateRow[];
  wants: WantRow[];
  listingCandidates: ListingCandidateRow[];
  userListings: UserListingRow[];
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

export interface UserListingRow {
  id: string;
  userId: string;
  rawText: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number | null;
  currency: string;
  locationLabel: string | null;
  condition: "excellent" | "good" | "fair" | "unknown";
  status: "available" | "pending" | "sold" | "withdrawn";
  tags: string[];
  spacebaseIntentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InboundEventRow {
  eventId: string;
  receivedAt: string;
  source: "web";
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
  userListings: [],
  inboundEvents: [],
  outboundMessages: [],
};

function dataPath(): string {
  const dir = config.DATA_DIR;
  if (isAbsolute(dir)) return resolve(dir, "store.json");
  const root = ON_VERCEL ? VERCEL_WRITABLE_ROOT : process.cwd();
  return resolve(root, dir, "store.json");
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

export function getState(): DbState {
  return load();
}

export function update(mutator: (state: DbState) => void): void {
  const state = load();
  mutator(state);
  persist(state);
}
