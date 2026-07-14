"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { buildRpLoginUrl } from "@/api/admin-bff";

/**
 * Sign-in entry. The Identity Platform centralizes the login surface at the IdP
 * (accounts.vxture.com), so admin no longer renders its own credential form: it
 * redirects to the admin-bff RP login endpoint, which 302s to the IdP authorize
 * page and on to the accounts operator login UI. On success the RP callback sets
 * the opaque session cookie and returns the browser to `next`. Operators reach
 * admin only through the edge gate (Cloudflare Access), so by this point the IdP
 * operator session usually exists and the redirect is SSO-silent.
 * See identity-platform-architecture.md §9 and docs/design/identity-platform-operator.md.
 */
export default function LoginPage() {
  const params = useSearchParams();

  useEffect(() => {
    const next = params.get("next") || "/";
    const returnTo = new URL(next, window.location.origin).toString();
    window.location.assign(buildRpLoginUrl(returnTo));
  }, [params]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p>正在跳转到登录…</p>
    </main>
  );
}
