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
    "z-tooltip overflow-hidden rounded-md border px-md py-xs text-body-sm shadow-overlay",
    "duration-fast ease-enter animate-in fade-in-0 zoom-in-95",
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
    "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
    "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  ),
  {
    variants: {
      variant: {
        default: "border-border bg-popover text-foreground",
        soft: "border-border bg-popover/90 text-muted-foreground backdrop-blur-md",
        inverse:
          "border-stroke-emphasis bg-surface-inverse text-content-on-inverse",
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
