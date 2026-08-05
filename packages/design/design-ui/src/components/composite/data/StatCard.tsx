/**
 * StatCard.tsx - 概览页的重点指标卡。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 与 `MetricCard` 的分工：`MetricCard` 是列表页顶部那一排常规指标（带图标、
 * 四张一行）；本件是**概览页最上方的重点指标**。
 *
 * **排版与语气完全沿用 `MetricCard`**：标签 `label-md`、读数 `title-xl font-bold`
 * 且继承整卡语气色（neutral 档才退回 foreground）、`trend` 走 `StatusBadge`、
 * `tags` 跟随整卡语气。两件唯一的排版差异是本件没有大图标——四张卡并排时，
 * 左侧图标会与读数抢视觉重心，而"这是哪个指标"标签已经说清楚了。
 *
 * 本件自己的东西只有两样：
 * - **`help`**：标签行内的 `?`，指标口径的说明入口。
 * - **`cardVeil` 底纹**：透明模式下不能靠加深底色与下方常规卡片拉开层次
 *   （那会破坏"页面只有一层实色底"），改用一层极淡的品牌调底纹。
 *
 * 结构照 admin 平台总览的四张卡提炼（活跃客户 / 订阅收入 / 模型调用 / 平台稳定性），
 * 尺寸逐条对照既有实现：内边距 1.5rem = space-lg，内部间距 1rem = space-md，
 * 最小高 6rem = media-xl，顶缘 2px 语气色条、其余三边 1px 发丝线。
 * 每一项都正好落在既有刻度上。
 *
 * 刻意不做变体：owner 定（2026-08-05）。要别的形态就用别的件，不在这里加参数。
 */

import * as React from "react";
import { Icon } from "../../../icons";
import { cardVeil } from "../../../styles/recipes";
import { cn } from "../../../utils/cn";
import { Button } from "../../base/form/Button";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "../../base/display/StatusBadge";
import { toneEdgeClasses } from "../../tone";

export interface StatCardProps {
  readonly label: React.ReactNode;
  readonly value: React.ReactNode;
  /** 标签行内 `?` 的说明文字。不给则不出图标。 */
  readonly help?: string;
  /** 环比、同比一类的变化量，渲染为 StatusBadge。见 `MetricCardProps.trend`。 */
  readonly trend?: React.ReactNode;
  readonly trendTone?: StatusBadgeTone;
  /** 读数旁的补充口径，0..n 条，语气跟随整卡。见 `MetricCardProps.tags`。 */
  readonly tags?: readonly React.ReactNode[];
  /**
   * 整块的语气：染顶缘色条与读数，不染底。默认 `brand`——概览重点卡默认即品牌调，
   * 与 `MetricCard` 同一判断。
   */
  readonly tone?: StatusBadgeTone;
  readonly className?: string;
}

function StatCard({
  label,
  value,
  help,
  trend,
  trendTone = "neutral",
  tags,
  tone = "brand",
  className,
}: StatCardProps) {
  return (
    <article
      style={cardVeil}
      className={cn(
        "flex min-h-media-xl min-w-0 flex-col gap-md rounded-md p-lg",
        "border border-primary/10 dark:border-primary/20",
        // 顶缘承载语气色；toneEdgeClasses 同时给出读数继承的前景色。
        "border-t-2",
        toneEdgeClasses[tone],
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-xs text-label-md text-muted-foreground">
        <span className="truncate">{label}</span>
        {help ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={help}
            title={help}
            className="shrink-0"
          >
            <Icon name="help" size="xs" aria-hidden="true" />
          </Button>
        ) : null}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-sm">
        {/* 读数继承整卡语气色（与 MetricCard 同）；neutral 档的继承色是
            muted-foreground，读数会跟标签一个灰，退回 foreground。 */}
        <span
          className={cn(
            "truncate text-title-xl font-bold",
            tone === "neutral" && "text-foreground",
          )}
        >
          {value}
        </span>
        {trend ? <StatusBadge tone={trendTone}>{trend}</StatusBadge> : null}
        {tags?.map((tag, index) => (
          <StatusBadge key={index} tone={tone}>
            {tag}
          </StatusBadge>
        ))}
      </div>
    </article>
  );
}

export { StatCard };
