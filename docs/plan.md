# Bazaar Plan

## Product

Bazaar is a demand-first personal shopping agent. A user says what they want, usually by SMS or iMessage. Bazaar interviews them when needed, learns their buying preferences, and coordinates specialized agents to find, score, and help act on local or shippable options.

The user experience is intentionally split:

- **SMS/iMessage** is the low-friction buying loop: wants, clarifying questions, quick approvals, seller updates.
- **iOS** is the account and control center: phone auth, buyer profile, active wants, saved preferences, approvals, history, and widgets later.
- **Spacebase1** is the coordination substrate: each buyer want is an `INTENT`, and candidate listings, promises, risk checks, and completions live inside that intent's interior.
- **ADIN-style orchestration** supplies the agent pattern: one orchestrator delegates to specialist roles rather than a single monolithic chatbot.

## MVP Demo

1. A first-time user verifies a phone number.
2. Bazaar interviews the user over SMS or iOS to learn basic shopping preferences.
3. The user texts a want, for example: "Find me a used Herman Miller chair under $500 near Brooklyn."
4. The API parses the message into a structured want and posts it as a Spacebase intent.
5. Shopping agents find local and shippable candidates.
6. Fit and risk agents score candidates against the buyer profile.
7. The user receives a concise SMS summary and can approve next steps.
8. The iOS app shows the buyer profile, active wants, and status.

## Hackathon Fit

- **Originality**: reverse Craigslist/eBay where demand comes first and agents work for the buyer.
- **Technical depth**: SMS auth, profile extraction, structured wants, Spacebase posting, agent delegation, candidate ranking, iOS account surface.
- **Intent-space native-ness**: wants are intents; every want has an interior where agents self-select and post child work.
- **Demo-ability**: a judge can text a want, watch the intent space fill, and receive options by SMS.

## Non-Goals For Initial Repo

- Do not build the full iOS UI yet.
- Do not implement production payments.
- Do not automate purchases without explicit user approval.
- Do not depend on broad marketplace scraping before the demo path works.
- Do not hide Spacebase behind a private queue; the intent-space mechanics should remain visible in logs, docs, or a debug view.
