"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { buildRpLoginUrl } from "@/api/auth.api";

/**
 * Redirects to the centralized RP login endpoint, preserving the `next` return
 * target from the query string. The login surface lives at the accounts IdP, so
 * the website's /login /signin /register /signup entries render no form — they
 * all funnel here.
 *
 * Reads useSearchParams, so it must be rendered inside a <Suspense> boundary;
 * that keeps its host route statically prerenderable instead of opting the whole
 * page out of static generation.
 */
export function RpLoginRedirect({ message }: { message: string }) {
  const params = useSearchParams();

  useEffect(() => {
    const next = params.get("next") || "/";
    const returnTo = new URL(next, window.location.origin).toString();
    window.location.assign(buildRpLoginUrl(returnTo));
  }, [params]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p>{message}</p>
    </main>
  );
}
