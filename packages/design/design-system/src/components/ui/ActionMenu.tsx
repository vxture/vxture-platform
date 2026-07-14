/**
 * action-menu.tsx - ActionMenu 组件
 * @package @vxture/design-system
 *
 * 功能：跨应用行操作菜单，统一触发器、禁用态与危险操作样式。
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Navigation
 */

import * as React from "react";
import { cn } from "../../utils/cn";
import { Icon } from "../../icons";
import { Button, type ButtonProps } from "./Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./DropdownMenu";

export interface ActionMenuItem {
  readonly id: string;
  readonly label: React.ReactNode;
  readonly icon?: React.ReactNode;
  readonly title?: string | undefined;
  readonly disabled?: boolean;
  readonly danger?: boolean;
  readonly separatorBefore?: boolean;
  readonly onSelect?: () => void;
}

export interface ActionMenuProps {
  readonly items: readonly ActionMenuItem[];
  readonly label?: string;
  readonly align?: "start" | "center" | "end";
  readonly triggerClassName?: string;
  readonly contentClassName?: string;
  readonly triggerProps?: Omit<ButtonProps, "children" | "asChild">;
}

function ActionMenu({
  items,
  label = "打开操作菜单",
  align = "end",
  triggerClassName,
  contentClassName,
  triggerProps,
}: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          {...triggerProps}
          className={cn(
            "vx-action-menu__trigger",
            triggerClassName,
            triggerProps?.className,
          )}
        >
          <Icon name="more-vertical" size={18} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn("vx-action-menu__content", contentClassName)}
      >
        {items.map((item) => (
          <React.Fragment key={item.id}>
            {item.separatorBefore ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              {...(item.disabled !== undefined
                ? { disabled: item.disabled }
                : {})}
              {...(item.title !== undefined ? { title: item.title } : {})}
              {...(item.onSelect !== undefined
                ? { onSelect: item.onSelect }
                : {})}
              className={cn(
                "vx-action-menu__item gap-2",
                item.danger && "text-vx-danger focus:text-vx-danger",
              )}
            >
              {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
              <span className="min-w-0 truncate">{item.label}</span>
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ActionMenu };
