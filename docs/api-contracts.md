# API Contracts

These are initial collaboration contracts, not final production APIs.

## Health

```http
GET /health
```

Returns service status and known agent roles.

## Linq Inbound Webhook

```http
POST /webhooks/linq/inbound
```

Initial expected body:

```json
{
  "from": "+15555555555",
  "body": "Find me a used road bike under $500 near Brooklyn",
  "messageId": "optional-provider-id"
}
```

Greg owns the final Linq signature verification, payload shape, OTP flow, and outbound response handling.

## Create Want

```http
POST /wants
```

Expected body follows `wantSchema` from `packages/core`.

The next implementation step is to make this endpoint:

1. Persist the want.
2. Post the want as a Spacebase `INTENT`.
3. Fan out to shopping and scoring agents.
4. Return an accepted status plus IDs for SMS and iOS tracking.

## Shared Types

Use the Zod schemas in `packages/core` as the source of truth for TypeScript API contracts until the team decides whether to generate OpenAPI and Swift models.
