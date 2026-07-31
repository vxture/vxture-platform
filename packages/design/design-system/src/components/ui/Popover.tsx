/**
 * Popover.tsx - 气泡浮层。
 * @package @vxture/design-system
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Floating
 */

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "../../utils/cn";

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
            "z-popover w-72 rounded-lg border border-border bg-popover p-lg text-foreground shadow-overlay outline-none",
            "duration-fast ease-enter data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
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
