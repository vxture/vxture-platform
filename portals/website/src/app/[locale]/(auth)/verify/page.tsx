/**
 * page.tsx - 退役的注册后认证页（verify）
 * @package @vxture/website
 * @layer Presentation
 * @category Pages
 *
 * Dropped (D-BC): registration auto-creates a personal org (identity-platform
 * §13.1) and team orgs are created in console post-login, so there is no
 * post-signup tenant-type selection. The route is kept only to redirect any
 * stale link home. See docs/design/identity-platform-implementation.md §3 (16b).
 */

"use client";

import { useEffect } from "react";

export default function VerifyPage() {
  useEffect(() => {
    window.location.assign("/");
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p>正在跳转…</p>
    </main>
  );
}
