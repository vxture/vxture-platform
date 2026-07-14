/**
 * cookie.ts — central-session cookie spec (pure; dependency-free for testing).
 *
 * docs/design/identity-platform-architecture.md §3: the tenant-realm session cookie `vx_sid`
 * is set on `.vxture.com` (Domain shared across subdomains for SSO); the operator
 * realm uses `vx_sid_op` host-only (hard isolation). Secure/HttpOnly/SameSite=Lax.
 */

export interface SidCookieOptions {
  httpOnly: true;
  secure: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
  domain?: string;
}

export interface SidCookie {
  name: string;
  value: string;
  options: SidCookieOptions;
}

export const SID_COOKIE_NAME = {
  tenant: "vx_sid",
  operator: "vx_sid_op",
} as const;

/**
 * Build the Set-Cookie spec for a central session.
 * - tenant realm → `vx_sid`, Domain = platformCookieDomain (e.g. `.vxture.com`)
 * - operator realm → `vx_sid_op`, host-only (no Domain)
 */
export function buildSidCookie(input: {
  sid: string;
  realm: "customer" | "workforce";
  maxAgeSeconds: number;
  platformCookieDomain?: string | null;
}): SidCookie {
  const isOperator = input.realm === "workforce";
  const options: SidCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: input.maxAgeSeconds * 1000,
  };
  // operator is host-only (hard isolation); tenant shares the parent domain.
  if (!isOperator && input.platformCookieDomain) {
    options.domain = input.platformCookieDomain;
  }
  return {
    name: isOperator ? SID_COOKIE_NAME.operator : SID_COOKIE_NAME.tenant,
    value: input.sid,
    options,
  };
}
