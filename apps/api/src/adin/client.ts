import { config } from "../config.js";
import { logger } from "../logger.js";

export interface AdinChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AdinCompleteOptions {
  systemPrompt: string;
  userMessage: string;
  history?: AdinChatMessage[];
  maxOutputChars?: number;
  timeoutMs?: number;
}

export interface AdinCompleteResult {
  ok: boolean;
  text: string | null;
  reason: string | null;
}

interface ChoiceShape {
  message?: { content?: unknown };
  delta?: { content?: unknown };
  text?: unknown;
}

interface OpenAiLikeBody {
  choices?: ChoiceShape[];
  message?: { content?: unknown };
  content?: unknown;
  output?: unknown;
  text?: unknown;
}

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_OUTPUT_CHARS = 320;

function pickTextFromJson(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as OpenAiLikeBody;

  const fromChoices = body.choices?.[0];
  if (fromChoices) {
    const messageContent = fromChoices.message?.content;
    if (typeof messageContent === "string" && messageContent.trim()) return messageContent.trim();
    const deltaContent = fromChoices.delta?.content;
    if (typeof deltaContent === "string" && deltaContent.trim()) return deltaContent.trim();
    if (typeof fromChoices.text === "string" && fromChoices.text.trim()) {
      return fromChoices.text.trim();
    }
  }

  const fromMessage = body.message?.content;
  if (typeof fromMessage === "string" && fromMessage.trim()) return fromMessage.trim();

  if (typeof body.content === "string" && body.content.trim()) return body.content.trim();
  if (typeof body.output === "string" && body.output.trim()) return body.output.trim();
  if (typeof body.text === "string" && body.text.trim()) return body.text.trim();

  return null;
}

function pickTextFromSseLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice("data:".length).trim();
  if (!payload || payload === "[DONE]") return null;
  try {
    const json = JSON.parse(payload) as OpenAiLikeBody;
    return pickTextFromJson(json);
  } catch {
    return null;
  }
}

async function readAsText(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();

  if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(raw) as unknown;
      const picked = pickTextFromJson(json);
      if (picked) return picked;
    } catch {
      // fall through to SSE / raw handling
    }
  }

  if (contentType.includes("event-stream") || raw.includes("data:")) {
    const parts: string[] = [];
    for (const line of raw.split(/\r?\n/)) {
      const fragment = pickTextFromSseLine(line);
      if (fragment) parts.push(fragment);
    }
    if (parts.length > 0) return parts.join("");
  }

  return raw.trim();
}

export const adinClient = {
  isConfigured(): boolean {
    return Boolean(config.ADIN_API_KEY);
  },

  async complete(options: AdinCompleteOptions): Promise<AdinCompleteResult> {
    if (!config.ADIN_API_KEY) {
      return { ok: false, text: null, reason: "adin_api_key_missing" };
    }

    const messages: AdinChatMessage[] = [
      { role: "system", content: options.systemPrompt },
      ...(options.history ?? []),
      { role: "user", content: options.userMessage },
    ];

    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${config.ADIN_API_BASE_URL}/chat`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${config.ADIN_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        logger.warn("adin.complete.http_error", {
          status: response.status,
          body: errorBody.slice(0, 500),
        });
        return { ok: false, text: null, reason: `http_${response.status}` };
      }

      const text = await readAsText(response);
      if (!text) {
        return { ok: false, text: null, reason: "empty_response" };
      }

      const maxChars = options.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
      const trimmed = text.length > maxChars ? text.slice(0, maxChars).trim() : text;
      return { ok: true, text: trimmed, reason: null };
    } catch (error) {
      const reason =
        error instanceof Error && error.name === "AbortError"
          ? "timeout"
          : error instanceof Error
            ? error.message
            : "unknown";
      logger.warn("adin.complete.error", { reason });
      return { ok: false, text: null, reason };
    } finally {
      clearTimeout(timer);
    }
  },
};
