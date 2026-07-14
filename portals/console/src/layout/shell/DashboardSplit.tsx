import type { ReactNode } from "react";

export function DashboardSplit({ children }: { children: ReactNode }) {
  return <div className="vx-dashboard-layout">{children}</div>;
}
