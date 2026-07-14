/**
 * table-toolbar.tsx - 跨应用表格工具条 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { cn } from "../../utils/cn";
import { FilterBar } from "./FilterBar";
import type { FilterBarProps } from "./FilterBar";

export interface TableToolbarProps extends Omit<
  FilterBarProps,
  "title" | "description" | "actions"
> {
  readonly title: React.ReactNode;
  readonly hint?: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly action?: React.ReactNode;
  readonly actions?: React.ReactNode;
}

const TableToolbar = React.forwardRef<HTMLDivElement, TableToolbarProps>(
  function TableToolbar(
    { className, title, hint, description, action, actions, ...props },
    ref,
  ) {
    return (
      <FilterBar
        ref={ref}
        className={cn("vx-table-toolbar", className)}
        title={title}
        description={description ?? hint}
        actions={actions ?? action}
        {...props}
      />
    );
  },
);

TableToolbar.displayName = "TableToolbar";

export { TableToolbar };
