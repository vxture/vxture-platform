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
 * 2. **尺度走 T2 语义名。** 颜色用 bg-primary / text-primary-foreground，尺寸用
 *    h-control-lg / px-md / gap-xs / size-icon-sm。这些都是 T2 注册出的真工具类，
 *    且跟随密度三档；裸数值（h-9 / px-4）不跟随，故不用。
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
    // 尺度一律走 T2 语义名产出的工具类，不用裸数值：p-4 之类不跟随密度三档，
    // 而 gap-xs / h-control-md 会。任意值语法（gap-(--gap-xs)）仍然禁止。
    "gap-xs rounded-md",
    "text-sm font-medium transition-colors outline-none",
    "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-icon-sm",
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
        sm: "h-control-md px-sm",
        default: "h-control-lg px-md",
        lg: "h-control-xl px-lg",
        icon: "size-control-lg p-0",
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
