/**
 * Lightweight, deterministic SMS intent classifier.
 *
 * Runs BEFORE the buyer-want fallback in `processInbound()` so verified users can:
 *   - list something for sale
 *   - browse trending / new / local marketplace inventory
 *   - get help
 *
 * Anything that doesn't match an explicit intent below is treated as a buyer want
 * (the historical default), which preserves backwards compatibility with the
 * existing demo flow.
 */

export type DiscoverScope = "trending" | "new" | "local";

export type SmsIntent =
  | { kind: "help" }
  | { kind: "sell"; remainder: string }
  | { kind: "discover"; scope: DiscoverScope; locationHint: string | null }
  | { kind: "want" };

const HELP_REGEX = /^\s*(?:help|menu|commands|what can you do)\s*\??\s*$/i;

const SELL_REGEX =
  /^\s*(?:sell|selling|for\s*sale|fs|fsbo|i(?:'|\s)?m\s+selling|i\s+have|list(?:ing)?|post(?:ing)?)[:\s,-]+/i;

const TRENDING_REGEX = /\b(trending|hot|popular|most\s+viewed|top\s+items?)\b/i;
const NEW_REGEX = /\b(what(?:'|\s)?s\s+new|whats\s+new|new\s+listings?|just\s+listed|recent(?:ly\s+listed)?)\b/i;
const LOCAL_REGEX = /\b(near\s*me|nearby|local(?:\s+to\s+me)?|in\s+my\s+area|around\s+me|in\s+my\s+city)\b/i;
const LOCATION_REGEX = /(?:near|in|around)\s+([A-Za-z][A-Za-z\s.'-]{2,60})/i;

/**
 * Returns the most specific intent the message matches.
 *
 * Order matters: an explicit "selling" prefix wins over discover phrasing
 * (e.g. "selling popular item") and discover wins over the default want
 * fallback. Bare locations like "in Brooklyn" do NOT trigger discover on
 * their own — the user has to also say a discover keyword (trending / local
 * / what's new) so we don't accidentally hijack buyer searches like
 * "vintage couch in Brooklyn".
 */
export function classifyIntent(text: string): SmsIntent {
  const trimmed = text.trim();
  if (!trimmed) return { kind: "want" };

  if (HELP_REGEX.test(trimmed)) return { kind: "help" };

  const sellMatch = trimmed.match(SELL_REGEX);
  if (sellMatch) {
    const remainder = trimmed.slice(sellMatch[0].length).trim();
    return { kind: "sell", remainder: remainder || trimmed };
  }

  const isTrending = TRENDING_REGEX.test(trimmed);
  const isNew = NEW_REGEX.test(trimmed);
  const isLocal = LOCAL_REGEX.test(trimmed);

  if (isTrending || isNew || isLocal) {
    const scope: DiscoverScope = isLocal ? "local" : isNew ? "new" : "trending";
    const locationMatch = trimmed.match(LOCATION_REGEX);
    return {
      kind: "discover",
      scope,
      locationHint: locationMatch?.[1]?.trim() ?? null,
    };
  }

  return { kind: "want" };
}
