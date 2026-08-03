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
   * 整块的语气：染顶缘色条、图标与读数，不染底。
   * 一排指标卡靠色条区分归属——底色染满会盖过读数本身。
   *
   * 默认 `brand` 而非 `neutral`：admin KPI 卡的既有视觉是"默认即品牌蓝"
   * （顶缘 + 读数 + 图标同色），neutral 档整卡发灰，只在刻意去色时才选它
   * （2026-08-03 opera 对照 admin 实测）。
   */
  readonly tone?: StatusBadgeTone;
  /**
   * 两种形态（admin 统计卡的既有分工，2026-08-03）：
   * - `default`：带 icon 的松散款，一行不超过 4 张；
   * - `compact`：无 icon 的紧凑款，一行 4 张以上用它——只收内边距与行距，
   *   读数尺寸不缩（admin 紧凑款读数同为大号），icon 传了也不渲染。
   */
  readonly variant?: "default" | "compact";
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
  tone = "brand",
  variant = "default",
  className,
}: MetricCardProps) {
  // trend 已经挪到读数旁边，不再算进页脚。
  const hasFooter = Boolean(description || action);
  const compact = variant === "compact";

  return (
    <Card
      className={cn(
        "border-t-medium",
        toneEdgeClasses[tone],
        // 竖向节奏在 Card 本体上（py + gap），紧凑款在此收档。
        compact && "py-lg",
        className,
      )}
    >
      <CardContent
        className={cn("flex flex-col", compact ? "gap-xs px-lg" : "gap-md")}
      >
        <div className="flex items-start gap-md">
          {/* 图标在左、不套填充块：右侧的填充图标块会和读数抢视觉重心，
              而一排卡片并列时，左侧对齐的图标本身就是分组线索。 */}
          {icon && !compact ? (
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
              {/* 读数继承整卡语气色（admin 的读数即语气色本体）；neutral 档的
                  继承色是 muted-foreground，读数会跟标签一个灰，退回 foreground。 */}
              <span
                className={cn(
                  "text-title-xl font-bold",
                  tone === "neutral" && "text-foreground",
                )}
              >
                {value}
              </span>
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
