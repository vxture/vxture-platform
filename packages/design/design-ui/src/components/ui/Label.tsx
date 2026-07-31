/**
 * Label.tsx - 表单标签。
 * @package @vxture/design-ui
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Form
 */

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "../../utils/cn";

export interface LabelProps extends React.ComponentPropsWithoutRef<
  typeof LabelPrimitive.Root
> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  function Label({ className, ...props }, ref) {
    return (
      <LabelPrimitive.Root
        ref={ref}
        className={cn(
          "text-label-md text-foreground",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-disabled",
          className,
        )}
        {...props}
      />
    );
  },
);

Label.displayName = LabelPrimitive.Root.displayName;
