/**
 * button.tsx - Button 组件
 * @package @vxture/design-system
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Common
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../utils/cn";
import type { ButtonVariant, ButtonSize } from "./Button.types";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly asChild?: boolean;
}

const buttonVariants = ({
  variant,
  size,
}: {
  variant: ButtonVariant;
  size: ButtonSize;
}) => {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-vx-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vx-ring-strong focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
      "bg-vx-primary text-vx-text-inverse hover:bg-vx-primary-strong":
        variant === "default",
      "bg-vx-danger text-vx-text-inverse hover:bg-vx-danger-strong":
        variant === "destructive",
      "border border-vx-border bg-vx-surface hover:bg-vx-surface-muted hover:text-vx-text-primary":
        variant === "outline",
      "bg-vx-surface-muted text-vx-text-primary hover:bg-vx-primary-soft":
        variant === "secondary",
      "hover:bg-vx-surface-muted hover:text-vx-text-primary":
        variant === "ghost",
      "text-vx-text-primary underline-offset-4 hover:underline":
        variant === "link",
    },
    {
      "h-10 px-4 py-2": size === "default",
      "h-9 rounded-md px-3": size === "sm",
      "h-11 rounded-md px-8": size === "lg",
      "h-10 w-10": size === "icon",
    },
  );
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "default",
    size = "default",
    asChild = false,
    type,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? type : (type ?? "button")}
      className={cn(
        buttonVariants({ variant, size }),
        "vx-btn",
        `vx-btn--${variant}`,
        `vx-btn--${size}`,
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
