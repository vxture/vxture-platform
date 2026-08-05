/**
 * MetricGrid.tsx - 一排指标卡。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 数据驱动：调用方给 `items`，不给 markup。窄屏单列、中屏两列，`columns` 只决定
 * 宽屏那一档——断点由本件固定，各处不会长得不一样。
 *
 * 相对原实现：删 `MetricGridTone` 的 `default` / `positive` 两个别名，直接用
 * `StatusBadgeTone`——同一个语气在两处有两个名字，迟早对不上；`id` 由可选改为必填，
 * 原来回落到 `String(label)` 做 key，label 是 ReactNode 时会撞。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { MetricCard } from "./MetricCard";
import type { StatusBadgeTone } from "../../base/display/StatusBadge";
import type { IconName } from "../../../icons";

export type MetricGridColumns = 2 | 3 | 4 | 5 | 6;

const BY_COLUMNS: Record<MetricGridColumns, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

export interface MetricGridItem {
  readonly id: string;
  readonly label: React.ReactNode;
  readonly value: React.ReactNode;
  /** 指标口径说明，落在标签行的 `?` 里。见 `MetricCardProps.help`。 */
  readonly help?: string;
  readonly description?: React.ReactNode;
  readonly icon?: IconName;
  readonly trend?: React.ReactNode;
  readonly trendTone?: StatusBadgeTone;
  /** 读数旁的补充口径，0..n 条。见 `MetricCardProps.tags`。 */
  readonly tags?: readonly React.ReactNode[];
  /** 整块语气，染顶缘色条。批 E 给 MetricCard 加的，item 类型没跟上就传不进去。 */
  readonly tone?: StatusBadgeTone;
}

export interface MetricGridProps {
  readonly items: readonly MetricGridItem[];
  readonly columns?: MetricGridColumns;
  /** 整排统一形态：一行 4 张以内用默认松散款，超过 4 张用无 icon 紧凑款。 */
  readonly variant?: "default" | "compact";
  /**
   * 这一排指标是什么（"订单管理统计"一类）。给了就连同 `role="group"` 一起挂上——
   * 一排读数对读屏器是一堆无名数字，没有组名就只能逐张听过去。
   */
  readonly "aria-label"?: string;
  readonly className?: string;
}

function MetricGrid({
  items,
  columns = 4,
  variant = "default",
  "aria-label": ariaLabel,
  className,
}: MetricGridProps) {
  return (
    <div
      {...(ariaLabel !== undefined
        ? { role: "group", "aria-label": ariaLabel }
        : {})}
      className={cn(
        "grid gap-md sm:grid-cols-2",
        BY_COLUMNS[columns],
        className,
      )}
    >
      {items.map((item) => (
        <MetricCard
          key={item.id}
          label={item.label}
          value={item.value}
          {...(item.help !== undefined ? { help: item.help } : {})}
          {...(item.description !== undefined
            ? { description: item.description }
            : {})}
          {...(item.icon !== undefined ? { icon: item.icon } : {})}
          {...(item.trend !== undefined ? { trend: item.trend } : {})}
          {...(item.trendTone !== undefined
            ? { trendTone: item.trendTone }
            : {})}
          {...(item.tags !== undefined ? { tags: item.tags } : {})}
          {...(item.tone !== undefined ? { tone: item.tone } : {})}
          variant={variant}
        />
      ))}
    </div>
  );
}

export { MetricGrid };
