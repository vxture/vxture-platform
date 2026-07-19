/**
 * Server-side console-bff access — the foundation for building the initial
 * session snapshot during SSR (workplan #7). Import only from Server Components
 * / route handlers: it uses next/headers, which is server-only.
 *
 * The browser-facing client (src/api/console-bff.ts) talks to
 * NEXT_PUBLIC_CONSOLE_BFF_URL over same-origin; the server cannot reuse that
 * (it is a public origin that would hairpin out through Cloudflare/nginx and
 * back). The server must reach console-bff over the internal container address
 * and forward the caller's cookies (including the HttpOnly RP session) so the
 * BFF auth/tenant/permission middleware sees the logged-in user.
 */

import { cookies, headers } from "next/headers";

const INTERNAL_BFF_FALLBACK = "http://localhost:3021";

// Mirror of ConsoleSessionProvider's ACTIVE_TENANT_COOKIE — kept in sync by name.
const ACTIVE_TENANT_COOKIE = "vx-console-active-tenant";

/**
 * Base URL the console server uses to reach console-bff.
 *
 * Production MUST set CONSOLE_BFF_INTERNAL_URL to the internal container address
 * (e.g. http://vx-platform-console-bff:3021). Without it this falls back to the
 * public browser URL and finally localhost, which only works in dev.
 */
export function resolveInternalBffBaseUrl(): string {
  const raw =
    process.env.CONSOLE_BFF_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_CONSOLE_BFF_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    INTERNAL_BFF_FALLBACK;
  return raw.trim().replace(/\/+$/, "") || INTERNAL_BFF_FALLBACK;
}

/** The user's selected tenant, read server-side from the mirror cookie. */
export async function readActiveTenantCookie(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACTIVE_TENANT_COOKIE)?.value || undefined;
}

/**
 * Server-side GET to console-bff, forwarding the caller's cookies so the BFF
 * resolves the logged-in user. Returns parsed JSON, or `fallback` on any
 * non-OK / error.
 *
 * IMPORTANT for #7: a fallback/anonymous result must NOT be used to hard-redirect
 * to /signin. The cookie can exist but be expired, in which case the existing
 * client flow performs prompt=none silent SSO (ConsoleSessionProvider). Server
 * code should only use a successful snapshot to seed the provider, and otherwise
 * defer to the client — never short-circuit the auth flow.
 */
export async function fetchBffAsUser<T>(path: string, fallback: T): Promise<T> {
  try {
    const cookieHeader = (await headers()).get("cookie") ?? "";
    const response = await fetch(`${resolveInternalBffBaseUrl()}${path}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
      cache: "no-store",
    });
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}
