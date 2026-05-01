#!/usr/bin/env node
// One-off ops script: sends a signed Linq-shaped webhook envelope to our
// production webhook so we can prove the classifier path end-to-end without
// actually firing a real SMS through Linq. Reads LINQ_WEBHOOK_SECRET and an
// allowed sender from the local .env / process env.
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const ENDPOINT =
  process.env.WEBHOOK_URL ?? "https://bazaar-api-six.vercel.app/webhooks/linq/inbound";

const text = process.argv.slice(2).join(" ").trim();
if (!text) {
  console.error("usage: node scripts/send-signed-linq-inbound.mjs <message text>");
  process.exit(2);
}

function loadEnvFile(path) {
  try {
    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    const map = {};
    for (const line of lines) {
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      map[key] = value;
    }
    return map;
  } catch {
    return {};
  }
}

const fileEnv = loadEnvFile(new URL("../.env", import.meta.url).pathname);
const secret = process.env.LINQ_WEBHOOK_SECRET ?? fileEnv.LINQ_WEBHOOK_SECRET;
if (!secret) {
  console.error("LINQ_WEBHOOK_SECRET missing from env or .env");
  process.exit(2);
}
const trustedRaw =
  process.env.SMS_TRUSTED_PHONE_NUMBERS ?? fileEnv.SMS_TRUSTED_PHONE_NUMBERS ?? "";
const trusted = trustedRaw
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
const sender = process.env.SENDER ?? trusted[0];
if (!sender) {
  console.error("No trusted sender configured (set SENDER or SMS_TRUSTED_PHONE_NUMBERS).");
  process.exit(2);
}

const eventId = `evt-test-${randomUUID()}`;
const messageId = `msg-test-${randomUUID()}`;
const sentAt = new Date().toISOString();

const envelope = {
  api_version: "v3",
  webhook_version: "2025-10-01",
  event_type: "message.received",
  event_id: eventId,
  created_at: sentAt,
  trace_id: `trace-${randomUUID()}`,
  partner_id: "ops-test",
  data: {
    id: messageId,
    direction: "inbound",
    sender_handle: { handle: sender, id: sender, service: "sms" },
    parts: [{ type: "text", value: text }],
    chat: { id: `chat-${sender}` },
    sent_at: sentAt,
    service: "sms",
  },
};

const rawBody = JSON.stringify(envelope);
const timestamp = Math.floor(Date.now() / 1000).toString();
const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

const start = Date.now();
const response = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-webhook-timestamp": timestamp,
    "x-webhook-signature": signature,
  },
  body: rawBody,
});
const elapsed = Date.now() - start;
const body = await response.text();
console.log(
  JSON.stringify(
    {
      endpoint: ENDPOINT,
      sender,
      text,
      eventId,
      status: response.status,
      elapsedMs: elapsed,
      body,
    },
    null,
    2,
  ),
);
if (!response.ok) process.exit(1);
