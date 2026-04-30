import { z } from "zod";

const handleSchema = z.object({
  handle: z.string(),
  id: z.string(),
  is_me: z.boolean().optional(),
  service: z.string().optional(),
  status: z.string().optional(),
});

const textPartSchema = z.object({
  type: z.literal("text"),
  value: z.string(),
});

const mediaPartSchema = z.object({
  type: z.literal("media"),
  url: z.string().url().optional(),
  attachment_id: z.string().optional(),
  filename: z.string().optional(),
  mime_type: z.string().optional(),
});

const linkPartSchema = z.object({
  type: z.literal("link"),
  value: z.string(),
});

const partSchema = z.discriminatedUnion("type", [textPartSchema, mediaPartSchema, linkPartSchema]);

const messageReceivedDataV2 = z.object({
  id: z.string(),
  direction: z.literal("inbound"),
  sender_handle: handleSchema,
  parts: z.array(partSchema),
  chat: z
    .object({
      id: z.string(),
      is_group: z.boolean().optional(),
      owner_handle: handleSchema.optional(),
    })
    .optional(),
  sent_at: z.string().optional(),
  service: z.string().optional(),
});

const messageReceivedDataV1 = z.object({
  chat_id: z.string(),
  from: z.string(),
  from_handle: handleSchema,
  is_from_me: z.boolean().optional(),
  is_group: z.boolean().optional(),
  message: z.object({
    id: z.string(),
    parts: z.array(partSchema),
    sent_at: z.string().optional(),
  }),
  service: z.string().optional(),
});

export const linqWebhookEnvelopeSchema = z.object({
  api_version: z.string().optional(),
  webhook_version: z.string().optional(),
  event_type: z.string(),
  event_id: z.string(),
  created_at: z.string().optional(),
  trace_id: z.string().optional(),
  partner_id: z.string().optional(),
  data: z.unknown(),
});

export type LinqWebhookEnvelope = z.infer<typeof linqWebhookEnvelopeSchema>;

export interface InboundMessage {
  eventId: string;
  messageId: string;
  chatId: string | null;
  fromHandle: string;
  text: string;
  service: string | null;
  receivedAt: string;
}

export function parseInboundMessage(envelope: LinqWebhookEnvelope): InboundMessage | null {
  if (envelope.event_type !== "message.received") return null;

  const v2 = messageReceivedDataV2.safeParse(envelope.data);
  if (v2.success) {
    const text = v2.data.parts
      .filter((part): part is { type: "text"; value: string } => part.type === "text")
      .map((part) => part.value)
      .join(" ")
      .trim();
    if (!text) return null;
    return {
      eventId: envelope.event_id,
      messageId: v2.data.id,
      chatId: v2.data.chat?.id ?? null,
      fromHandle: v2.data.sender_handle.handle,
      text,
      service: v2.data.service ?? null,
      receivedAt: v2.data.sent_at ?? envelope.created_at ?? new Date().toISOString(),
    };
  }

  const v1 = messageReceivedDataV1.safeParse(envelope.data);
  if (v1.success) {
    if (v1.data.is_from_me) return null;
    const text = v1.data.message.parts
      .filter((part): part is { type: "text"; value: string } => part.type === "text")
      .map((part) => part.value)
      .join(" ")
      .trim();
    if (!text) return null;
    return {
      eventId: envelope.event_id,
      messageId: v1.data.message.id,
      chatId: v1.data.chat_id,
      fromHandle: v1.data.from_handle.handle,
      text,
      service: v1.data.service ?? null,
      receivedAt: v1.data.message.sent_at ?? envelope.created_at ?? new Date().toISOString(),
    };
  }

  return null;
}
