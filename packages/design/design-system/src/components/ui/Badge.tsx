/**
 * badge.tsx - Badge 组件
 * @package @vxture/design-system
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Display
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly variant?: BadgeVariant;
}

const badgeVariants = ({ variant }: { variant: BadgeVariant }) => {
  return cn(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
      "border-transparent bg-primary text-content-on-fill hover:bg-primary-hover":
        variant === "default",
      "border-transparent bg-accent text-foreground hover:bg-primary-muted":
        variant === "secondary",
      "border-transparent bg-destructive text-content-on-fill hover:bg-destructive":
        variant === "destructive",
      "text-foreground": variant === "outline",
    },
  );
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(function Badge(
  { className, variant = "default", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant }), "vx-badge", className)}
      {...props}
    />
  );
});

Badge.displayName = "Badge";

export { Badge, badgeVariants };
