/**
 * filter-bar.tsx - FilterBar 组件
 * @package @vxture/design-system
 *
 * 功能：跨应用筛选/搜索工具条布局。
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Layout
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export interface FilterBarProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  readonly title?: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly filters?: React.ReactNode;
  readonly actions?: React.ReactNode;
}

const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  function FilterBar(
    { className, title, description, filters, actions, children, ...props },
    ref,
  ) {
    const hasCopy = Boolean(title || description);
    return (
      <section
        ref={ref}
        className={cn(
          "vx-filter-bar flex flex-wrap items-end justify-between gap-4 rounded-lg border border-vx-border bg-vx-surface p-4",
          className,
        )}
        {...props}
      >
        <div className="min-w-0 flex-1">
          {hasCopy ? (
            <div className="mb-3 grid gap-1">
              {title ? (
                <h2 className="text-base font-semibold text-vx-text-primary">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="text-sm text-vx-text-muted">{description}</p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            {filters ?? children}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        ) : null}
      </section>
    );
  },
);

FilterBar.displayName = "FilterBar";

export { FilterBar };
