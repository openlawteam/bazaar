# Bazaar

Bazaar is a Next.js web app for demand-first personal shopping. A user verifies a phone number in demo mode, posts a want, and sees seeded marketplace matches plus seller outreach drafts.

## Repo Shape

```text
app/                  Next.js App Router pages and API route handlers.
components/           Shared UI components.
lib/                  Server logic, demo store, domain contracts, agents, shopping, and Spacebase helpers.
docs/                 Product and API notes.
public/demo/          Demo listing images.
scripts/              Local utility scripts.
```

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, choose a buy/sell path, enter a phone number, and use the surfaced demo OTP code to continue to the dashboard.

## Useful Commands

```bash
npm run typecheck
npm run build
npm run start
```

Local state is file-backed under `.data/`. On Vercel this is only durable within a warm function container; swap the repos to Postgres before relying on persistent production state.
