/**
 * ActionMenu.tsx - 行操作菜单（表格行尾的"⋮"）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 数据驱动：调用方给 `items`，不给 markup。触发器形态、危险项配色、分隔位置都由
 * 本件固定，各处不会长得不一样。
 *
 * 相对原实现：`icon` 从 `ReactNode` 收为 `IconName`——传 node 等于把图标尺寸和
 * 颜色的决定权交回调用方，行内菜单最容易在这里长歪；删 `triggerClassName` /
 * `contentClassName` / `triggerProps` 三个逃生口。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { Icon, type IconName } from "../../../icons";
import { Button } from "../../base/form/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../base/overlay/DropdownMenu";

export interface ActionMenuItem {
  readonly id: string;
  readonly label: React.ReactNode;
  readonly icon?: IconName;
  readonly disabled?: boolean;
  /** 危险动作，用 destructive 语义色。 */
  readonly danger?: boolean;
  /** 在本项之前插一条分隔线，用于把危险动作与常规动作分开。 */
  readonly separatorBefore?: boolean;
  readonly onSelect?: () => void;
}

export interface ActionMenuProps {
  readonly items: readonly ActionMenuItem[];
  readonly label?: string;
  readonly align?: "start" | "center" | "end";
}

function ActionMenu({
  items,
  label = "打开操作菜单",
  align = "end",
}: ActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label}>
          <Icon name="more-vertical" size={16} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {items.map((item) => (
          <React.Fragment key={item.id}>
            {item.separatorBefore ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              {...(item.disabled !== undefined
                ? { disabled: item.disabled }
                : {})}
              {...(item.onSelect !== undefined
                ? { onSelect: item.onSelect }
                : {})}
              className={cn(
                "gap-xs",
                // 悬停时给一层淡底而不是把整条变实心红——菜单里危险项常和常规项
                // 挨着，实心底会让整个菜单看起来在报警。与 Button / Badge 同一判断。
                item.danger &&
                  "text-destructive-text focus:bg-destructive-muted focus:text-destructive-muted-foreground",
              )}
            >
              {item.icon ? (
                <Icon name={item.icon} size={16} aria-hidden="true" />
              ) : null}
              <span className="min-w-0 truncate">{item.label}</span>
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ActionMenu };
