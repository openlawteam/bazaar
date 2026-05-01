/**
 * Lightweight, deterministic SMS intent classifier.
 *
 * Runs BEFORE the buyer-want fallback in `processInbound()` so verified users can:
 *   - list something for sale
 *   - browse marketplace inventory in any of three scopes:
 *     - "trending" — generic "what's for sale / what's available / show me
 *       listings / browse / what do you have / any deals" (default scope when
 *       no temporal or location qualifier is present)
 *     - "new" — "what's new / just listed / new listings / recently listed"
 *     - "local" — "near me / nearby / in my area / local"
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

/**
 * Catch-all "show me marketplace inventory" phrasings that don't carry an
 * explicit temporal or location qualifier. These default to the "trending"
 * scope so we always have something to surface, but if the message ALSO
 * says "near me" or "what's new" the more specific scope still wins below.
 *
 * Carefully written to NOT collide with SELL_REGEX: "selling X" / "for sale: X"
 * are handled earlier in classifyIntent, and "what's for sale" / "browse"
 * never start with the SELL prefixes.
 */
const MARKETPLACE_BROWSE_REGEX = new RegExp(
  [
    "\\bwhat(?:'?s|\\s+is)\\s+for\\s+sale\\b",
    "\\bwhat(?:'?s|\\s+is)\\s+available\\b",
    "\\bshow\\s+(?:me\\s+)?(?:the\\s+)?(?:listings?|what\\s+you\\s+(?:have|got))\\b",
    "\\bwhat\\s+do\\s+you\\s+have\\b",
    "\\bwhat\\s+have\\s+you\\s+got\\b",
    "\\b(?:any|what)\\s+deals\\b",
    "^\\s*browse\\b",
  ].join("|"),
  "i",
);

const LOCATION_REGEX = /(?:near|in|around)\s+([A-Za-z][A-Za-z\s.'-]{2,60})/i;

/**
 * Returns the most specific intent the message matches.
 *
 * Order matters: an explicit "selling" prefix wins over discover phrasing
 * (e.g. "selling popular item") and discover wins over the default want
 * fallback. Bare locations like "in Brooklyn" do NOT trigger discover on
 * their own — the user has to also say a discover keyword (trending / local
 * / what's new / browse-style phrasing) so we don't accidentally hijack
 * buyer searches like "vintage couch in Brooklyn".
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
  const isMarketplaceBrowse = MARKETPLACE_BROWSE_REGEX.test(trimmed);

  if (isTrending || isNew || isLocal || isMarketplaceBrowse) {
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
