/**
 * empty-state.tsx - 跨应用空状态 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export interface EmptyStateProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  readonly title: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  function EmptyState(
    { className, title, description, action, ...props },
    ref,
  ) {
    return (
      <div ref={ref} className={cn("vx-empty-state", className)} {...props}>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
        {action ? <div>{action}</div> : null}
      </div>
    );
  },
);

EmptyState.displayName = "EmptyState";

export { EmptyState };
