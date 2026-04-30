import "dotenv/config";

import { z } from "zod";

function parsePhoneList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:8787"),

  DATA_DIR: z.string().default(".data"),
  SESSION_SECRET: z.string().min(16).default("dev-only-session-secret-change-me"),
  OTP_CODE_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  DEMO_MODE: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => value === true || value === "true"),

  LINQ_API_BASE_URL: z.string().url().default("https://api.linqapp.com/api/partner/v3"),
  LINQ_API_KEY: z.string().optional(),
  LINQ_WEBHOOK_SECRET: z.string().optional(),
  LINQ_FROM_PHONE_NUMBER: z.string().optional(),
  SMS_ALLOWED_PHONE_NUMBERS: z.string().optional().transform(parsePhoneList),
  SMS_TRUSTED_PHONE_NUMBERS: z.string().optional().transform(parsePhoneList),

  ADIN_API_BASE_URL: z.string().url().default("https://adin.chat/api/v1"),
  ADIN_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  SPACEBASE_COMMONS_URL: z.string().url().default("https://spacebase1.differ.ac/commons"),
  SPACEBASE_AGENT_PRINCIPAL: z.string().optional(),
  SPACEBASE_AGENT_LABEL: z.string().default("Bazaar"),
  SPACEBASE_HOME_SPACE_ID: z.string().optional(),
  SPACEBASE_HACKATHON_SUBMISSION_PARENT_ID: z
    .string()
    .default("intent-413e0bc5-d8f3-40e7-afb4-350e220df03c"),
});

const parsed = envSchema.parse(process.env);

export const config = parsed;
export type AppConfig = typeof parsed;

export interface ReadinessReport {
  config: { nodeEnv: string; port: number };
  linq: { configured: boolean; canSend: boolean };
  sms: { allowlistEnabled: boolean; trustedNumberCount: number };
  adin: { configured: boolean };
  spacebase: { configured: boolean; homeSpaceId: string | null };
  demoMode: boolean;
}

export function describeReadiness(): ReadinessReport {
  return {
    config: { nodeEnv: config.NODE_ENV, port: config.PORT },
    linq: {
      configured: Boolean(config.LINQ_WEBHOOK_SECRET),
      canSend: Boolean(config.LINQ_API_KEY && config.LINQ_FROM_PHONE_NUMBER),
    },
    sms: {
      allowlistEnabled:
        config.SMS_ALLOWED_PHONE_NUMBERS.length > 0 || config.SMS_TRUSTED_PHONE_NUMBERS.length > 0,
      trustedNumberCount: config.SMS_TRUSTED_PHONE_NUMBERS.length,
    },
    adin: { configured: Boolean(config.ADIN_API_KEY) },
    spacebase: {
      configured: Boolean(config.SPACEBASE_AGENT_PRINCIPAL),
      homeSpaceId: config.SPACEBASE_HOME_SPACE_ID ?? null,
    },
    demoMode: Boolean(config.DEMO_MODE),
  };
}
