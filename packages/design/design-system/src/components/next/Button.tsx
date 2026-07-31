/**
 * Button.tsx - Button 组件（shadcn 惯例 + cva）。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Next
 *
 * Phase 4 试点。结构承 shadcn 官方 Button，取值全部绑 DS 的 T2 语义层。
 *
 * 两条纪律：
 * 1. **不建 T3。** 设计稿治理门槛规定 Button 直接绑 T2，故本组件不引用任何
 *    --button-* 组件层 token（既有 --vx-button-height / --vx-button-radius
 *    属伪 T3，本组件不消费）。
 * 2. **不用 Tailwind 原生刻度。** 颜色走 @theme 桥接的工具类
 *    （bg-primary / text-primary-foreground），尺寸直接引用 T2 变量
 *    （h-(--control-height-lg)）——因为 Tailwind 内置 spacing/radius 刻度与
 *    DS 取值不同，桥接会污染仓库既有工具类。
 *
 * 与 components/ui/Button.tsx 并存：那个由 Tailwind 工具类与 .vx-btn 两套
 * 机制同时驱动，本组件以 cva 为唯一样式来源。旧组件不动（不做删除）。
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap",
    "gap-(--gap-xs) rounded-(--radius-md)",
    "text-sm font-medium transition-colors outline-none",
    "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-(--icon-sm)",
  ),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive-hover active:bg-destructive-active",
        outline:
          "border border-border bg-background text-foreground hover:bg-accent",
        secondary:
          "bg-primary-muted text-primary-muted-foreground hover:bg-primary-muted-hover",
        ghost: "text-foreground hover:bg-accent",
        link: "text-link underline-offset-4 hover:underline hover:text-link-hover",
      },
      size: {
        sm: "h-(--control-height-md) px-(--control-inset-x-sm)",
        default: "h-(--control-height-lg) px-(--control-inset-x-md)",
        lg: "h-(--control-height-xl) px-(--control-inset-x-lg)",
        icon: "size-(--control-height-lg) p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  readonly asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});

export { Button, buttonVariants };
