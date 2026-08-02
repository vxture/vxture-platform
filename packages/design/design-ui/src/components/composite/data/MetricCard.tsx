/**
 * MetricCard.tsx - 单个指标读数。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 读数 20px（title-xl）而非展示体大字——admin KPI 卡的密度（workplan §1）：
 * 指标卡成排出现，36px 的读数会让四张卡各自都在喊。读数不是标题，落在 `<span>` 上。
 *
 * 顶缘色条 2px（border-t-medium）——V3 的原文即"语义色只走顶部 2px 描边"；
 * 4px 那一档是侧栏指示条这类结构件的宽度，放在卡顶像贴了胶带。
 *
 * 相对原实现：`icon` 从 `ReactNode` 收为 `IconName`；裸值换成刻度。
 */

import * as React from "react";
import { Icon, type IconName } from "../../../icons";
import { cn } from "../../../utils/cn";
import { Card, CardContent } from "../../base/display/Card";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "../../base/display/StatusBadge";
import { toneEdgeClasses } from "../../tone";

export interface MetricCardProps {
  readonly label: React.ReactNode;
  readonly value: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly icon?: IconName;
  /** 环比、同比一类的变化量，渲染为 StatusBadge。 */
  readonly trend?: React.ReactNode;
  readonly trendTone?: StatusBadgeTone;
  readonly action?: React.ReactNode;
  /**
   * 整块的语气：染顶缘色条与图标，不染底。
   * 一排指标卡靠色条区分归属——底色染满会盖过读数本身。
   */
  readonly tone?: StatusBadgeTone;
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
  tone = "neutral",
  className,
}: MetricCardProps) {
  // trend 已经挪到读数旁边，不再算进页脚。
  const hasFooter = Boolean(description || action);

  return (
    <Card className={cn("border-t-medium", toneEdgeClasses[tone], className)}>
      <CardContent className="flex flex-col gap-md p-xl">
        <div className="flex items-start gap-md">
          {/* 图标在左、不套填充块：右侧的填充图标块会和读数抢视觉重心，
              而一排卡片并列时，左侧对齐的图标本身就是分组线索。 */}
          {icon ? (
            <Icon
              name={icon}
              size="lg"
              aria-hidden="true"
              className="shrink-0"
            />
          ) : null}
          <div className="flex min-w-0 flex-col gap-xs">
            <span className="truncate text-label-md text-muted-foreground">
              {label}
            </span>
            <div className="flex flex-wrap items-center gap-sm">
              <span className="text-title-xl text-foreground">{value}</span>
              {trend ? (
                <StatusBadge tone={trendTone}>{trend}</StatusBadge>
              ) : null}
            </div>
          </div>
        </div>
        {hasFooter ? (
          <div className="flex items-end justify-between gap-sm">
            {description ? (
              <span className="min-w-0 text-body-sm text-muted-foreground">
                {description}
              </span>
            ) : null}
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { MetricCard };
