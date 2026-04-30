import { createGateway, type GatewayProvider } from "@ai-sdk/gateway";
import { generateText } from "ai";

import { config, resolveGatewayApiKey } from "../config.js";
import { logger } from "../logger.js";

/**
 * Vercel AI Gateway client used for SMS replies. Mirrors the public surface of
 * `apps/api/src/adin/client.ts` (`isConfigured()`, `complete(...)` returning
 * `{ ok, text, reason }`) so the router stays drop-in swappable. Unlike ADIN's
 * public chat API, the Gateway accepts a real `system` prompt — callers pass
 * the SMS voice in `systemPrompt` and the parsed-want context in `userMessage`.
 */
export interface GatewayCompleteOptions {
  systemPrompt: string;
  userMessage: string;
  /** Override the default SMS model. Defaults to `config.GATEWAY_SMS_MODEL`. */
  model?: string;
  /** SMS-safe output cap. Default 320 chars. */
  maxOutputChars?: number;
  /** Wall-clock cap for the whole call. Default 30s. */
  timeoutMs?: number;
}

export interface GatewayCompleteResult {
  ok: boolean;
  text: string | null;
  reason: string | null;
  model: string | null;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_CHARS = 320;
/** ~4 chars per token average; cap output tokens loosely above the char cap. */
const DEFAULT_MAX_OUTPUT_TOKENS = 200;

let cachedGateway: GatewayProvider | null = null;
let cachedGatewayKey: string | null = null;

function getGateway(): GatewayProvider | null {
  const apiKey = resolveGatewayApiKey();
  if (!apiKey) return null;
  if (cachedGateway && cachedGatewayKey === apiKey) return cachedGateway;
  cachedGateway = createGateway({ apiKey });
  cachedGatewayKey = apiKey;
  return cachedGateway;
}

function trimToSms(text: string, maxChars: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxChars) return collapsed;
  return `${collapsed.slice(0, maxChars - 1).trimEnd()}…`;
}

export const gatewayClient = {
  isConfigured(): boolean {
    return Boolean(resolveGatewayApiKey());
  },

  async complete(options: GatewayCompleteOptions): Promise<GatewayCompleteResult> {
    const provider = getGateway();
    if (!provider) {
      return { ok: false, text: null, reason: "gateway_api_key_missing", model: null };
    }

    const modelId = options.model ?? config.GATEWAY_SMS_MODEL;
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await generateText({
        model: provider(modelId),
        system: options.systemPrompt,
        prompt: options.userMessage,
        maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
        abortSignal: controller.signal,
      });

      const raw = (result.text ?? "").trim();
      if (!raw) {
        return { ok: false, text: null, reason: "empty_response", model: modelId };
      }

      const maxChars = options.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
      return {
        ok: true,
        text: trimToSms(raw, maxChars),
        reason: null,
        model: modelId,
      };
    } catch (caught) {
      const reason =
        caught instanceof Error && caught.name === "AbortError"
          ? "timeout"
          : caught instanceof Error
            ? caught.message
            : "unknown";
      logger.warn("gateway.complete.error", { reason, model: modelId });
      return { ok: false, text: null, reason, model: modelId };
    } finally {
      clearTimeout(timer);
    }
  },
};
