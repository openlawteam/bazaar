# Bazaar Plan

## Product

Bazaar is a demand-first personal shopping agent. A user says what they want, Bazaar turns that want into structured intent, and specialist agents find, score, and coordinate local or shippable options.

The current product surface is a Next.js web app:

- **Web dashboard** handles demo phone verification, buying wants, seller listings, and match review.
- **Spacebase1** remains the coordination substrate: each buyer want can be represented as an `INTENT`, and candidate listings, promises, risk checks, and completions can live inside that intent's interior.
- **Agent orchestration** supplies the buying pattern: one request fans out to specialist roles for scouting, fit checks, risk checks, negotiation drafts, and logistics.

## MVP Demo

1. A first-time user verifies a phone number through demo OTP.
2. The user chooses buying or selling.
3. A buyer posts a want, for example: `Find me a used Herman Miller chair under $500 near Brooklyn`.
4. Bazaar parses the want, persists it, and runs a seeded marketplace match.
5. Shopping agents score candidate listings against buyer preferences and risk signals.
6. The dashboard shows wants, listings, suggested matches, and seller outreach drafts.

## Hackathon Fit

- **Originality**: reverse Craigslist/eBay where demand comes first and agents work for the buyer.
- **Technical depth**: structured wants, phone-based session flow, marketplace matching, Spacebase-ready intent contracts, agent traces, and image-based want intake.
- **Intent-space native-ness**: wants are intents; every want has an interior where agents can self-select and post child work.
- **Demo-ability**: a judge can use the web app, post a want, see matches, and inspect the agent trace.

## Non-Goals For Initial Repo

- Do not implement production payments.
- Do not automate purchases without explicit user approval.
- Do not depend on broad marketplace scraping before the demo path works.
- Do not hide Spacebase behind a private queue; the intent-space mechanics should remain visible in logs, docs, or a debug view.
