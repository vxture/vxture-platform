/**
 * page.tsx - 注册入口
 * @package @vxture/website
 * @layer Presentation
 * @category Pages
 *
 * Registration is consolidated onto the central accounts surface: the phone-code
 * login flow is "login-is-registration" (a new phone auto-creates the account +
 * a personal org, identity-platform-architecture.md §2), so website renders no signup form.
 * This entry redirects to the same RP login endpoint as signin.
 * See docs/design/identity-platform-implementation.md §3 (16b), D-BA.
 */

"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { buildRpLoginUrl } from "@/api/auth.api";

export default function SignupPage() {
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
