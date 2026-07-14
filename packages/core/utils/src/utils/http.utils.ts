/**
 * http.utils.ts - Client-IP extraction (shared utility)
 * @package @vxture/core-utils
 * @layer Shared
 * @category utils
 *
 * @description
 *   Resolve the real client IP for a request that has passed through this
 *   deployment's nginx edge (see deploy/nginx/nginx.conf +
 *   deploy/nginx/snippets/cloudflare-realip.conf):
 *     - nginx validates the connecting peer is genuine Cloudflare and rewrites
 *       `$remote_addr` to the true client IP (sourced from Cloudflare's
 *       `CF-Connecting-IP`, which a client cannot forge past Cloudflare's edge);
 *     - every site config then sets `X-Real-IP: $remote_addr` (trustworthy) and
 *       `X-Forwarded-For: $proxy_add_x_forwarded_for`, which APPENDS the
 *       trustworthy value to whatever XFF the client already sent rather than
 *       stripping it — so a client-forged XFF segment arrives FIRST and the
 *       real IP arrives LAST.
 *   Trust order is therefore: X-Real-IP -> CF-Connecting-IP (defense-in-depth
 *   for paths that might bypass nginx's rewrite, e.g. local dev) -> the LAST
 *   segment of X-Forwarded-For (never the first — the opposite of the naive
 *   convention) -> the raw socket peer -> "unknown".
 *
 * @author AI-Generated
 * @date 2026-07-13
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Minimal structural request shape this utility needs. Deliberately
 * framework-agnostic (no Express/NestJS import) so it works against any BFF's
 * `Request` type without a hard dependency.
 */
export interface ClientIpRequest {
  readonly headers: Record<string, string | string[] | undefined>;
  readonly socket?: { readonly remoteAddress?: string | undefined } | undefined;
  readonly connection?:
    | { readonly remoteAddress?: string | undefined }
    | undefined;
}

// ============================================================================
// Functions
// ============================================================================

/** First element when a header arrives as an array (per Node's http types), else the string itself. */
function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Resolve the real client IP per this deployment's nginx/Cloudflare topology.
 *
 * Trust order:
 *   1. `X-Real-IP` — single value, already realip-corrected by nginx.
 *   2. `CF-Connecting-IP` — defense-in-depth fallback (e.g. local dev, or any
 *      path that might bypass nginx's X-Real-IP rewrite).
 *   3. `X-Forwarded-For` — the LAST non-empty comma-separated segment (NOT the
 *      first, which a client can forge before reaching Cloudflare/nginx).
 *   4. The raw TCP peer (`socket.remoteAddress` / `connection.remoteAddress`).
 *   5. `"unknown"` when nothing usable is found.
 *
 * @param req - minimal structural request (headers + optional socket/connection)
 * @returns the resolved client IP, or "unknown" as a last resort
 */
export function extractClientIp(req: ClientIpRequest): string {
  const realIp = headerValue(req.headers["x-real-ip"]);
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const cfConnectingIp = headerValue(req.headers["cf-connecting-ip"]);
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  const forwardedFor = headerValue(req.headers["x-forwarded-for"]);
  if (forwardedFor && forwardedFor.trim()) {
    const segments = forwardedFor
      .split(",")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) {
      return lastSegment;
    }
  }

  const socketAddress =
    req.socket?.remoteAddress ?? req.connection?.remoteAddress;
  if (socketAddress && socketAddress.trim()) {
    return socketAddress.trim();
  }

  return "unknown";
}
