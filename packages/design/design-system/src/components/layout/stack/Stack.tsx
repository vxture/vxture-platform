/**
 * Stack.tsx - 垂直堆叠布局组件
 * @package @vxture/design-system
 *
 * 功能：提供类似 flex column 的垂直布局原语
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components
 */

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "../../../utils/cn";

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** 间距大小 */
  gap?: "xs" | "sm" | "md" | "lg";
  /** 对齐方式 */
  align?: "start" | "center" | "end" | "stretch";
}

const gapClasses = {
  xs: "gap-2",
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
};

const alignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({ gap = "md", align = "stretch", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col",
          gapClasses[gap],
          alignClasses[align],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Stack.displayName = "Stack";
