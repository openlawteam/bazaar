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

For the MVP demo, this route also creates a structured demo want and returns the same shopping payload as `POST /wants`.

Greg owns the final Linq signature verification, payload shape, OTP flow, and outbound response handling.

## Create Want

```http
POST /wants
```

Expected body follows `wantSchema` from `packages/core`.

MVP response shape:

```json
{
  "accepted": true,
  "next": "approve_seller_outreach",
  "want": {},
  "shopping": {
    "rankedCandidates": [],
    "matches": [],
    "matchedSeller": {},
    "sellerOutreachDraft": "Hi ...",
    "summary": "Best match: ... Want me to contact the seller?",
    "nextAction": "approve_seller_outreach",
    "trace": []
  }
}
```

The shopping payload is backed by seeded Neon marketplace data when `DATABASE_URL` is configured. If Neon is not configured, the API falls back to the same in-code demo data.

## Create Want From Image

```http
POST /wants/from-image
Content-Type: multipart/form-data
```

Expected multipart fields:

```text
image=<binary image file>
userId=user-demo-1
message=I wanna buy this
locationLabel=Brooklyn
maxBudgetCents=50000
```

The API validates an `image/*` upload up to 5MB, runs Google Cloud Vision label/OCR/web detection, converts the image facts into a structured `Want`, and returns the same shopping match payload as `POST /wants`.

MVP response includes an additional `vision` block:

```json
{
  "vision": {
    "itemType": "office chair",
    "brandGuess": "Herman Miller",
    "modelGuess": "Aeron",
    "labels": ["office chair"],
    "extractedText": ["Herman Miller Aeron"],
    "confidence": 0.94,
    "fallbackUsed": false
  }
}
```

## Approve Seller Outreach

```http
POST /wants/:id/approve-outreach
```

Optional body:

```json
{
  "userId": "user-demo-1",
  "listingId": "listing-aeron-420"
}
```

Returns a simulated approval result with status `contacting_seller` and the seller outreach draft. This is not real seller messaging yet.

## Demo Database

```bash
npm run db:seed
```

Seeds Neon with deterministic demo buyers, buyer preferences, sellers, listings, and match-run storage. The seed script is idempotent and safe to rerun before demos.

## Shared Types

Use the Zod schemas in `packages/core` as the source of truth for TypeScript API contracts until the team decides whether to generate OpenAPI and Swift models.
