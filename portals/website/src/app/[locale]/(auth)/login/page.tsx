/**
 * page.tsx - 登录入口别名（/login → 同 /signin，收编到 accounts）
 * @package @vxture/website
 *
 * Mirrors /signin: the login surface is centralized at the accounts IdP, so this
 * alias renders no form and redirects to the RP login endpoint.
 * See docs/design/identity-platform-implementation.md §3 (16b).
 */

"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { buildRpLoginUrl } from "@/api/auth.api";

export default function LoginAliasPage() {
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
