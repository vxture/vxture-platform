/**
 * auth.utils.ts - token extraction and parsing utilities
 * @package @vxture/core-auth
 * @description
 *   Bearer token extraction from header, JWT expiry checking, and other utility functions.
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

// ============================================================================
// Bearer Token Extraction
// ============================================================================

/**
 * Extracts Bearer token from Authorization header
 *
 * @example
 * extractBearerToken('Bearer eyJhbGci...')  // → 'eyJhbGci...'
 * extractBearerToken('invalid')             // → undefined
 * extractBearerToken(undefined)             // → undefined
 */
export function extractBearerToken(
  authHeader: string | null | undefined,
): string | undefined {
  if (!authHeader) return undefined;
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return undefined;
  return token;
}

/**
 * Extracts Bearer token from request headers object
 * Compatible with Express req.headers and Web API Headers
 *
 * @example
 * extractBearerTokenFromHeaders({ authorization: 'Bearer eyJ...' })
 */
export function extractBearerTokenFromHeaders(
  headers:
    | Record<string, string | string[] | undefined>
    | { get(name: string): string | null },
): string | undefined {
  let authHeader: string | null | undefined;

  if (typeof (headers as { get?: unknown }).get === "function") {
    // Web API Headers / standard get() interface
    authHeader = (headers as { get(name: string): string | null }).get(
      "authorization",
    );
  } else {
    // Express req.headers (object form)
    const raw = (headers as Record<string, string | string[] | undefined>)[
      "authorization"
    ];
    authHeader = Array.isArray(raw) ? raw[0] : raw;
  }

  return extractBearerToken(authHeader);
}

// ============================================================================
// Token Content Utilities
// ============================================================================

/**
 * Checks if JWT has expired (without verifying signature, only checks exp field)
 * Used for quick filtering of obviously expired tokens, formal verification still requires jwtService.verify()
 */
export function isTokenExpired(token: string): boolean {
  try {
    const [, payload] = token.split(".");
    if (!payload) return true;
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: number };
    if (!decoded.exp) return false;
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

/**
 * Gets token remaining valid time (milliseconds)
 * Returns negative number if expired
 */
export function getTokenRemainingMs(token: string): number {
  try {
    const [, payload] = token.split(".");
    if (!payload) return -1;
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: number };
    if (!decoded.exp) return Infinity;
    return decoded.exp * 1000 - Date.now();
  } catch {
    return -1;
  }
}
