import { z } from "zod";

export const intentMessageSchema = z.object({
  type: z.literal("INTENT"),
  intentId: z.string(),
  parentId: z.string().default("root"),
  senderId: z.string(),
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.number().optional(),
});

export const projectedPromiseActSchema = z.object({
  type: z.enum(["PROMISE", "ACCEPT", "COMPLETE"]),
  parentId: z.string(),
  senderId: z.string(),
  promiseId: z.string().optional(),
  intentId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.number().optional(),
});

export const scanResultSchema = z.object({
  spaceId: z.string(),
  latestSeq: z.number(),
  messages: z.array(z.union([intentMessageSchema, projectedPromiseActSchema])),
});

export type IntentMessage = z.infer<typeof intentMessageSchema>;
export type ProjectedPromiseAct = z.infer<typeof projectedPromiseActSchema>;
export type ScanResult = z.infer<typeof scanResultSchema>;

export interface SpacebaseClient {
  post(message: IntentMessage | ProjectedPromiseAct): Promise<{ intentId?: string; seq?: number }>;
  scan(spaceId: string, since?: number): Promise<ScanResult>;
  enter(intentId: string, since?: number): Promise<ScanResult>;
  postAndConfirm(message: IntentMessage | ProjectedPromiseAct): Promise<{ intentId?: string; seq: number }>;
}

export function createWantIntent(input: {
  intentId: string;
  senderId: string;
  parentId?: string;
  content: string;
  wantId: string;
  userId: string;
}): IntentMessage {
  return {
    type: "INTENT",
    intentId: input.intentId,
    parentId: input.parentId ?? "root",
    senderId: input.senderId,
    payload: {
      kind: "buyer-want",
      content: input.content,
      wantId: input.wantId,
      userId: input.userId,
    },
    timestamp: Date.now(),
  };
}
