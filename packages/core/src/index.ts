import { z } from "zod";

export const userProfileSchema = z.object({
  id: z.string(),
  phoneNumber: z.string(),
  displayName: z.string().optional(),
  homeLocationLabel: z.string().optional(),
  pickupRadiusMiles: z.number().nonnegative().optional(),
  shippingPreference: z.enum(["local_only", "shipping_ok", "prefer_shipping"]).default("shipping_ok"),
  budgetStyle: z.enum(["lowest_price", "best_value", "premium_discount"]).default("best_value"),
  approvalPolicy: z.enum(["ask_before_contact", "ask_before_offer", "autonomous_until_purchase"]).default("ask_before_contact"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const buyerPreferenceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  category: z.string(),
  key: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  source: z.enum(["sms_interview", "ios_interview", "inferred", "manual"]),
  updatedAt: z.string().datetime(),
});

export const wantStatusSchema = z.enum([
  "intake",
  "searching",
  "awaiting_approval",
  "contacting_seller",
  "completed",
  "cancelled",
]);

export const wantSchema = z.object({
  id: z.string(),
  userId: z.string(),
  rawText: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: wantStatusSchema.default("intake"),
  maxBudgetCents: z.number().int().nonnegative().optional(),
  currency: z.string().default("USD"),
  locationLabel: z.string().optional(),
  spacebaseIntentId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const listingSourceSchema = z.enum(["local_marketplace", "ebay", "web", "manual", "demo"]);

export const listingCandidateSchema = z.object({
  id: z.string(),
  wantId: z.string(),
  source: listingSourceSchema,
  title: z.string(),
  url: z.string().url().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  currency: z.string().default("USD"),
  locationLabel: z.string().optional(),
  sellerLabel: z.string().optional(),
  fitScore: z.number().min(0).max(1).optional(),
  riskScore: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const agentRoleSchema = z.enum([
  "profiler",
  "intent_parser",
  "local_scout",
  "shipped_scout",
  "fit_checker",
  "risk_checker",
  "negotiator",
  "logistics",
]);

export type UserProfile = z.infer<typeof userProfileSchema>;
export type BuyerPreference = z.infer<typeof buyerPreferenceSchema>;
export type WantStatus = z.infer<typeof wantStatusSchema>;
export type Want = z.infer<typeof wantSchema>;
export type ListingCandidate = z.infer<typeof listingCandidateSchema>;
export type ListingSource = z.infer<typeof listingSourceSchema>;
export type AgentRole = z.infer<typeof agentRoleSchema>;
