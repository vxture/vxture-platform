/**
 * bulk-action-bar.tsx - 跨应用批量操作条 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-18
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export interface BulkActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly selectedLabel?: React.ReactNode;
  readonly selectionActions?: React.ReactNode;
  readonly primaryActions?: React.ReactNode;
  readonly selectionClassName?: string;
  readonly primaryClassName?: string;
}

const BulkActionBar = React.forwardRef<HTMLDivElement, BulkActionBarProps>(
  function BulkActionBar(
    {
      className,
      selectedLabel,
      selectionActions,
      primaryActions,
      selectionClassName,
      primaryClassName,
      ...props
    },
    ref,
  ) {
    const hasSelection = Boolean(selectedLabel || selectionActions);

    return (
      <div ref={ref} className={cn("vx-bulk-action-bar", className)} {...props}>
        {hasSelection ? (
          <div
            className={cn("vx-bulk-action-bar__selection", selectionClassName)}
          >
            {selectedLabel ? (
              <span className="vx-bulk-action-bar__selection-label">
                {selectedLabel}
              </span>
            ) : null}
            {selectionActions}
          </div>
        ) : null}
        {primaryActions ? (
          <div className={cn("vx-bulk-action-bar__primary", primaryClassName)}>
            {primaryActions}
          </div>
        ) : null}
      </div>
    );
  },
);

BulkActionBar.displayName = "BulkActionBar";

export { BulkActionBar };
