/**
 * index.ts - @vxture/core-oidc-rp package entry
 * @package @vxture/core-oidc-rp
 * @description
 *   OIDC Relying Party toolkit: RP session model, PKCE/state primitives, and the
 *   pluggable OidcRpClient contract. Concrete client + RP session store + NestJS
 *   middleware land in subsequent P1 slices. See docs/design/identity-platform-rp-integration.md.
 */
export type {
  OidcRpConfig,
  OidcTokenSet,
  RpSession,
  RpUser,
  OidcIdClaims,
  OidcAuthRequest,
  OidcRpClient,
} from "./types";

export { mapAccessClaims, stripSubPrefix } from "./claims";

export { generatePkce, pkceChallenge, randomToken, safeReturnTo } from "./pkce";
export type { PkcePair } from "./pkce";

export { RpSessionStore } from "./rp-session.store";
export type { RpRedis } from "./rp-session.store";

export { HttpOidcRpClient } from "./http-client";

export { RpAuthService } from "./rp-auth.service";
export type { RpAuthOutcome } from "./rp-auth.service";

/** Browser cookie carrying only the opaque RP session id (tokens stay server-side). */
export const RP_SESSION_COOKIE = "__Host-vx_rp_session";

/** Cookie name without the __Host- prefix, for local http dev (Secure absent). */
export const RP_SESSION_COOKIE_INSECURE = "vx_rp_session";

/**
 * Resolve the RP session cookie name. The `__Host-` prefix mandates Secure, so
 * over local http (secure=false) we drop the prefix so the browser will store
 * it; prod https keeps `__Host-`+Secure. The setter (router) and reader
 * (middleware/session) must pass the same `secure` so the names agree.
 */
export function rpSessionCookieName(secure: boolean): string {
  return secure ? RP_SESSION_COOKIE : RP_SESSION_COOKIE_INSECURE;
}
