import type { ReactNode } from "react";
import { ConsoleShell } from "@/layout/ConsoleShell";
import { loadServerSessionSnapshot } from "@/lib/server/bff-server";

// Server component: resolve the session snapshot with the caller's cookies so
// the shell paints on first render instead of a client-side spinner waterfall.
// A null snapshot (unauthenticated / expired / tenant mismatch) is intentional —
// ConsoleShell then runs the existing client restore + silent-SSO flow.
export default async function ConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const initialSession = await loadServerSessionSnapshot();
  return (
    <ConsoleShell initialSession={initialSession}>{children}</ConsoleShell>
  );
}
