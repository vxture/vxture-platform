/**
 * metric-grid.tsx - 指标卡网格 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { cn } from "../../utils/cn";
import { MetricCard } from "./MetricCard";
import type { StatusBadgeTone } from "./StatusBadge";

export type MetricGridTone = StatusBadgeTone | "default" | "positive";

export interface MetricGridItem {
  readonly id?: React.Key;
  readonly label: React.ReactNode;
  readonly value: React.ReactNode;
  readonly trend?: React.ReactNode;
  readonly tone?: MetricGridTone;
}

export interface MetricGridProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly items: readonly MetricGridItem[];
}

function metricTone(tone: MetricGridTone | undefined): StatusBadgeTone {
  if (tone === "positive") return "success";
  if (tone === "default" || tone === undefined) return "neutral";
  return tone;
}

const MetricGrid = React.forwardRef<HTMLDivElement, MetricGridProps>(
  function MetricGrid({ className, items, ...props }, ref) {
    return (
      <div ref={ref} className={cn("vx-metric-grid", className)} {...props}>
        {items.map((item) => (
          <MetricCard
            key={item.id ?? String(item.label)}
            className="vx-metric-card"
            label={item.label}
            value={item.value}
            trend={item.trend}
            trendTone={metricTone(item.tone)}
          />
        ))}
      </div>
    );
  },
);

MetricGrid.displayName = "MetricGrid";

export { MetricGrid };
