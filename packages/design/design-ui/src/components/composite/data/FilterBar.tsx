/**
 * FilterBar.tsx - 列表上方的工具行。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 结构（owner 拍板 2026-08-03，二次修订）：
 * 居左【{视图切换} {计数}】—【自适应留白】—居右【{搜索/筛选组（children）} {主操作（actions）}】。
 * 视图切换与计数是可选段：不传 `view` / `count` 时左段为空，右段照常靠右。
 * 标题与描述由 `SectionHeader` 承担——板块的标题层级只有一个来源。
 *
 * 相对原实现：删 `title` / `description`（原先自己渲染 h2，与 SectionHeader 的
 * h2 排版不一致）；`filters` 与 `children` 二选一改为只用 `children`。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { ViewModeSwitch, type ViewModeSwitchValue } from "./ViewModeSwitch";

/** 与 `ViewModeSwitchValue` 同一个值域；保留别名是因为调用方按板块命名。 */
export type FilterBarView = ViewModeSwitchValue;

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 右侧操作区，通常是"新建"一类的主动作。 */
  readonly actions?: React.ReactNode;
  /** 给了才出 list/cards 视图切换（工具行最左）。 */
  readonly view?: FilterBarView;
  readonly onViewChange?: (view: FilterBarView) => void;
  /** 计数：总数或"筛选后 N 条"，由调用方给成品文案或数字。 */
  readonly count?: React.ReactNode;
}

const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  function FilterBar(
    { className, actions, view, onViewChange, count, children, ...props },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-wrap items-center justify-between gap-md",
          className,
        )}
        {...props}
      >
        {/* 左段：视图切换 + 计数。shrink-0 保证窄屏下先折右段不挤左段。 */}
        <div className="flex shrink-0 items-center gap-sm">
          {/* 视图切换本身是独立一件（ViewModeSwitch）：不止工具行要用，
              admin 的列表页有二十多处不经 FilterBar 直接摆一个。原先这里内联
              了一份同样的 ToggleGroup，两处各改各的就会分叉。 */}
          {view && onViewChange ? (
            <ViewModeSwitch value={view} onChange={onViewChange} />
          ) : null}
          {count !== undefined ? (
            <span className="whitespace-nowrap text-label-md text-muted-foreground">
              {count}
            </span>
          ) : null}
        </div>
        {/* 右段：搜索 / 筛选组 / 主操作，一起靠右；中间由 justify-between 留白。 */}
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-sm">
          {children}
          {actions}
        </div>
      </div>
    );
  },
);

FilterBar.displayName = "FilterBar";

export { FilterBar };
