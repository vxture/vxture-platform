/**
 * page-actions.tsx - 页面操作区 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export interface PageActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly children: React.ReactNode;
}

const PageActions = React.forwardRef<HTMLDivElement, PageActionsProps>(
  function PageActions({ className, children, ...props }, ref) {
    return (
      <div ref={ref} className={cn("vx-detail-actions", className)} {...props}>
        {children}
      </div>
    );
  },
);

PageActions.displayName = "PageActions";

export { PageActions };
