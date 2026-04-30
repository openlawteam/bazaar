import { config } from "../config.js";
import { logger } from "../logger.js";
import { outboundRepo } from "../db/repos.js";

export interface SendOptions {
  toPhoneNumber: string;
  body: string;
  userId?: string;
  idempotencyKey?: string;
  preferredService?: "iMessage" | "RCS" | "SMS";
}

export interface SendResult {
  ok: boolean;
  status: "sent" | "demo" | "failed";
  providerMessageId: string | null;
  errorMessage: string | null;
}

interface CreateChatResponse {
  id?: string;
  message?: { id?: string };
}

interface SendMessageResponse {
  id?: string;
  message?: { id?: string };
}

export const linqClient = {
  async send(options: SendOptions): Promise<SendResult> {
    const apiKey = config.LINQ_API_KEY;
    const fromNumber = config.LINQ_FROM_PHONE_NUMBER;

    const queued = outboundRepo.record({
      userId: options.userId ?? null,
      toPhoneNumber: options.toPhoneNumber,
      body: options.body,
      status: config.DEMO_MODE || !apiKey || !fromNumber ? "demo" : "queued",
      providerMessageId: null,
      errorMessage: null,
      sentAt: null,
    });

    if (config.DEMO_MODE || !apiKey || !fromNumber) {
      logger.info("linq.outbound.demo", {
        toPhoneNumber: options.toPhoneNumber,
        body: options.body,
      });
      return { ok: true, status: "demo", providerMessageId: null, errorMessage: null };
    }

    try {
      const response = await fetch(`${config.LINQ_API_BASE_URL}/chats`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromNumber,
          to: [options.toPhoneNumber],
          message: {
            preferred_service: options.preferredService,
            parts: [{ type: "text", value: options.body }],
            idempotency_key: options.idempotencyKey ?? queued.id,
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error("linq.outbound.failed", {
          status: response.status,
          body: errorBody,
        });
        outboundRepo.markFailed(queued.id, `${response.status}: ${errorBody}`);
        return {
          ok: false,
          status: "failed",
          providerMessageId: null,
          errorMessage: errorBody,
        };
      }

      const json = (await response.json()) as CreateChatResponse | SendMessageResponse;
      const providerMessageId = json.message?.id ?? json.id ?? null;
      outboundRepo.markSent(queued.id, providerMessageId);
      return { ok: true, status: "sent", providerMessageId, errorMessage: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      logger.error("linq.outbound.error", { message });
      outboundRepo.markFailed(queued.id, message);
      return { ok: false, status: "failed", providerMessageId: null, errorMessage: message };
    }
  },
};
