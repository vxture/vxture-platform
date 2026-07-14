/**
 * status-badge.tsx - StatusBadge 组件
 * @package @vxture/design-system
 *
 * 功能：跨应用状态标签，统一状态语义、密度与颜色。
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Display
 */

import * as React from "react";
import { cn } from "../../utils/cn";
import { Badge, type BadgeProps } from "./Badge";

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
  neutral: "border-vx-border bg-vx-surface-muted text-vx-text-secondary",
  brand: "border-transparent bg-vx-primary-soft text-vx-primary-strong",
  info: "border-transparent bg-vx-info-surface text-vx-info",
  success: "border-transparent bg-vx-success-surface text-vx-success",
  warning: "border-transparent bg-vx-warning-surface text-vx-warning",
  danger: "border-transparent bg-vx-danger-surface text-vx-danger",
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
