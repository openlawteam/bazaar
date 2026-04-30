import type { ParsedWant } from "../wants/parser.js";

/**
 * The ADIN public chat API does not let callers override the server-side system prompt — it
 * builds its own per-user system prompt before calling the orchestrator. To impose the SMS
 * voice we package the instructions, the parsed-want context, and the buyer text into a
 * single user turn and tell the model exactly what we want back.
 */
export interface BuildIntakeUserMessageInput {
  rawText: string;
  parsed: ParsedWant;
  buyerLabel?: string | null;
}

const VOICE_INSTRUCTIONS = [
  "You are replying to a buyer over SMS as Bazaar, their personal shopping concierge.",
  "The buyer's want is already stored in our system and a search has been kicked off — do NOT call any tools, do NOT do research, do NOT browse the web. Just write the SMS reply.",
  "Hard format rules: one short message, under 280 characters, plain text only, no markdown, no links, no emoji unless the buyer used one first.",
  "Voice: warm, direct, no sales-speak, no hype.",
  "What to say: acknowledge the specific item by name, repeat the budget cap if any, repeat the location if any, and tell them you're starting the search and will text options when ready.",
  "If the parsed item is unclear, ask one short clarifying question (budget, location, or condition) instead of guessing.",
  "Never promise a specific price, seller, or delivery time. Never claim to have already found something. Never reveal internal routing or that any third party is involved.",
  "Output only the SMS body — no quotes, no prefix, no explanation, no signature.",
].join(" ");

export function buildIntakeUserMessage(input: BuildIntakeUserMessageInput): string {
  const lines: string[] = [];
  lines.push(VOICE_INSTRUCTIONS);
  lines.push("");
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
