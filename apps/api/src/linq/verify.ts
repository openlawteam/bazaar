import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

export interface VerifyInput {
  rawBody: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  secret: string;
  toleranceSeconds?: number;
  now?: () => number;
}

export interface VerifyResult {
  valid: boolean;
  reason?: "missing_headers" | "stale_timestamp" | "bad_signature" | "bad_format";
}

export function verifyLinqSignature(input: VerifyInput): VerifyResult {
  const { rawBody, timestampHeader, signatureHeader, secret } = input;
  if (!timestampHeader || !signatureHeader) {
    return { valid: false, reason: "missing_headers" };
  }

  const tolerance = input.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  const now = input.now ? input.now() : Date.now();
  const timestampMs = Number(timestampHeader) * 1000;
  if (!Number.isFinite(timestampMs)) {
    return { valid: false, reason: "bad_format" };
  }
  if (Math.abs(now - timestampMs) > tolerance * 1000) {
    return { valid: false, reason: "stale_timestamp" };
  }

  const signedData = `${timestampHeader}.${rawBody}`;
  const expectedHex = createHmac("sha256", secret).update(signedData).digest("hex");
  const provided = signatureHeader.trim();
  if (provided.length !== expectedHex.length) {
    return { valid: false, reason: "bad_signature" };
  }
  try {
    const ok = timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(provided, "hex"));
    return ok ? { valid: true } : { valid: false, reason: "bad_signature" };
  } catch {
    return { valid: false, reason: "bad_format" };
  }
}
