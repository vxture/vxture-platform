/**
 * Badge.tsx - 徽标（shadcn 惯例 + cva）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Display
 *
 * 结构承 shadcn 官方 Badge，取值全部绑 T2 语义层。相对上游的定制：
 * - 增 `asChild`，使 Badge 能直接渲染成 <a>（上游 2024 后的版本已有此能力）。
 * - 保留 `forwardRef`：上游新版把它去掉是因为面向 React 19（ref 作为普通 prop
 *   传递），本包的 peer 范围仍含 React 18，去掉会让 StatusBadge 这类包装件拿不到 ref。
 * - 尺度走 T2（px-sm / py-2xs / text-label-sm），跟随密度与字号三档；
 *   上游的裸数值 px-2.5 / py-0.5 / text-xs 不跟随，故不用。
 *
 * 原实现用对象式 cn 手写变体，且挂了一个已随遗留样式层退役的 .vx-badge。
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const badgeVariants = cva(
  cn(
    "inline-flex w-fit shrink-0 items-center justify-center gap-2xs",
    "rounded-full border border-transparent px-sm py-2xs",
    "text-label-sm whitespace-nowrap",
    "transition-colors duration-fast ease-standard",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-icon-xs",
  ),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
          "bg-primary-muted text-primary-muted-foreground hover:bg-primary-muted-hover",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive-hover",
        outline: "border-border text-foreground hover:bg-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeVariant = NonNullable<
  VariantProps<typeof badgeVariants>["variant"]
>;

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  readonly asChild?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
});

Badge.displayName = "Badge";

export { Badge, badgeVariants };
