/**
 * FilterBar.tsx - 列表上方的工具行。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 结构（admin 租户列表的工具行语法，owner 拍板保留，2026-08-03）：
 * {视图切换} - {计数} - {搜索 / 筛选组（children）} - {主要操作（actions）}。
 * 视图切换与计数是可选段：不传 `view` / `count` 时退回纯筛选行。
 * 标题与描述由 `SectionHeader` 承担——板块的标题层级只有一个来源。
 *
 * 相对原实现：删 `title` / `description`（原先自己渲染 h2，与 SectionHeader 的
 * h2 排版不一致）；`filters` 与 `children` 二选一改为只用 `children`。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { SegmentedControl } from "../../base/form/SegmentedControl";

export type FilterBarView = "list" | "cards";

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
        {/* flex-1：左组必须占满剩余宽，否则容器被内容反推，w-full 的搜索框
            会把相邻筛选件挤下行（2026-08-03 opera 实测）。 */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-sm">
          {view && onViewChange ? (
            <SegmentedControl
              size="sm"
              ariaLabel="展示方式"
              value={view}
              onChange={onViewChange}
              items={[
                { value: "list", icon: "list", ariaLabel: "列表视图" },
                { value: "cards", icon: "squares-four", ariaLabel: "卡片视图" },
              ]}
            />
          ) : null}
          {count !== undefined ? (
            <span className="whitespace-nowrap text-label-md text-muted-foreground">
              {count}
            </span>
          ) : null}
          {children}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-sm">
            {actions}
          </div>
        ) : null}
      </div>
    );
  },
);

FilterBar.displayName = "FilterBar";

export { FilterBar };
