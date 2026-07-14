/**
 * switch.tsx - Switch 组件
 * @package @vxture/design-system
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Form
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export interface SwitchProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  readonly onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  function Switch(
    {
      className,
      checked,
      defaultChecked,
      disabled,
      onChange,
      onCheckedChange,
      ...props
    },
    ref,
  ) {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);
      onCheckedChange?.(event.target.checked);
    };

    return (
      <label
        className={cn(
          "vx-switch",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          className="vx-switch__input"
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={handleChange}
          {...props}
        />
        <span className="vx-switch__track" aria-hidden="true" />
      </label>
    );
  },
);

Switch.displayName = "Switch";
