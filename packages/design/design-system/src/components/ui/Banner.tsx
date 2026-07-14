/**
 * banner.tsx - 常驻提示条 pattern，用于展示需要持续可见的状态信息（非自动消失）。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-07-13
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export type BannerTone = "success" | "error" | "warning" | "info" | "ai";

export interface BannerProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  readonly tone?: BannerTone;
  readonly title: React.ReactNode;
  readonly description?: React.ReactNode;
}

const Banner = React.forwardRef<HTMLDivElement, BannerProps>(function Banner(
  { className, tone = "info", title, description, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn("vx-banner", `vx-banner--${tone}`, className)}
      role="status"
      {...props}
    >
      <div className="vx-banner__title">{title}</div>
      {description ? (
        <div className="vx-banner__desc">{description}</div>
      ) : null}
    </div>
  );
});

Banner.displayName = "Banner";

export { Banner };
