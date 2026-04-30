# Bazaar

Demand-first personal shopping over SMS and iOS.

Bazaar lets a person text what they want, turns that want into an intent, and lets specialized agents find, score, and coordinate local or shippable options. The iOS app is the account and preference control center; SMS/iMessage is the fast buying loop.

## Repo Shape

```text
apps/
  api/        Lightweight TypeScript API for SMS webhooks and orchestration.
  ios/        SwiftUI app workspace owned by Suvina.
packages/
  core/       Shared domain schemas and TypeScript types.
  agents/     Agent role contracts and orchestration interfaces.
  shopping/   Shopping/search adapter contracts owned by Jamie.
  spacebase/  Intent-space client contracts.
docs/
  plan.md
  ownership.md
  architecture.md
  api-contracts.md
  spacebase-ios-scout.md
```

## Quick Start

```bash
npm install
npm run typecheck
npm run dev:api
```

The API currently exposes infrastructure stubs and shared contracts only. Product logic, SMS handling, shopping adapters, and iOS UX are intentionally split by owner.
