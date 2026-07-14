/**
 * action-button.tsx - 带图标的操作按钮 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { Icon } from "../../icons";
import type { IconName, IconSize } from "../../icons";
import { Button } from "./Button";
import type { ButtonProps } from "./Button";

export interface ActionButtonProps extends Omit<ButtonProps, "children"> {
  readonly children: React.ReactNode;
  readonly icon: IconName;
  readonly iconFallback?: IconName;
  readonly iconSize?: IconSize | number;
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  function ActionButton(
    {
      children,
      icon,
      iconFallback = "placeholder",
      iconSize = "xs",
      size = "sm",
      ...props
    },
    ref,
  ) {
    return (
      <Button ref={ref} size={size} {...props}>
        <Icon
          name={icon}
          size={iconSize}
          fallback={iconFallback}
          className="vx-btn__icon"
        />
        <span>{children}</span>
      </Button>
    );
  },
);

ActionButton.displayName = "ActionButton";

export { ActionButton };
