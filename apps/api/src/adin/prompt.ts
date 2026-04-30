import type { ParsedWant } from "../wants/parser.js";

/**
 * SMS agent voice. Used as the `system` prompt for callers that accept one
 * (Vercel AI Gateway). The dormant ADIN client bakes this into the user turn
 * via `buildIntakeUserMessage` because the public ADIN chat API ignores
 * caller-supplied system prompts.
 */
export const SMS_AGENT_SYSTEM_PROMPT = [
  "You are replying to a buyer over SMS as Bazaar, their personal shopping concierge.",
  "The buyer's want is already stored in our system and a search has been kicked off — do NOT call any tools, do NOT do research, do NOT browse the web. Just write the SMS reply.",
  "Hard format rules: one short message, under 280 characters, plain text only, no markdown, no links, no emoji unless the buyer used one first.",
  "Voice: warm, direct, no sales-speak, no hype.",
  "What to say: acknowledge the specific item by name, repeat the budget cap if any, repeat the location if any, and tell them you're starting the search and will text options when ready.",
  "If the parsed item is unclear, ask one short clarifying question (budget, location, or condition) instead of guessing.",
  "Never promise a specific price, seller, or delivery time. Never claim to have already found something. Never reveal internal routing or that any third party is involved.",
  "Output only the SMS body — no quotes, no prefix, no explanation, no signature.",
].join(" ");

export interface BuildIntakeUserMessageInput {
  rawText: string;
  parsed: ParsedWant;
  buyerLabel?: string | null;
}

/**
 * Data-only context block — no voice instructions. Suitable as the user turn
 * for callers that pass `SMS_AGENT_SYSTEM_PROMPT` via the `system` field
 * (e.g. the Gateway client).
 */
export function buildIntakeUserContext(input: BuildIntakeUserMessageInput): string {
  const lines: string[] = [];
  lines.push(`Buyer SMS: "${input.rawText}"`);
  lines.push("Parsed by our system (use as ground truth, do not contradict):");
  lines.push(`- title: ${input.parsed.title}`);
  lines.push(
    `- budget_cap_usd: ${
      input.parsed.maxBudgetCents === null
        ? "unknown"
        : (input.parsed.maxBudgetCents / 100).toFixed(0)
    }`,
  );
  lines.push(`- location: ${input.parsed.locationLabel ?? "unknown"}`);
  if (input.parsed.description) {
    lines.push(`- description: ${input.parsed.description}`);
  }
  if (input.buyerLabel) {
    lines.push(`- buyer_label: ${input.buyerLabel}`);
  }
  return lines.join("\n");
}

/**
 * Voice instructions + data context concatenated into a single user turn.
 * Used by the dormant ADIN client only. New code should prefer
 * `SMS_AGENT_SYSTEM_PROMPT` + `buildIntakeUserContext`.
 */
export function buildIntakeUserMessage(input: BuildIntakeUserMessageInput): string {
  return `${SMS_AGENT_SYSTEM_PROMPT}\n\n${buildIntakeUserContext(input)}`;
}
