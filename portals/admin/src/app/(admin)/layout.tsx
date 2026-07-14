import type { ReactNode } from "react";
import { AdminSessionProvider } from "@/features/session/AdminSessionProvider";
import { AdminAppShell } from "@/layout/template/AdminAppShell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminSessionProvider>
      <AdminAppShell>{children}</AdminAppShell>
    </AdminSessionProvider>
  );
}
