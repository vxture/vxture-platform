/**
 * Tooltip.tsx - 提示气泡。
 * @package @vxture/design-ui
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Floating
 *
 * 结构照 shadcn 官方 Tooltip，取值换成 DS 的 T2 语义类。`variant` 三档是 DS 既有的
 * 公开 API（shadcn 无此变体），此处保留并改由 cva 承载，不新增档位。
 */

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";
import { overlayMotion, panel } from "../../styles/recipes";

export interface TooltipProps extends React.ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Root
> {}

export interface TooltipTriggerProps extends React.ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Trigger
> {}

export interface TooltipProviderProps extends React.ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Provider
> {}

/**
 * 视觉高度取 `shadow-overlay` 而非更高档：tooltip 叠放最高（`z-tooltip`），
 * 但阴影应当轻——它小而短暂，重阴影只显笨重。两条阶梯不可互相推导，
 * 见 060 §8。
 */
const tooltipVariants = cva(
  cn(
    "z-tooltip w-fit max-w-content-narrow-lg overflow-hidden rounded-md px-sm py-2xs text-body-sm",
    overlayMotion,
  ),
  {
    variants: {
      variant: {
        // 默认反相：提示是转瞬即逝的旁注，不是一块内容表面。反相把它和页面
        // 明确分开，也省掉一圈描边。Material / Fluent / Carbon 同此。
        default: "bg-surface-inverse text-content-on-inverse",
        // 需要贴合页面表面时用（例如提示里还嵌了可读内容）。
        surface: cn("shadow-overlay", panel.base, panel.popover),
        soft: "bg-popover/90 text-muted-foreground shadow-overlay backdrop-blur-md",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type TooltipContentVariant = NonNullable<
  VariantProps<typeof tooltipVariants>["variant"]
>;

export interface TooltipContentProps
  extends
    React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipVariants> {}

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  function TooltipContent(
    { className, sideOffset = 4, variant, ...props },
    ref,
  ) {
    return (
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cn(tooltipVariants({ variant }), className)}
          {...props}
        />
      </TooltipPrimitive.Portal>
    );
  },
);

TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
