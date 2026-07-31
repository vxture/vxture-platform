/**
 * Button.tsx - 按钮（shadcn 惯例 + cva）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Common
 *
 * 结构承 shadcn 官方 Button，取值全部绑 DS 的 T2 语义层。本组件是其余 Radix
 * 组件 cva 化的样板。
 *
 * 两条纪律：
 * 1. **不建 T3。** 治理门槛规定 Button 直接绑 T2，故不引用任何 --button-* 组件层
 *    token（既有 --vx-button-height / --vx-button-radius 属伪 T3，不消费）。
 * 2. **尺度走 T2 语义名。** 颜色用 bg-primary / text-primary-foreground，尺寸用
 *    h-control-lg / px-md / gap-xs / size-icon-sm——都是 T2 注册出的真工具类，
 *    且跟随密度三档；裸数值（h-9 / px-4）不跟随，故不用。任意值语法一律禁止。
 *
 * 原先由 Tailwind 工具类与 .vx-btn 两套机制同时驱动的实现已被本文件取代：
 * 遗留样式层退役后 .vx-btn 无定义，两套并行的前提消失。
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";
import type { ButtonVariant, ButtonSize } from "./Button.types";

const buttonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap",
    // 尺度一律走 T2 语义名产出的工具类，不用裸数值：p-lg 之类不跟随密度三档，
    // 而 gap-xs / h-control-md 会。任意值语法（gap-(--gap-xs)）仍然禁止。
    "gap-xs rounded-md",
    "text-label-md transition-colors duration-fast ease-standard outline-none",
    "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
    "disabled:pointer-events-none disabled:opacity-disabled",
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

/**
 * cva 的变体键必须与公开的 ButtonVariant / ButtonSize 联合类型一致。
 * 两处各写一份必然漂移，且漂移是静默的——多出的键照样产出样式，
 * 消费方却在类型上拿不到。此处编译期对账。
 */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

export type _VariantKeysMatch = Expect<
  Equal<
    NonNullable<VariantProps<typeof buttonVariants>["variant"]>,
    ButtonVariant
  >
>;
export type _SizeKeysMatch = Expect<
  Equal<NonNullable<VariantProps<typeof buttonVariants>["size"]>, ButtonSize>
>;

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
