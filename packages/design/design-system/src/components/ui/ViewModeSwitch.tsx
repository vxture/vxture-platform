/**
 * view-mode-switch.tsx - 列表/卡片视图切换 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { Icon } from "../../icons";
import { Button } from "./Button";

export type ViewModeSwitchValue = "list" | "cards";

export interface ViewModeSwitchProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  readonly value: ViewModeSwitchValue;
  readonly onChange: (mode: ViewModeSwitchValue) => void;
  readonly ariaLabel?: string;
  readonly listLabel?: string;
  readonly cardsLabel?: string;
}

export function ViewModeSwitch({
  value,
  onChange,
  ariaLabel = "展示方式",
  listLabel = "列表",
  cardsLabel = "卡片",
  ...props
}: ViewModeSwitchProps) {
  return (
    <div
      className="vx-view-mode-switch"
      role="group"
      aria-label={ariaLabel}
      {...props}
    >
      <Button
        variant="ghost"
        size="icon"
        className={value === "list" ? "is-active" : undefined}
        onClick={() => onChange("list")}
        aria-label={listLabel}
        title={listLabel}
      >
        <Icon name="list" size="lg" fallback="placeholder" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={value === "cards" ? "is-active" : undefined}
        onClick={() => onChange("cards")}
        aria-label={cardsLabel}
        title={cardsLabel}
      >
        <Icon name="squares-four" size="lg" fallback="placeholder" />
      </Button>
    </div>
  );
}
