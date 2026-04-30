import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { z } from "zod";

import { defaultAgentRoles } from "@bazaar/agents";
import { wantSchema } from "@bazaar/core";

const app = new Hono();

const inboundMessageSchema = z.object({
  from: z.string(),
  body: z.string(),
  messageId: z.string().optional(),
});

app.get("/health", (context) =>
  context.json({
    ok: true,
    service: "bazaar-api",
    agentRoles: defaultAgentRoles,
  }),
);

app.post("/webhooks/linq/inbound", async (context) => {
  const payload = inboundMessageSchema.parse(await context.req.json());

  return context.json(
    {
      accepted: true,
      next: "Greg wires Linq verification, OTP, and conversation state here.",
      message: {
        from: payload.from,
        body: payload.body,
        messageId: payload.messageId,
      },
    },
    202,
  );
});

app.post("/wants", async (context) => {
  const want = wantSchema.parse(await context.req.json());

  return context.json({
    accepted: true,
    next: "Post this want to Spacebase and fan out to shopping agents.",
    want,
  });
});

const port = Number(process.env.PORT ?? 8787);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Bazaar API listening on http://localhost:${info.port}`);
  },
);
