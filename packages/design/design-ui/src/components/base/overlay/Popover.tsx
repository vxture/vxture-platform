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
import { cn } from "../../../utils/cn";
import { overlayMotion, panel } from "../../../styles/recipes";

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
/**
 * 定位锚点，与触发器解耦。用在"浮层的开合由别的东西决定、但要贴着某个元素
 * 定位"的场合——典型是行内搜索：输入框本身不是触发器（点它要落焦点、不是
 * 开浮层），结果面板由"有没有输入"决定开合，位置贴着输入框。
 */
const PopoverAnchor = PopoverPrimitive.Anchor;

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
            // w-72 是这一枚浮层的默认宽度，属组件尺寸而非刻度——按 design-system/docs/01-usage.md §3，
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

export { Popover, PopoverAnchor, PopoverTrigger, PopoverContent, PopoverClose };
