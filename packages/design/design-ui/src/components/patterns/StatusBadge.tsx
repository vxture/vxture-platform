/**
 * StatusBadge.tsx - 状态标。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 收录依据：产品扫描出现频次第二（console 11 / admin 39 处文件）。上游 shadcn
 * 只有 Badge，状态标是在它之上加"语气 + 可选圆点"的一层。
 *
 * **tone 只表达语气，不表达业务状态**。这里没有 `overdue` / `suspended` 之类的
 * 值——那是产品的事：把"订阅逾期"映射成 `tone="warning"` 由产品决定，DS 一旦
 * 收下这个映射，就等于把业务语义焊进了设计系统，而不同产品对同一状态的严重度
 * 判断本就可以不同。
 *
 * 原实现挂了 .vx-status-badge，且间距与圆点尺寸用的是不跟随三档的裸数值。
 */

import * as React from "react";
import { cn } from "../../utils/cn";
import { Badge, type BadgeProps } from "../ui/Badge";

export type StatusBadgeTone =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger";

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  readonly tone?: StatusBadgeTone;
  /** 标前的圆点，用于在密集列表里不靠颜色也能分辨条目边界。 */
  readonly dot?: boolean;
}

const statusBadgeToneClasses: Record<StatusBadgeTone, string> = {
  neutral: "border-border bg-accent text-muted-foreground",
  brand: "border-primary-border bg-primary-muted text-primary-text",
  info: "border-info-border bg-info-muted text-info-text",
  success: "border-success-border bg-success-muted text-success-text",
  warning: "border-warning-border bg-warning-muted text-warning-text",
  danger:
    "border-destructive-border bg-destructive-muted text-destructive-text",
};

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  function StatusBadge(
    { className, tone = "neutral", dot = false, children, ...props },
    ref,
  ) {
    return (
      <Badge
        ref={ref}
        variant="outline"
        className={cn(statusBadgeToneClasses[tone], className)}
        {...props}
      >
        {dot ? (
          <span
            className="size-2xs rounded-full bg-current"
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
