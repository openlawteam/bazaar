import { config } from "../config.js";
import { logger } from "../logger.js";

export interface ParsedWant {
  title: string;
  description: string | null;
  maxBudgetCents: number | null;
  currency: string;
  locationLabel: string | null;
}

const PRICE_REGEX = /(?:under|below|max|<|less than|up to)\s*\$?\s*(\d{2,5})/i;
const NEAR_REGEX = /(?:near|in|around)\s+([A-Za-z][A-Za-z\s.'-]{2,60})/i;

function heuristicParse(rawText: string): ParsedWant {
  const trimmed = rawText.trim();
  const priceMatch = trimmed.match(PRICE_REGEX);
  const locationMatch = trimmed.match(NEAR_REGEX);

  return {
    title: trimmed.slice(0, 120),
    description: trimmed.length > 120 ? trimmed : null,
    maxBudgetCents: priceMatch?.[1] ? Number(priceMatch[1]) * 100 : null,
    currency: "USD",
    locationLabel: locationMatch?.[1]?.trim() ?? null,
  };
}

interface AdinParseResponse {
  title?: string;
  description?: string;
  maxBudgetCents?: number | null;
  currency?: string;
  locationLabel?: string | null;
}

async function parseWithOpenAi(rawText: string): Promise<ParsedWant | null> {
  if (!config.OPENAI_API_KEY) return null;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Extract a buyer want as JSON with fields title (short), description, maxBudgetCents (integer, USD cents, or null), currency (default USD), locationLabel (city/region or null).',
          },
          { role: "user", content: rawText },
        ],
      }),
    });

    if (!response.ok) {
      logger.warn("want.parser.openai.failed", { status: response.status });
      return null;
    }

    const json = (await response.json()) as { choices: { message: { content: string } }[] };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as AdinParseResponse;
    return {
      title: parsed.title?.slice(0, 200) ?? heuristicParse(rawText).title,
      description: parsed.description ?? null,
      maxBudgetCents:
        typeof parsed.maxBudgetCents === "number" && Number.isFinite(parsed.maxBudgetCents)
          ? Math.max(0, Math.floor(parsed.maxBudgetCents))
          : null,
      currency: parsed.currency ?? "USD",
      locationLabel: parsed.locationLabel ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    logger.warn("want.parser.openai.error", { message });
    return null;
  }
}

export async function parseWantText(rawText: string): Promise<ParsedWant> {
  const llm = await parseWithOpenAi(rawText);
  if (llm) return llm;
  return heuristicParse(rawText);
}
