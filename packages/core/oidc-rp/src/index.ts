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
 * Resolve the RP session cookie name.
 *
 * Two things vary:
 *
 * `secure` — the `__Host-` prefix mandates Secure, so over local http the prefix
 * is dropped or the browser refuses to store the cookie. That failure is
 * unusually convincing: the server side succeeds end to end (code exchanged,
 * session in redis, last_login_at updated) and only the browser comes away with
 * nothing, so the user is bounced back to the login page and simply tries again.
 * Setter (router) and readers (middleware, session endpoint) must agree on this
 * flag or they will look at different names.
 *
 * `app` — the OIDC client id (admin / console / opera / website), appended so
 * each portal owns its own cookie. In production each portal has its own host
 * and `__Host-` is host-scoped, so a shared name was safe there. Locally all
 * four are on `localhost` and **cookies ignore the port**, so one shared name
 * means console's session cookie is visible to admin: admin's middleware, which
 * only checks whether the cookie exists, then treats the request as
 * authenticated, renders, and gets a 401 from its own BFF — the flash we just
 * removed, back again. The BFFs themselves stay safe either way (session stores
 * are per-app redis keyspaces, so a foreign id simply misses), which is why this
 * shows up as an experience bug rather than an authorization one.
 *
 * Required rather than optional: an omitted app would silently restore the
 * shared name, and this is precisely the kind of default nobody revisits.
 */
export function rpSessionCookieName(secure: boolean, app: string): string {
  const base = secure ? RP_SESSION_COOKIE : RP_SESSION_COOKIE_INSECURE;
  return `${base}_${app}`;
}
