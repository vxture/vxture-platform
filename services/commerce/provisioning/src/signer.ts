/**
 * signer.ts - Stripe-style HMAC webhook signature (P4)
 * @package @vxture/service-provisioning
 *
 * Header: `X-Vxture-Signature: t=<unix>,v1=<hex(HMAC_SHA256(secret, "{t}.{body}"))>`.
 * Pure functions (no IO) — see docs/design/identity-platform-rp-integration.md §3.3/§4.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface WebhookSignature {
  timestamp: number;
  /** the `X-Vxture-Signature` header value */
  header: string;
}

/** Compute v1 = hex(HMAC_SHA256(secret, "{t}.{rawBody}")). */
export function computeV1(
  secret: string,
  rawBody: string,
  timestamp: number,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}

/** Build the signature header for an outgoing delivery. */
export function signWebhook(
  secret: string,
  rawBody: string,
  timestamp: number,
): WebhookSignature {
  const v1 = computeV1(secret, rawBody, timestamp);
  return { timestamp, header: `t=${timestamp},v1=${v1}` };
}

/** Parse `t=...,v1=...` (order-insensitive). Returns null when malformed. */
export function parseSignatureHeader(
  header: string,
): { t: number; v1: string } | null {
  let t: number | null = null;
  let v1: string | null = null;
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") {
      const n = Number(value);
      if (Number.isFinite(n)) t = n;
    } else if (key === "v1") {
      v1 = value;
    }
  }
  return t != null && v1 ? { t, v1 } : null;
}

/** Constant-time hex comparison (length-safe). */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/**
 * Verify a received signature against the raw body. Reference implementation
 * for tests / a mock receiver; the real receivers live in external app repos.
 */
export function verifyWebhook(
  secret: string,
  rawBody: string,
  header: string,
  nowSec: number,
  toleranceSec = 300,
): boolean {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;
  if (Math.abs(nowSec - parsed.t) > toleranceSec) return false;
  const expected = computeV1(secret, rawBody, parsed.t);
  return safeEqualHex(expected, parsed.v1);
}
