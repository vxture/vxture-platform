/**
 * Grid.tsx - 响应式网格布局组件
 * @package @vxture/design-system
 *
 * 功能：提供简单的响应式网格布局辅助工具
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components
 */

import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "../../../utils/cn";

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** 列数 */
  columns?: number;
  /** 间距大小 */
  gap?: "xs" | "sm" | "md" | "lg";
}

const gapClasses = {
  xs: "gap-2",
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
};

const columnsClasses = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
  9: "grid-cols-9",
  10: "grid-cols-10",
  11: "grid-cols-11",
  12: "grid-cols-12",
};

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ columns = 3, gap = "md", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "grid",
          columnsClasses[columns as keyof typeof columnsClasses] ||
            "grid-cols-3",
          gapClasses[gap],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Grid.displayName = "Grid";
