/**
 * Checkbox.tsx - 复选框。
 * @package @vxture/design-ui
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Form
 *
 * 结构照 shadcn 官方 Checkbox，只把取值换成 DS 的 T2 语义类。不加 shadcn 没有
 * 的变体：尺寸由调用方经 className 覆写，与上游一致。
 *
 * 一处必要的偏离：补上半选态。上游只认 checked，`checked="indeterminate"` 时框不填色、
 * 却照样画勾，看上去像个坏掉的选中态。半选画短横、同样填色——`DataTable` 的表头
 * 复选框要的就是它。
 */

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "../../utils/cn";
import { Icon } from "../../icons";

export interface CheckboxProps extends React.ComponentPropsWithoutRef<
  typeof CheckboxPrimitive.Root
> {}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  function Checkbox({ className, ...props }, ref) {
    return (
      <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
          "peer group size-icon-md shrink-0 rounded-sm border border-foreground",
          // 焦点环与 Button / Input / Switch 统一，不用上游旧版的 ring-offset 写法
          "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
          "disabled:cursor-not-allowed disabled:opacity-disabled",
          "data-[state=checked]:bg-primary data-[state=checked]:text-content-on-fill",
          "data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-content-on-fill",
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          className={cn("flex items-center justify-center text-current")}
        >
          <Icon
            name="check"
            size={16}
            className="group-data-[state=indeterminate]:hidden"
          />
          <Icon
            name="minus"
            size={16}
            className="hidden group-data-[state=indeterminate]:block"
          />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  },
);

Checkbox.displayName = CheckboxPrimitive.Root.displayName;
