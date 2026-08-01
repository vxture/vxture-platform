/**
 * MetricCard.tsx - 单个指标读数。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 读数用 `display-xs` 而不是 `heading-2`——两者字号相同，但指标值不是标题，它落在
 * 一个 `<div>` 上。排版角色与元素绑定的规矩见 `SectionHeader`。
 *
 * 相对原实现：`icon` 从 `ReactNode` 收为 `IconName`；裸值换成刻度
 * （`text-sm`/`text-2xl`/`h-10 w-10`/`gap-4` → T2 角色与 `size-icon-2xl`）。
 */

import * as React from "react";
import { Icon, type IconName } from "../../icons";
import { Card, CardContent } from "../ui/Card";
import { StatusBadge, type StatusBadgeTone } from "./StatusBadge";

export interface MetricCardProps {
  readonly label: React.ReactNode;
  readonly value: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly icon?: IconName;
  /** 环比、同比一类的变化量，渲染为 StatusBadge。 */
  readonly trend?: React.ReactNode;
  readonly trendTone?: StatusBadgeTone;
  readonly action?: React.ReactNode;
  readonly className?: string;
}

function MetricCard({
  label,
  value,
  description,
  icon,
  trend,
  trendTone = "neutral",
  action,
  className,
}: MetricCardProps) {
  const hasFooter = Boolean(description || trend || action);

  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-md p-lg">
        <div className="flex items-start justify-between gap-sm">
          <div className="flex min-w-0 flex-col gap-xs">
            <span className="truncate text-label-md text-muted-foreground">
              {label}
            </span>
            <span className="text-display-xs text-foreground">{value}</span>
          </div>
          {icon ? (
            <span className="inline-flex size-icon-2xl shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary-text">
              <Icon name={icon} size={16} aria-hidden="true" />
            </span>
          ) : null}
        </div>
        {hasFooter ? (
          <div className="flex items-end justify-between gap-sm">
            <div className="flex min-w-0 flex-col items-start gap-xs">
              {description ? (
                <span className="text-body-sm text-muted-foreground">
                  {description}
                </span>
              ) : null}
              {trend ? (
                <StatusBadge tone={trendTone}>{trend}</StatusBadge>
              ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { MetricCard };
