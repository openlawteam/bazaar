#!/usr/bin/env node
/**
 * Mint a fresh adin_live_* API key for a given user in the shared Neon DB,
 * using the same SHA-256 scheme as adin-chat's apiKeyService.
 *
 *   node scripts/mint-adin-key.mjs <userId> [<keyName>]
 *
 * Outputs the raw token to stdout exactly once. Paste it into ADIN_API_KEY in
 * .env. The DB stores only the SHA-256 hash; if you lose the printed token you
 * have to revoke the row and mint again.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";

import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "..", ".env");
try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}

const userId = process.argv[2];
const keyName = process.argv[3] ?? "Bazaar SMS Agent";
if (!userId) {
  console.error("usage: node scripts/mint-adin-key.mjs <userId> [<keyName>]");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const random = randomBytes(24).toString("hex");
const prefix = "adin_live_";
const raw = `${prefix}${random}`;
const last4 = raw.slice(-4);
const hash = createHash("sha256").update(raw, "utf8").digest("hex");

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const userCheck = await client.query("SELECT id, email FROM users WHERE id = $1", [userId]);
  if (userCheck.rows.length === 0) {
    console.error(`No user with id ${userId}`);
    process.exit(2);
  }
  const owner = userCheck.rows[0];

  const insert = await client.query(
    `INSERT INTO api_keys
       (user_id, name, key_hash, key_prefix, key_last4, scopes, rate_limit_rpm, rate_limit_concurrent)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
     RETURNING id, created_at`,
    [userId, keyName, hash, prefix, last4, JSON.stringify({}), 60, 5],
  );

  const row = insert.rows[0];
  console.log("Minted ADIN API key");
  console.log("  user:        ", owner.email, `(${owner.id})`);
  console.log("  api_keys.id: ", row.id);
  console.log("  name:        ", keyName);
  console.log("  prefix:      ", prefix);
  console.log("  last4:       ", last4);
  console.log("  created_at:  ", row.created_at?.toISOString?.() ?? row.created_at);
  console.log("");
  console.log("RAW TOKEN (shown once — paste into ADIN_API_KEY in .env):");
  console.log("");
  console.log("  " + raw);
  console.log("");
} finally {
  await client.end();
}
