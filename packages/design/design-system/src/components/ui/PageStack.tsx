/**
 * page-stack.tsx - 页面纵向堆叠布局 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export interface PageStackProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly children: React.ReactNode;
}

const PageStack = React.forwardRef<HTMLDivElement, PageStackProps>(
  function PageStack({ className, children, ...props }, ref) {
    return (
      <div ref={ref} className={cn("vx-page-stack", className)} {...props}>
        {children}
      </div>
    );
  },
);

PageStack.displayName = "PageStack";

export { PageStack };
