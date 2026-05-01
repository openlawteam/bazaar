import { nanoid } from "nanoid";

import { createWantIntent, type IntentMessage, type ScanResult } from "@/lib/spacebase-client";

import { config } from "../config";
import { logger } from "../logger";

export interface PostWantInput {
  userId: string;
  wantId: string;
  content: string;
  parentSpaceId?: string;
}

export interface BazaarSpacebaseClient {
  postWant(input: PostWantInput): Promise<{ intentId: string; mode: "mock" | "http" }>;
  scanWant(intentId: string, since?: number): Promise<ScanResult>;
}

function buildIntent(input: PostWantInput): IntentMessage {
  return createWantIntent({
    intentId: `intent-${nanoid(20)}`,
    senderId: config.SPACEBASE_AGENT_PRINCIPAL ?? "bazaar-dev",
    parentId: input.parentSpaceId ?? config.SPACEBASE_HOME_SPACE_ID ?? "root",
    content: input.content,
    wantId: input.wantId,
    userId: input.userId,
  });
}

const mockClient: BazaarSpacebaseClient = {
  async postWant(input) {
    const intent = buildIntent(input);
    logger.info("spacebase.mock.post", {
      intentId: intent.intentId,
      parentId: intent.parentId,
      content: input.content,
    });
    return { intentId: intent.intentId, mode: "mock" };
  },
  async scanWant(intentId) {
    return { spaceId: intentId, latestSeq: 0, messages: [] };
  },
};

const httpClient: BazaarSpacebaseClient = {
  async postWant(input) {
    const intent = buildIntent(input);
    logger.warn("spacebase.http.not_implemented", {
      intentId: intent.intentId,
      note: "Wire the actual Spacebase signup/post path before relying on http mode.",
    });
    return { intentId: intent.intentId, mode: "http" };
  },
  async scanWant(intentId) {
    return { spaceId: intentId, latestSeq: 0, messages: [] };
  },
};

export function createSpacebaseClient(): BazaarSpacebaseClient {
  if (config.SPACEBASE_AGENT_PRINCIPAL && config.SPACEBASE_HOME_SPACE_ID) {
    return httpClient;
  }
  return mockClient;
}
