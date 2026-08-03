/**
 * TableTitleCell.tsx - 列表主列的两行单元格：主信息 + 辅助信息。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * admin 租户列表的行模式（owner 拍板保留，2026-08-03）：每行两层——主信息一行
 * （可点进详情），辅助信息一行（编码、区域一类的补充事实）。提炼成标准件后，
 * 各列表不再各写一遍 flex-col。
 *
 * 相对 admin 的修正：辅助行走 `text-body-sm` 常规字重——admin 的辅助信息用了
 * 700+ 的字重，主辅层次靠字重打架；DS 里层次由字号与前景色表达。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { interactive } from "../../../styles/recipes";
import { Icon, type IconName } from "../../../icons";

export interface TableTitleCellProps {
  readonly title: React.ReactNode;
  /** 辅助信息行：编码、区域、时间一类的补充事实。 */
  readonly description?: React.ReactNode;
  readonly icon?: IconName;
  /** 给了主信息就渲染成链接样式的按钮（进详情），不给就是纯文本。 */
  readonly onTitleClick?: () => void;
  readonly className?: string;
}

function TableTitleCell({
  title,
  description,
  icon,
  onTitleClick,
  className,
}: TableTitleCellProps) {
  return (
    <span className={cn("flex min-w-0 items-center gap-sm", className)}>
      {icon ? (
        <Icon
          name={icon}
          size="sm"
          aria-hidden="true"
          className="shrink-0 text-muted-foreground"
        />
      ) : null}
      <span className="flex min-w-0 flex-col gap-2xs">
        {onTitleClick ? (
          <button
            type="button"
            onClick={onTitleClick}
            className={cn(
              "self-start truncate rounded-sm text-label-md text-foreground",
              interactive,
              "hover:text-primary-text hover:underline",
            )}
          >
            {title}
          </button>
        ) : (
          <span className="truncate text-label-md text-foreground">
            {title}
          </span>
        )}
        {description ? (
          <span className="truncate text-body-sm text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export { TableTitleCell };
