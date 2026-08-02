/**
 * Toggle.tsx - 双态按钮。
 * @package @vxture/design-ui
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Form
 *
 * 结构照 shadcn 官方 Toggle（cva），取值换成 T2 语义类。按下态用 `bg-accent`
 * 不用品牌色：它表达的是"当前生效"，与菜单展开、Tabs 未选中同族，满色品牌底
 * 会让一排格式开关看起来像一排主按钮。尺寸档映射与 Button 一致
 * （sm=h-control-md / default=h-control-lg / lg=h-control-xl）。
 *
 * 变体族导出为**运行时数组**（同 Button.types 的做法）：预览面遍历全部挡位时
 * 引它，手抄清单加了挡位不会跟着加，且不报错。
 */

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";
import { inlineIcon, interactive, radiusClamp } from "../../styles/recipes";

export const TOGGLE_VARIANTS = ["default", "outline"] as const;

export type ToggleVariant = (typeof TOGGLE_VARIANTS)[number];

export const TOGGLE_SIZES = ["sm", "default", "lg"] as const;

export type ToggleSize = (typeof TOGGLE_SIZES)[number];

const toggleVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center gap-xs whitespace-nowrap select-none",
    "rounded-md text-label-md text-foreground",
    "hover:bg-accent",
    interactive,
    inlineIcon,
    // ⚠ Toggle 发的是 `data-state="on|off"`，不是 checked——选择器必须写
    //   `data-[state=on]`，`data-on:` 编译得出但永远匹配不上。
    "data-[state=on]:bg-accent",
  ),
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent shadow-raised",
      },
      size: {
        // 小档同 Button：另行封顶圆角，基数调大时不发胖。
        sm: cn("h-control-md px-sm text-label-sm", radiusClamp),
        default: "h-control-lg px-md",
        lg: "h-control-xl px-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/** 同 Button：cva 键与公开联合类型编译期对账，漂移不再静默。 */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

export type _ToggleVariantKeysMatch = Expect<
  Equal<
    NonNullable<VariantProps<typeof toggleVariants>["variant"]>,
    ToggleVariant
  >
>;
export type _ToggleSizeKeysMatch = Expect<
  Equal<NonNullable<VariantProps<typeof toggleVariants>["size"]>, ToggleSize>
>;

export interface ToggleProps
  extends
    React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>,
    VariantProps<typeof toggleVariants> {}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { className, variant, size, ...props },
  ref,
) {
  return (
    <TogglePrimitive.Root
      ref={ref}
      className={cn(toggleVariants({ variant, size }), className)}
      {...props}
    />
  );
});

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
