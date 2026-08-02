/**
 * Popover.tsx - 气泡浮层。
 * @package @vxture/design-ui
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Floating
 */

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "../../utils/cn";
import { overlayMotion, panel } from "../../styles/recipes";

export interface PopoverProps extends React.ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Root
> {}

export interface PopoverTriggerProps extends React.ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Trigger
> {}

export interface PopoverContentProps extends React.ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Content
> {}

export interface PopoverCloseProps extends React.ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Close
> {}

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverClose = PopoverPrimitive.Close;

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  function PopoverContent(
    { className, align = "center", sideOffset = 4, ...props },
    ref,
  ) {
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          align={align}
          sideOffset={sideOffset}
          className={cn(
            // w-72 是这一枚浮层的默认宽度，属组件尺寸而非刻度——按 060 §1.2，
            // 组件尺寸归 cva / 组件自身，不进 T2。
            "z-popover w-72 p-lg outline-none",
            panel.base,
            panel.popover,
            overlayMotion,
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Portal>
    );
  },
);

PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverClose };
