/**
 * StatusBadge.tsx - 状态标。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 收录依据：产品扫描出现频次第二（console 11 / admin 39 处文件）。上游 shadcn
 * 只有 Badge，状态标是在它之上加"语气 + 可选圆点"的一层。
 *
 * 语气刻度见 `./tone`——与 `Banner` 共用一份。
 *
 * 原实现挂了 .vx-status-badge，且间距与圆点尺寸用的是不跟随三档的裸数值。
 */

import * as React from "react";
import { cn } from "../../utils/cn";
import { Badge, type BadgeProps } from "./Badge";
import { toneSurfaceClasses, type Tone } from "../tone";

export type StatusBadgeTone = Tone;

export interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  readonly tone?: StatusBadgeTone;
  /** 标前的圆点，用于在密集列表里不靠颜色也能分辨条目边界。 */
  readonly dot?: boolean;
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  function StatusBadge(
    { className, tone = "neutral", dot = false, children, ...props },
    ref,
  ) {
    return (
      <Badge
        ref={ref}
        variant="outline"
        className={cn(toneSurfaceClasses[tone], className)}
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

export { StatusBadge };
