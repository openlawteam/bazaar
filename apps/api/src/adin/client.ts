import { randomUUID } from "node:crypto";

import { config } from "../config.js";
import { logger } from "../logger.js";

export interface AdinUserMessage {
  text: string;
}

export interface AdinCompleteOptions {
  /** Single-turn user message. The public ADIN chat API does not accept a caller-controlled
   * system prompt — voice and behavior instructions need to be packaged inside the user text. */
  userMessage: string;
  /** Optional UUID conversation id; one is generated if omitted. */
  conversationId?: string;
  /** Hard cap on the returned text. SMS messages should stay under 320 chars. */
  maxOutputChars?: number;
  /** Wall-clock cap for the whole call. ADIN's orchestrator can take a while; default 30s. */
  timeoutMs?: number;
  /** Workspace context. "personal" is the only one that always works for v1 keys. */
  workspace?: "personal" | "network";
}

export interface AdinCompleteResult {
  ok: boolean;
  text: string | null;
  reason: string | null;
  conversationId: string | null;
}

interface UiTextDeltaChunk {
  type: "text-delta";
  delta?: unknown;
  textDelta?: unknown;
}

interface UiTextChunk {
  type: "text";
  text?: unknown;
}

interface UiErrorChunk {
  type: "error";
  errorText?: unknown;
  message?: unknown;
}

interface UiFinishChunk {
  type: "finish" | "finish-step";
}

type UiChunk =
  | UiTextDeltaChunk
  | UiTextChunk
  | UiErrorChunk
  | UiFinishChunk
  | { type: string; [key: string]: unknown };

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_CHARS = 320;

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function extractDeltaFromChunk(chunk: UiChunk): { kind: "text"; value: string } | { kind: "error"; value: string } | null {
  if (chunk.type === "text-delta") {
    const fromDelta = asString((chunk as UiTextDeltaChunk).delta);
    if (fromDelta) return { kind: "text", value: fromDelta };
    const fromTextDelta = asString((chunk as UiTextDeltaChunk).textDelta);
    if (fromTextDelta) return { kind: "text", value: fromTextDelta };
    return null;
  }
  if (chunk.type === "text") {
    const fromText = asString((chunk as UiTextChunk).text);
    if (fromText) return { kind: "text", value: fromText };
    return null;
  }
  if (chunk.type === "error") {
    const errorText =
      asString((chunk as UiErrorChunk).errorText) ??
      asString((chunk as UiErrorChunk).message) ??
      "stream_error";
    return { kind: "error", value: errorText };
  }
  return null;
}

async function readUiMessageStream(response: Response): Promise<{ text: string; error: string | null }> {
  const reader = response.body?.getReader();
  if (!reader) return { text: "", error: "no_response_body" };

  const decoder = new TextDecoder();
  const collected: string[] = [];
  let firstError: string | null = null;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      const event = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      separator = buffer.indexOf("\n\n");

      for (const line of event.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice("data:".length).trim();
        if (!payload || payload === "[DONE]") continue;
        let chunk: UiChunk;
        try {
          chunk = JSON.parse(payload) as UiChunk;
        } catch {
          continue;
        }
        const extracted = extractDeltaFromChunk(chunk);
        if (!extracted) continue;
        if (extracted.kind === "error") {
          if (!firstError) firstError = extracted.value;
        } else {
          collected.push(extracted.value);
        }
      }
    }
  }

  return { text: collected.join("").trim(), error: firstError };
}

function trimToSms(text: string, maxChars: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxChars) return collapsed;
  return `${collapsed.slice(0, maxChars - 1).trimEnd()}…`;
}

function buildUiMessages(userText: string): unknown[] {
  return [
    {
      role: "user",
      parts: [{ type: "text", text: userText }],
    },
  ];
}

export const adinClient = {
  isConfigured(): boolean {
    const key = config.ADIN_API_KEY;
    return typeof key === "string" && /^adin_(live|test)_/.test(key);
  },

  async complete(options: AdinCompleteOptions): Promise<AdinCompleteResult> {
    const apiKey = config.ADIN_API_KEY;
    if (!apiKey) {
      return { ok: false, text: null, reason: "adin_api_key_missing", conversationId: null };
    }
    if (!/^adin_(live|test)_/.test(apiKey)) {
      return { ok: false, text: null, reason: "adin_api_key_malformed", conversationId: null };
    }

    const conversationId = options.conversationId ?? randomUUID();
    const idempotencyKey = randomUUID();
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${config.ADIN_API_BASE_URL}/chat`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream, application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          messages: buildUiMessages(options.userMessage),
          conversationId,
          workspace: options.workspace ?? "personal",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        logger.warn("adin.complete.http_error", {
          status: response.status,
          body: errorBody.slice(0, 500),
        });
        return {
          ok: false,
          text: null,
          reason: `http_${response.status}`,
          conversationId,
        };
      }

      const { text, error } = await readUiMessageStream(response);
      if (error && !text) {
        return { ok: false, text: null, reason: error, conversationId };
      }
      if (!text) {
        return { ok: false, text: null, reason: "empty_response", conversationId };
      }

      const maxChars = options.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
      return {
        ok: true,
        text: trimToSms(text, maxChars),
        reason: null,
        conversationId,
      };
    } catch (caught) {
      const reason =
        caught instanceof Error && caught.name === "AbortError"
          ? "timeout"
          : caught instanceof Error
            ? caught.message
            : "unknown";
      logger.warn("adin.complete.error", { reason });
      return { ok: false, text: null, reason, conversationId: null };
    } finally {
      clearTimeout(timer);
    }
  },
};
