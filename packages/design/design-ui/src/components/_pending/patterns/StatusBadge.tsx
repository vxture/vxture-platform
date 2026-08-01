/**
 * status-badge.tsx - StatusBadge 组件
 * @package @vxture/design-ui
 *
 * 功能：跨应用状态标签，统一状态语义、密度与颜色。
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Display
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { Badge, type BadgeProps } from "../../ui/Badge";

export type StatusBadgeTone =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger";

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  readonly tone?: StatusBadgeTone;
  readonly dot?: boolean;
}

const statusBadgeToneClasses: Record<StatusBadgeTone, string> = {
  neutral: "border-border bg-accent text-muted-foreground",
  brand: "border-transparent bg-primary-muted text-primary-hover",
  info: "border-transparent bg-info-muted text-info",
  success: "border-transparent bg-success-muted text-success",
  warning: "border-transparent bg-warning-muted text-warning",
  danger: "border-transparent bg-destructive-muted text-destructive",
};

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  function StatusBadge(
    { className, tone = "neutral", dot = false, children, ...props },
    ref,
  ) {
    return (
      <Badge
        ref={ref}
        variant="outline"
        className={cn(
          "vx-status-badge gap-1.5 border px-2.5 py-0.5",
          statusBadgeToneClasses[tone],
          className,
        )}
        {...props}
      >
        {dot ? (
          <span
            className="h-1.5 w-1.5 rounded-full bg-current"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </Badge>
    );
  },
);

StatusBadge.displayName = "StatusBadge";

export { StatusBadge, statusBadgeToneClasses };
