/**
 * Checkbox.tsx - 复选框。
 * @package @vxture/design-system
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Form
 *
 * 结构照 shadcn 官方 Checkbox，只把取值换成 DS 的 T2 语义类。不加 shadcn 没有
 * 的变体：尺寸由调用方经 className 覆写，与上游一致。
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
          "peer size-icon-md shrink-0 rounded-sm border border-foreground",
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-disabled",
          "data-[state=checked]:bg-primary data-[state=checked]:text-content-on-fill",
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator
          className={cn("flex items-center justify-center text-current")}
        >
          <Icon name="check" size={16} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );
  },
);

Checkbox.displayName = CheckboxPrimitive.Root.displayName;
