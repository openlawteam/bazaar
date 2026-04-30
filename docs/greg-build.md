# Greg Build Plan

This is the comprehensive owner doc for Greg's slice of Bazaar. The repo already has the spine implemented; this document describes what is built, how to run it, and what is left.

## Scope

Greg owns the lightweight web/API and SMS path:

- `apps/api`
- Linq inbound and outbound messaging
- Phone-number identity and first-time OTP flow
- Conversation state for SMS/iMessage
- Buyer profile persistence endpoints
- Want intake endpoint and Spacebase posting flow
- ADIN/OpenAI integration for profile interviews and want parsing
- Deployment and environment variables for the API

## Demo Path

```text
Linq inbound -> verify HMAC -> dedupe by event_id -> parse text -> upsert user
  -> if unverified: issue OTP and prompt
  -> if verified: parse want -> persist -> post Spacebase INTENT -> SMS ack
```

Smoke test in demo mode (no Linq creds needed):

```bash
DEMO_MODE=true npm run dev:api

curl -sS -H "content-type: application/json" \
  -d '{"api_version":"v3","webhook_version":"2026-02-03","event_type":"message.received","event_id":"smoke-001","data":{"id":"msg-001","direction":"inbound","sender_handle":{"handle":"+15555550123","id":"h1"},"parts":[{"type":"text","value":"Find a used Herman Miller chair under $500 near Brooklyn"}],"chat":{"id":"chat-1"}}}' \
  http://localhost:8787/webhooks/linq/inbound
```

The terminal will log a `spacebase.mock.post` and a `linq.outbound.demo` reply.

## What Is Built

| Area | File | Notes |
| --- | --- | --- |
| Typed config + readiness | `apps/api/src/config.ts` | Zod-validated env, `describeReadiness()` summary |
| Logger | `apps/api/src/logger.ts` | Structured JSON logs |
| File-backed store | `apps/api/src/db/store.ts`, `db/repos.ts` | Hackathon-grade persistence behind repos |
| Linq HMAC verification | `apps/api/src/linq/verify.ts` | `X-Webhook-Signature` + timestamp tolerance |
| Linq webhook payloads | `apps/api/src/linq/types.ts` | 2026-02-03 + 2025-01-01 formats |
| Linq outbound | `apps/api/src/linq/client.ts` | `POST /chats` with idempotency, demo fallback |
| OTP + sessions | `apps/api/src/auth/otp.ts` | Issue/verify codes, mint Bearer tokens |
| Conversation router | `apps/api/src/conversation/router.ts` | State machine, SMS allowlist/trusted-number gate, want intake handler |
| Want parser | `apps/api/src/wants/parser.ts` | Regex baseline + optional OpenAI structured parse with Bazaar-specific prompt rules |
| Gateway SMS agent (active) | `apps/api/src/gateway/client.ts`, `apps/api/src/adin/prompt.ts` | Generates the customer-facing SMS reply via Vercel AI Gateway (`VERCEL_AI_GATEWAY_API_KEY` / `AI_GATEWAY_API_KEY`); model defaults to `openai/gpt-5.1-instant`. Real `system` prompt (`SMS_AGENT_SYSTEM_PROMPT`), 30s timeout, 320-char SMS cap, falls back to templated ack on failure |
| ADIN SMS agent (dormant) | `apps/api/src/adin/client.ts`, `apps/api/src/adin/prompt.ts` | Original ADIN integration kept in-tree but no longer called from the router. Production ADIN at `https://www.adin.chat` rejects all `adin_*` Bearer tokens until `USE_UNIFIED_V1_PIPELINE=true` is set on adin-chat's prod env. The local-dev path works (verified) and the client + minted key are still here for when the upstream flag flips |
| Spacebase client | `apps/api/src/spacebase/client.ts` | Mock + HTTP stub gated on env |
| HTTP server | `apps/api/src/server.ts` | All endpoints wired |

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Readiness summary for each subsystem |
| POST | `/webhooks/linq/inbound` | Linq webhook with HMAC verification + dedupe |
| POST | `/auth/otp/start` | Send OTP code via Linq (returns dev code in non-prod) |
| POST | `/auth/otp/verify` | Verify code, mint session token |
| GET | `/me` | Current user (Bearer token required) |
| GET | `/me/preferences` | Buyer preferences |
| GET | `/me/wants` | Wants list |
| GET | `/me/wants/:id` | Want detail with candidates |
| POST | `/wants` | Manual want intake (phone or session) |

## What Is Left

These are the next steps in priority order.

1. Provision a Linq webhook subscription pointing at `/webhooks/linq/inbound?version=2026-02-03` and set `LINQ_WEBHOOK_SECRET`, `LINQ_API_KEY`, `LINQ_FROM_PHONE_NUMBER` in `.env`.
2. SMS reply path now runs through Vercel AI Gateway (`apps/api/src/gateway/client.ts`) using `openai/gpt-5.1-instant` by default, with the templated ack as fallback. ADIN is on hold pending an upstream Vercel-env change in adin-chat (set `USE_UNIFIED_V1_PIPELINE=true` so production accepts `adin_*` Bearer tokens — see `adin-chat/src/app/api/v1/chat/route.ts:279`). Once that ships, swap the router back to call `adinClient` instead of `gatewayClient` (one-line change in `composeIntakeReply`); the ADIN client + minted key are already wired. Want parsing still uses the regex baseline plus the optional OpenAI fallback. Future work: route profile interview prompts and post-search update messages through the same Gateway client, and add streaming for longer responses.
3. Build the profile interview flow on top of the existing `profiling` state. After OTP verify, run a 3 to 5 question interview that saves `BuyerPreference` rows.
4. Replace the file-backed store with Postgres or SQLite when persistence/scale matters. The repo pattern in `apps/api/src/db/repos.ts` is built to swap.
5. Finish the real Spacebase HTTP client: provision a home space via the website-prepared agent flow, set `SPACEBASE_AGENT_PRINCIPAL` and `SPACEBASE_HOME_SPACE_ID`, then implement signed `INTENT` posting in `apps/api/src/spacebase/client.ts`.
6. Hand off wants to Jamie's shopping adapters (`packages/shopping`) and post candidates back into the want's interior.
7. Add approval flow handling. Reply parsing for `1`, `2`, `skip`, `cancel` in the conversation router when state is `awaiting_approval`.
8. Push outbound update SMS messages once candidates are scored, and emit Spacebase `PROMISE` and `COMPLETE` projections for each agent action.
9. Deploy the API somewhere reachable by Linq and Suvina's iOS build. Vercel, Railway, Fly, or a small VPS work fine.

## Environment

For teammates pulling envs from Vercel:

```bash
npm i -g vercel
vercel login
vercel link --yes --project bazaar --scope tributelabs
vercel env pull .env --environment=development --yes
```

After pulling, `npm run dev:api` works without further setup.

For Greg pushing fresh values from local `.env` to Vercel:

```bash
./scripts/sync-env-to-vercel.sh
```

The script pushes every populated key in `.env` to the `development` and `production` environments. Preview is intentionally skipped because Vercel CLI requires an explicit git branch in non-interactive mode.

The full env template lives in `.env.example`. The minimum to go live with Linq:

- `LINQ_WEBHOOK_SECRET`
- `LINQ_API_KEY`
- `LINQ_FROM_PHONE_NUMBER`
- `SESSION_SECRET`

Optional:

- `OPENAI_API_KEY` enables LLM want parsing
- `ADIN_API_KEY` switches the SMS reply text from a templated ack to an ADIN-generated message (system prompt in `apps/api/src/adin/prompt.ts`)
- `SPACEBASE_AGENT_PRINCIPAL` plus `SPACEBASE_HOME_SPACE_ID` switches the Spacebase client from mock to HTTP
- `DEMO_MODE=true` skips Linq verification and outbound delivery for local demos
- `SMS_ALLOWED_PHONE_NUMBERS` limits the SMS route to specific comma-separated E.164-style numbers
- `SMS_TRUSTED_PHONE_NUMBERS` also allows those numbers and skips OTP so a private demo number goes straight into want intake
