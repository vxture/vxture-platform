/**
 * page.tsx - 注册入口别名（/register → 同 /signup，收编到 accounts）
 * @package @vxture/website
 *
 * See docs/design/identity-platform-implementation.md §3 (16b), D-BA.
 */

"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { buildRpLoginUrl } from "@/api/auth.api";

export default function RegisterAliasPage() {
  const params = useSearchParams();

  useEffect(() => {
    const next = params.get("next") || "/";
    const returnTo = new URL(next, window.location.origin).toString();
    window.location.assign(buildRpLoginUrl(returnTo));
  }, [params]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p>正在跳转到登录/注册…</p>
    </main>
  );
}
