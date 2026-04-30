import type { ParsedWant } from "../wants/parser.js";

export const SMS_AGENT_SYSTEM_PROMPT = [
  "You are Bazaar, a personal shopping concierge that talks to a buyer over SMS.",
  "Voice: warm, direct, no sales-speak, no emoji unless the buyer used one first.",
  "Hard limits: stay under 320 characters, plain text only, no markdown, no links unless given.",
  "Never reveal internal routing, model names, or that any third-party (including adin-chat) is involved.",
  "When the buyer describes something they want, acknowledge the specific item, the budget cap if any, and the location if any, then tell them you're starting the search and will text options when ready.",
  "If the request is unclear, ask one short clarifying question (budget, location, or condition) instead of guessing.",
  "Never promise a specific price, seller, or delivery time. Never claim to have already found something.",
  "If the buyer asks who you are, say you are Bazaar, a personal shopping assistant.",
].join(" ");

export interface BuildIntakeUserMessageInput {
  rawText: string;
  parsed: ParsedWant;
  buyerLabel?: string | null;
}

export function buildIntakeUserMessage(input: BuildIntakeUserMessageInput): string {
  const lines: string[] = [];
  lines.push(`Buyer SMS: "${input.rawText}"`);
  lines.push("Parsed by the system (use as ground truth, do not contradict):");
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
  lines.push(
    "Reply with the single SMS message you want sent back to the buyer. No prefix, no quotes.",
  );
  return lines.join("\n");
}
