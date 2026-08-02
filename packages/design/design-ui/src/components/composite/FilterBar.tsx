/**
 * FilterBar.tsx - 列表上方的筛选行。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 只管两件事：左侧筛选控件、右侧操作。标题与描述由 `SectionHeader` 承担——板块的
 * 标题层级只有一个来源。
 *
 * 相对原实现：删 `title` / `description`（原先自己渲染 h2，与 SectionHeader 的
 * h2 排版不一致）；`filters` 与 `children` 二选一改为只用 `children`。
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 右侧操作区，通常是"新建"一类的主动作。 */
  readonly actions?: React.ReactNode;
}

const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  function FilterBar({ className, actions, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-wrap items-center justify-between gap-md",
          className,
        )}
        {...props}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-sm">
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
