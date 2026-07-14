/**
 * pkce.ts - PKCE + state/nonce primitives for the RP
 * @package @vxture/core-oidc-rp
 */
import { createHash, randomBytes } from "node:crypto";

/** A PKCE pair: the verifier (kept server-side) and the S256 challenge (sent to IdP). */
export interface PkcePair {
  verifier: string;
  challenge: string;
}

/** base64url without padding. */
function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

/** Generate a PKCE verifier + S256 challenge (RFC 7636). */
export function generatePkce(): PkcePair {
  // 32 random bytes → 43-char base64url verifier (within the 43–128 range).
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

/** Compute the S256 challenge for a given verifier. */
export function pkceChallenge(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

/** A URL-safe random token for state / nonce / opaque session ids. */
export function randomToken(bytes = 32): string {
  return base64url(randomBytes(bytes));
}

/**
 * Validate a post-login returnTo against an allowlist of origins (open-redirect
 * guard). Returns the URL if its origin is allowed, else the fallback.
 */
export function safeReturnTo(
  returnTo: string | undefined,
  allowedOrigins: string[],
  fallback: string,
): string {
  if (!returnTo) return fallback;
  try {
    const u = new URL(returnTo);
    return allowedOrigins.includes(u.origin) ? returnTo : fallback;
  } catch {
    return fallback;
  }
}
