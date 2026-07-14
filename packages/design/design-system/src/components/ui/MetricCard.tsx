/**
 * metric-card.tsx - MetricCard 组件
 * @package @vxture/design-system
 *
 * 功能：跨应用指标卡，统一 dashboard/overview 指标展示。
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Display
 */

import * as React from "react";
import { cn } from "../../utils/cn";
import { Card, CardContent } from "./Card";
import { StatusBadge, type StatusBadgeTone } from "./StatusBadge";

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly label: React.ReactNode;
  readonly value: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly icon?: React.ReactNode;
  readonly action?: React.ReactNode;
  readonly trend?: React.ReactNode;
  readonly trendTone?: StatusBadgeTone;
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  function MetricCard(
    {
      className,
      label,
      value,
      description,
      icon,
      action,
      trend,
      trendTone = "neutral",
      ...props
    },
    ref,
  ) {
    return (
      <Card ref={ref} className={cn("vx-metric-card", className)} {...props}>
        <CardContent className="grid gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-vx-text-muted">
                {label}
              </p>
              <div className="mt-2 text-2xl font-semibold leading-none text-vx-text-primary">
                {value}
              </div>
            </div>
            {icon ? (
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-vx-primary-soft text-vx-primary-strong">
                {icon}
              </div>
            ) : null}
          </div>
          {description || trend || action ? (
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                {description ? (
                  <p className="text-sm text-vx-text-muted">{description}</p>
                ) : null}
                {trend ? (
                  <StatusBadge tone={trendTone} className="mt-2">
                    {trend}
                  </StatusBadge>
                ) : null}
              </div>
              {action ? <div className="shrink-0">{action}</div> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  },
);

MetricCard.displayName = "MetricCard";

export { MetricCard };
