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
 * 2. **尺度用 Tailwind 内置刻度。** 颜色走 @theme 注册的语义工具类
 *    （bg-primary / text-primary-foreground），尺寸用内置工具类（h-9 / px-4 /
 *    size-4）。原先"内置刻度与 DS 取值不同、桥接会污染工具类"的顾虑随 T1 镜像
 *    上游一并消失：现在两者本就是同一套数。
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
    // 尺度一律用 Tailwind 内置工具类：T1 镜像上游后 DS 不再自持 spacing / radius /
    // size 刻度，任意值语法（gap-(--gap-xs)）指向的 T2 名已随该层退役。
    "gap-2 rounded-md",
    "text-sm font-medium transition-colors outline-none",
    "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
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
        sm: "h-8 px-3",
        default: "h-9 px-4",
        lg: "h-10 px-6",
        icon: "size-9 p-0",
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
