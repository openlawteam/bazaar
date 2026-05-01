# API Contracts

These are initial demo contracts for the flat Next.js app. They are implemented as route handlers under `app/api`.

## Health

```http
GET /api/health
```

Returns service status, configured agent roles, and readiness details.

## Demo OTP

```http
POST /api/auth/start
POST /api/auth/verify
POST /api/auth/logout
```

`/api/auth/start` accepts `{ "phoneNumber": "+15555550123" }`, issues a demo OTP, logs it server-side, and returns `devCode` so the demo UI can continue without a messaging provider.

`/api/auth/verify` accepts `{ "phoneNumber": "+15555550123", "code": "123456" }`, sets the `bazaar_session` HTTP-only cookie, and returns the user plus session metadata.

## Current User

```http
GET /api/me
GET /api/me/preferences
GET /api/me/wants
GET /api/me/wants/:id
GET /api/me/listings
POST /api/me/listings
GET /api/me/feed
```

These routes require the `bazaar_session` cookie. They power the dashboard and mirror the direct server-side helpers used by server components/actions.

## Create Want

```http
POST /api/wants
```

Expected body can be either a full `wantSchema` payload from `lib/core`, or `{ "text": "Find me a used road bike under $500 near Brooklyn" }` for the authenticated demo flow.

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

The shopping payload is backed by in-code seeded marketplace data. Persistent production marketplace storage is still a later Postgres step.

## Create Want From Image

```http
POST /api/wants/from-image
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

The route validates an `image/*` upload up to 5MB, runs Google Cloud Vision label/OCR/web detection when credentials are present, converts the image facts into a structured `Want`, and returns the same shopping match payload as `POST /api/wants`.

## Approve Seller Outreach

```http
POST /api/wants/:id/approve-outreach
```

Optional body:

```json
{
  "userId": "user-demo-1",
  "listingId": "listing-aeron-420"
}
```

Returns a simulated approval result with status `contacting_seller` and the seller outreach draft. This is not real seller messaging yet.

## Shared Types

Use the Zod schemas in `lib/core` as the source of truth for TypeScript API contracts until the app needs generated OpenAPI clients.
