import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import type { BuyerPreference } from "@bazaar/core";
import {
  demoMarketplaceData,
  type AgentTraceEvent,
  type DemoBuyer,
  type DemoListing,
  type DemoMarketplaceData,
  type DemoSeller,
} from "@bazaar/shopping";

type SqlClient = NeonQueryFunction<false, false>;

let sqlClient: SqlClient | null | undefined;
let schemaReady = false;

export function getSqlClient(): SqlClient | null {
  if (sqlClient !== undefined) {
    return sqlClient;
  }

  if (!process.env.DATABASE_URL) {
    sqlClient = null;
    return sqlClient;
  }

  sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

export async function ensureDemoSchema(sql = getSqlClient()): Promise<boolean> {
  if (!sql) {
    return false;
  }

  if (schemaReady) {
    return true;
  }

  await sql`
    CREATE TABLE IF NOT EXISTS demo_buyers (
      id TEXT PRIMARY KEY,
      phone_number TEXT NOT NULL,
      display_name TEXT NOT NULL,
      location_label TEXT NOT NULL,
      pickup_radius_miles INTEGER NOT NULL,
      budget_style TEXT NOT NULL,
      approval_policy TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS demo_buyer_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES demo_buyers(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      preference_key TEXT NOT NULL,
      preference_value TEXT NOT NULL,
      confidence DOUBLE PRECISION NOT NULL,
      source TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS demo_sellers (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      location_label TEXT NOT NULL,
      trust_score DOUBLE PRECISION NOT NULL,
      response_speed TEXT NOT NULL,
      contact_handle TEXT NOT NULL,
      fulfillment_policy TEXT NOT NULL,
      notes TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS demo_listings (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL REFERENCES demo_sellers(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      currency TEXT NOT NULL,
      location_label TEXT NOT NULL,
      image_url TEXT,
      condition TEXT NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      risk_notes TEXT,
      tags TEXT[] NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS demo_match_runs (
      id TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL,
      want_id TEXT NOT NULL,
      input_mode TEXT NOT NULL,
      selected_listing_id TEXT,
      summary TEXT NOT NULL,
      outreach_draft TEXT,
      trace JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  schemaReady = true;
  return true;
}

export async function seedDemoMarketplace(sql = getSqlClient()): Promise<{ seeded: boolean; counts: Record<string, number> }> {
  if (!sql) {
    return {
      seeded: false,
      counts: {
        buyers: demoMarketplaceData.buyers.length,
        preferences: demoMarketplaceData.preferences.length,
        sellers: demoMarketplaceData.sellers.length,
        listings: demoMarketplaceData.listings.length,
      },
    };
  }

  await ensureDemoSchema(sql);

  for (const buyer of demoMarketplaceData.buyers) {
    await sql`
      INSERT INTO demo_buyers (
        id,
        phone_number,
        display_name,
        location_label,
        pickup_radius_miles,
        budget_style,
        approval_policy
      )
      VALUES (
        ${buyer.id},
        ${buyer.phoneNumber},
        ${buyer.displayName},
        ${buyer.locationLabel},
        ${buyer.pickupRadiusMiles},
        ${buyer.budgetStyle},
        ${buyer.approvalPolicy}
      )
      ON CONFLICT (id) DO UPDATE SET
        phone_number = EXCLUDED.phone_number,
        display_name = EXCLUDED.display_name,
        location_label = EXCLUDED.location_label,
        pickup_radius_miles = EXCLUDED.pickup_radius_miles,
        budget_style = EXCLUDED.budget_style,
        approval_policy = EXCLUDED.approval_policy
    `;
  }

  for (const preference of demoMarketplaceData.preferences) {
    await sql`
      INSERT INTO demo_buyer_preferences (
        id,
        user_id,
        category,
        preference_key,
        preference_value,
        confidence,
        source,
        updated_at
      )
      VALUES (
        ${preference.id},
        ${preference.userId},
        ${preference.category},
        ${preference.key},
        ${preference.value},
        ${preference.confidence},
        ${preference.source},
        ${preference.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        category = EXCLUDED.category,
        preference_key = EXCLUDED.preference_key,
        preference_value = EXCLUDED.preference_value,
        confidence = EXCLUDED.confidence,
        source = EXCLUDED.source,
        updated_at = EXCLUDED.updated_at
    `;
  }

  for (const seller of demoMarketplaceData.sellers) {
    await sql`
      INSERT INTO demo_sellers (
        id,
        display_name,
        location_label,
        trust_score,
        response_speed,
        contact_handle,
        fulfillment_policy,
        notes
      )
      VALUES (
        ${seller.id},
        ${seller.displayName},
        ${seller.locationLabel},
        ${seller.trustScore},
        ${seller.responseSpeed},
        ${seller.contactHandle},
        ${seller.fulfillmentPolicy},
        ${seller.notes}
      )
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        location_label = EXCLUDED.location_label,
        trust_score = EXCLUDED.trust_score,
        response_speed = EXCLUDED.response_speed,
        contact_handle = EXCLUDED.contact_handle,
        fulfillment_policy = EXCLUDED.fulfillment_policy,
        notes = EXCLUDED.notes
    `;
  }

  for (const listing of demoMarketplaceData.listings) {
    await sql`
      INSERT INTO demo_listings (
        id,
        seller_id,
        title,
        description,
        price_cents,
        currency,
        location_label,
        image_url,
        condition,
        source,
        status,
        risk_notes,
        tags
      )
      VALUES (
        ${listing.id},
        ${listing.sellerId},
        ${listing.title},
        ${listing.description},
        ${listing.priceCents},
        ${listing.currency},
        ${listing.locationLabel},
        ${listing.imageUrl ?? null},
        ${listing.condition},
        ${listing.source},
        ${listing.status},
        ${listing.riskNotes ?? null},
        ${listing.tags}
      )
      ON CONFLICT (id) DO UPDATE SET
        seller_id = EXCLUDED.seller_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        price_cents = EXCLUDED.price_cents,
        currency = EXCLUDED.currency,
        location_label = EXCLUDED.location_label,
        image_url = EXCLUDED.image_url,
        condition = EXCLUDED.condition,
        source = EXCLUDED.source,
        status = EXCLUDED.status,
        risk_notes = EXCLUDED.risk_notes,
        tags = EXCLUDED.tags
    `;
  }

  return {
    seeded: true,
    counts: {
      buyers: demoMarketplaceData.buyers.length,
      preferences: demoMarketplaceData.preferences.length,
      sellers: demoMarketplaceData.sellers.length,
      listings: demoMarketplaceData.listings.length,
    },
  };
}

export async function loadDemoMarketplaceData(): Promise<DemoMarketplaceData | undefined> {
  const sql = getSqlClient();
  if (!sql) {
    return undefined;
  }

  await ensureDemoSchema(sql);

  const buyerRows = await sql`
    SELECT id, phone_number, display_name, location_label, pickup_radius_miles, budget_style, approval_policy
    FROM demo_buyers
    ORDER BY id
  `;
  const preferenceRows = await sql`
    SELECT id, user_id, category, preference_key, preference_value, confidence, source, updated_at
    FROM demo_buyer_preferences
    ORDER BY id
  `;
  const sellerRows = await sql`
    SELECT id, display_name, location_label, trust_score, response_speed, contact_handle, fulfillment_policy, notes
    FROM demo_sellers
    ORDER BY id
  `;
  const listingRows = await sql`
    SELECT id, seller_id, title, description, price_cents, currency, location_label, image_url, condition, source, status, risk_notes, tags
    FROM demo_listings
    ORDER BY id
  `;

  if (buyerRows.length === 0 || sellerRows.length === 0 || listingRows.length === 0) {
    return undefined;
  }

  return {
    buyers: buyerRows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      phoneNumber: String(row.phone_number),
      displayName: String(row.display_name),
      locationLabel: String(row.location_label),
      pickupRadiusMiles: Number(row.pickup_radius_miles),
      budgetStyle: row.budget_style as DemoBuyer["budgetStyle"],
      approvalPolicy: row.approval_policy as DemoBuyer["approvalPolicy"],
    })),
    preferences: preferenceRows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      userId: String(row.user_id),
      category: String(row.category),
      key: String(row.preference_key),
      value: String(row.preference_value),
      confidence: Number(row.confidence),
      source: row.source as BuyerPreference["source"],
      updatedAt: new Date(String(row.updated_at)).toISOString(),
    })),
    sellers: sellerRows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      displayName: String(row.display_name),
      locationLabel: String(row.location_label),
      trustScore: Number(row.trust_score),
      responseSpeed: row.response_speed as DemoSeller["responseSpeed"],
      contactHandle: String(row.contact_handle),
      fulfillmentPolicy: row.fulfillment_policy as DemoSeller["fulfillmentPolicy"],
      notes: String(row.notes),
    })),
    listings: listingRows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      sellerId: String(row.seller_id),
      title: String(row.title),
      description: String(row.description),
      priceCents: Number(row.price_cents),
      currency: String(row.currency),
      locationLabel: String(row.location_label),
      imageUrl: row.image_url ? String(row.image_url) : undefined,
      condition: row.condition as DemoListing["condition"],
      source: "demo",
      status: row.status as DemoListing["status"],
      riskNotes: row.risk_notes ? String(row.risk_notes) : undefined,
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    })),
  };
}

export async function saveDemoMatchRun(input: {
  id: string;
  buyerId: string;
  wantId: string;
  inputMode: "text" | "image" | "approval";
  selectedListingId?: string;
  summary: string;
  outreachDraft?: string;
  trace: AgentTraceEvent[];
}): Promise<void> {
  const sql = getSqlClient();
  if (!sql) {
    return;
  }

  await ensureDemoSchema(sql);
  await sql`
    INSERT INTO demo_match_runs (
      id,
      buyer_id,
      want_id,
      input_mode,
      selected_listing_id,
      summary,
      outreach_draft,
      trace
    )
    VALUES (
      ${input.id},
      ${input.buyerId},
      ${input.wantId},
      ${input.inputMode},
      ${input.selectedListingId ?? null},
      ${input.summary},
      ${input.outreachDraft ?? null},
      ${JSON.stringify(input.trace)}
    )
    ON CONFLICT (id) DO UPDATE SET
      selected_listing_id = EXCLUDED.selected_listing_id,
      summary = EXCLUDED.summary,
      outreach_draft = EXCLUDED.outreach_draft,
      trace = EXCLUDED.trace
  `;
}
