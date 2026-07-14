/**
 * totp.ts — RFC 6238 TOTP + RFC 4648 base32 (operator second factor).
 * @package @vxture/service-iam
 * @layer Domain
 *
 * A small, dependency-free TOTP implementation for the operator MFA flow
 * (identity-platform-operator.md §2.1). HMAC-SHA1, 30s step, 6 digits — the
 * Authenticator-App default (Google Authenticator / 1Password / Authy). Pure
 * apart from secret generation (randomBytes); verified against the RFC 6238
 * test vectors. The base32 SECRET is the plaintext shown at enrollment; at rest
 * it is encrypted by the caller (auth-bff), never stored in the clear.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 base32 encode (no padding). */
export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

/** RFC 4648 base32 decode (padding/whitespace tolerant, case-insensitive). */
export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/g, "").replace(/\s/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("invalid base32 character");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Generate a fresh base32 TOTP secret (default 20 random bytes = 160 bits). */
export function generateTotpSecret(byteLength = 20): string {
  return base32Encode(randomBytes(byteLength));
}

/** HOTP (RFC 4226) for a counter — the building block of TOTP. */
function hotp(secret: Buffer, counter: number, digits: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(msg).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return (bin % 10 ** digits).toString().padStart(digits, "0");
}

interface TotpOptions {
  timestamp?: number;
  step?: number;
  digits?: number;
}

/** Generate the TOTP code for a timestamp (epoch seconds; default now). */
export function generateTotp(
  secretBase32: string,
  opts: TotpOptions = {},
): string {
  const step = opts.step ?? 30;
  const digits = opts.digits ?? 6;
  const ts = opts.timestamp ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(ts / step);
  return hotp(base32Decode(secretBase32), counter, digits);
}

/** Constant-time string compare (equal-length digit strings). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verify a presented TOTP code, accepting ±`window` steps of clock drift
 * (default ±1 step = ±30s). Malformed input (wrong length / non-digit) is
 * rejected without touching the secret.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  opts: { window?: number } & TotpOptions = {},
): boolean {
  const digits = opts.digits ?? 6;
  const cleaned = (code ?? "").replace(/\s/g, "");
  if (cleaned.length !== digits || !/^\d+$/.test(cleaned)) return false;

  const step = opts.step ?? 30;
  const window = opts.window ?? 1;
  const ts = opts.timestamp ?? Math.floor(Date.now() / 1000);
  const base = Math.floor(ts / step);
  const secret = base32Decode(secretBase32);
  for (let w = -window; w <= window; w++) {
    if (safeEqual(hotp(secret, base + w, digits), cleaned)) return true;
  }
  return false;
}

/** Build the otpauth:// provisioning URI (rendered as a QR at enrollment). */
export function buildOtpauthUri(input: {
  secret: string;
  accountName: string;
  issuer: string;
  digits?: number;
  step?: number;
}): string {
  const label = encodeURIComponent(`${input.issuer}:${input.accountName}`);
  const params = new URLSearchParams({
    secret: input.secret,
    issuer: input.issuer,
    algorithm: "SHA1",
    digits: String(input.digits ?? 6),
    period: String(input.step ?? 30),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
