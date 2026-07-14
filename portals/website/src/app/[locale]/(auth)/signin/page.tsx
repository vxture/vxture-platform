/**
 * page.tsx - 登录入口
 * @package @vxture/website
 * @layer Presentation
 * @category Pages
 *
 * Identity Platform centralizes the login surface at the IdP
 * (accounts.vxture.com), so website no longer renders its own credential form:
 * it redirects to the website-bff RP login endpoint, which 302s to the IdP
 * authorize page and on to the accounts login UI. On success the RP callback
 * sets the opaque session cookie and returns the browser to `next`.
 * See docs/design/identity-platform-implementation.md §3 (16a).
 */

"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { buildRpLoginUrl } from "@/api/auth.api";

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
