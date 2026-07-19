"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import type { SessionSnapshot } from "@/entities/console";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  ConsoleSessionProvider,
  useConsoleSession,
} from "@/features/session/ConsoleSessionProvider";
import { TenantProvider } from "@/features/tenant";
import { PortalEntryProvider } from "@/contexts/PortalEntryContext";
import { ConsoleAppShell } from "@/layout/template/ConsoleAppShell";

function ShellFrame({ children }: { children: ReactNode }) {
  const { session, status } = useConsoleSession();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("shell.loading");

  useEffect(() => {
    if (
      status === "ready" &&
      (!session.isAuthenticated || !session.user || !session.tenant)
    ) {
      // Keep the query string: conversion deep links (/subscribe?intent=...)
      // must survive the login round-trip, not just the pathname.
      const search =
        typeof window === "undefined" ? "" : window.location.search;
      router.replace(`/signin?next=${encodeURIComponent(pathname + search)}`);
    }
  }, [
    pathname,
    router,
    session.isAuthenticated,
    session.tenant,
    session.user,
    status,
  ]);

  // 覆盖两种等待态：会话加载中 + token 已过期（useEffect 正在触发重定向）
  if (
    status !== "ready" ||
    !session.isAuthenticated ||
    !session.user ||
    !session.tenant
  ) {
    return (
      <div className="console-loading">
        <span
          className="console-loading__spinner"
          role="status"
          aria-label={t("label")}
        />
      </div>
    );
  }

  return (
    <ConsoleAppShell>
      <div className="console-page">
        <div className="console-page__body">{children}</div>
      </div>
    </ConsoleAppShell>
  );
}

export function ConsoleShell({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession?: SessionSnapshot | null;
}) {
  return (
    <ConsoleSessionProvider initialSession={initialSession ?? null}>
      <TenantProvider>
        <PortalEntryProvider>
          <ShellFrame>{children}</ShellFrame>
        </PortalEntryProvider>
      </TenantProvider>
    </ConsoleSessionProvider>
  );
}
