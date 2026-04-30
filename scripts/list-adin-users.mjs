#!/usr/bin/env node
/**
 * List candidate users in the shared Neon DB so we can pick which account to
 * attach a fresh adin_live_* API key to.
 *
 *   node scripts/list-adin-users.mjs
 *
 * Reads DATABASE_URL from the local .env via Node 20's --env-file flag if
 * present; otherwise expects DATABASE_URL to already be in the environment.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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
  // .env is optional — caller may have exported DATABASE_URL directly.
  if (err.code !== "ENOENT") throw err;
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const result = await client.query(
    `SELECT id, email, name, first_name, last_name, is_admin, created_at
       FROM users
      ORDER BY (is_admin)::int DESC, created_at ASC
      LIMIT 30`,
  );
  if (result.rows.length === 0) {
    console.log("(no users found in this DB)");
  } else {
    console.table(
      result.rows.map((row) => ({
        id: row.id,
        email: row.email ?? "(null)",
        name: row.name ?? row.first_name ?? row.last_name ?? "(null)",
        admin: row.is_admin ? "yes" : "",
        created: row.created_at?.toISOString().slice(0, 10) ?? "",
      })),
    );
  }

  const total = await client.query("SELECT COUNT(*)::int AS n FROM users");
  console.log(`\nTotal users in DB: ${total.rows[0].n}`);
} finally {
  await client.end();
}
