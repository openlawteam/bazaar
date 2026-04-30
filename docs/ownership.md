# Team Ownership

## Greg

Greg owns the lightweight web/API and SMS path.

Primary areas:

- `apps/api`
- Linq inbound and outbound messaging
- Phone-number identity and first-time OTP flow
- Conversation state for SMS/iMessage
- Buyer profile persistence endpoints
- Want intake endpoint and Spacebase posting flow
- ADIN API integration for profile interviews and summaries
- Deployment and environment variables for the API

First milestone:

- Receive a Linq inbound message.
- Verify or identify the phone number.
- Turn a text message into a structured want.
- Hand the want to Spacebase and shopping orchestration.
- Send a concise SMS response.

## Suvina

Suvina owns the iOS app.

Primary areas:

- `apps/ios`
- SwiftUI project setup
- Phone-number sign-in and OTP UI
- Buyer profile review and editing
- Active wants list
- Want detail/status view
- Approval controls for seller contact, offers, and purchases
- Push notifications and widgets as stretch goals

First milestone:

- Create the SwiftUI shell.
- Connect to the API health endpoint.
- Build account/profile screens against stable shared API contracts.
- Show active wants once Greg lands persistence endpoints.

## Jamie

Jamie owns shopping technology.

Primary areas:

- `packages/shopping`
- Source adapters for local and shippable inventory
- Candidate normalization
- Product/listing enrichment
- Fit scoring signals
- Risk/scam heuristics
- Seller/source metadata
- Interfaces needed by scouting agents

First milestone:

- Implement at least one demo-ready source adapter.
- Return normalized `ListingCandidate` objects.
- Provide enough scoring metadata for SMS summaries and iOS status views.

## Shared Contracts

Shared areas:

- `packages/core`
- `packages/agents`
- `packages/spacebase`
- `docs`

Rules of thumb:

- Add shared fields to `packages/core` before wiring feature-specific code.
- Keep source-specific shopping details inside `packages/shopping`.
- Keep Linq-specific behavior inside `apps/api`.
- Keep Swift-specific model translations inside `apps/ios`.
- Use Spacebase terms accurately: `post`, `scan`, `enter`, `INTENT`, `PROMISE`, `ACCEPT`, `COMPLETE`.
