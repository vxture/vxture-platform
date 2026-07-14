/**
 * page-size-picker.tsx - 分页尺寸选择 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { cn } from "../../utils/cn";
import { Button } from "./Button";
import type { ButtonVariant } from "./Button.types";

export interface PageSizePickerProps<
  TValue extends number | string = number,
> extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  readonly options: readonly TValue[];
  readonly value: TValue;
  readonly onChange: (value: TValue) => void;
  readonly activeVariant?: ButtonVariant;
  readonly inactiveVariant?: ButtonVariant;
  readonly optionAriaLabel?: (value: TValue) => string;
}

function PageSizePicker<TValue extends number | string = number>({
  className,
  options,
  value,
  onChange,
  activeVariant = "secondary",
  inactiveVariant = "ghost",
  optionAriaLabel = (option) => `每页 ${option} 条`,
  "aria-label": ariaLabel = "每页条数",
  ...props
}: PageSizePickerProps<TValue>) {
  return (
    <div
      className={cn("vx-page-size-picker", className)}
      aria-label={ariaLabel}
      {...props}
    >
      {options.map((option) => {
        const active = value === option;

        return (
          <span key={String(option)}>
            <Button
              variant={active ? activeVariant : inactiveVariant}
              size="sm"
              className={active ? "is-active" : undefined}
              onClick={() => onChange(option)}
              aria-label={optionAriaLabel(option)}
            >
              {option}
            </Button>
          </span>
        );
      })}
    </div>
  );
}

export { PageSizePicker };
