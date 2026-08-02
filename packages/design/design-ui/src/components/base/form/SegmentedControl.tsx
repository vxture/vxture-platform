/**
 * SegmentedControl.tsx - 一组互斥选项，选中项就地高亮。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 取代 `PageSizePicker` 与 `ViewModeSwitch`——两者形状完全相同（一串按钮、一个选中），
 * 只是一个装数字、一个装图标。合成一件后"每页条数"与"列表/卡片"分别退回调用方的
 * 一行 items。
 *
 * 语义用 radiogroup 而非 group：这是单选，键盘用户应当能用方向键在选项间移动。
 * 选中态由本件画（托起的底色片），不再靠调用方挂 `.is-active`——那个类随遗留样式层
 * 一并删除后，两件的选中态实际已经不可见。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { interactive } from "../../../styles/recipes";
import { Icon, type IconName } from "../../../icons";

export type SegmentedControlSize = "sm" | "md";

const BY_SIZE: Record<SegmentedControlSize, string> = {
  sm: "h-control-sm min-w-control-sm px-xs text-label-sm",
  md: "h-control-md min-w-control-md px-sm text-label-md",
};

export interface SegmentedControlItem<TValue extends string | number> {
  readonly value: TValue;
  readonly label?: React.ReactNode;
  readonly icon?: IconName;
  /** 只有图标时必须给，否则读屏没有可念的名字。 */
  readonly ariaLabel?: string;
  readonly disabled?: boolean;
}

export interface SegmentedControlProps<TValue extends string | number> {
  readonly items: readonly SegmentedControlItem<TValue>[];
  readonly value: TValue;
  readonly onChange: (value: TValue) => void;
  readonly size?: SegmentedControlSize;
  readonly ariaLabel?: string;
  readonly className?: string;
}

function SegmentedControl<TValue extends string | number>({
  items,
  value,
  onChange,
  size = "md",
  ariaLabel,
  className,
}: SegmentedControlProps<TValue>) {
  return (
    <div
      role="radiogroup"
      {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
      className={cn(
        "inline-flex items-center gap-2xs rounded-lg bg-accent p-2xs",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={String(item.value)}
            type="button"
            role="radio"
            aria-checked={active}
            {...(item.ariaLabel ? { "aria-label": item.ariaLabel } : {})}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex items-center justify-center gap-2xs rounded-md",
              "border border-transparent",
              interactive,
              BY_SIZE[size],
              active
                ? "bg-card text-foreground shadow-flat"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.icon ? (
              <Icon name={item.icon} size={16} aria-hidden="true" />
            ) : null}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export { SegmentedControl };
