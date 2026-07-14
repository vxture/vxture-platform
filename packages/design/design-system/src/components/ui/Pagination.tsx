/**
 * pagination.tsx - Pagination 组件
 * @package @vxture/design-system
 *
 * 功能：跨应用分页控件，统一分页按钮、范围信息与可访问性。
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Navigation
 */

import * as React from "react";
import { cn } from "../../utils/cn";
import { Icon } from "../../icons";
import { Button } from "./Button";

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  readonly page: number;
  readonly pageCount: number;
  readonly total?: number;
  readonly pageSize?: number;
  readonly onPageChange: (page: number) => void;
  readonly previousLabel?: string;
  readonly nextLabel?: string;
}

function getVisiblePages(page: number, pageCount: number) {
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  return Array.from(
    { length: Math.max(0, end - start + 1) },
    (_, index) => start + index,
  );
}

function Pagination({
  className,
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  previousLabel = "上一页",
  nextLabel = "下一页",
  ...props
}: PaginationProps) {
  const safePageCount = Math.max(1, pageCount);
  const safePage = Math.min(Math.max(1, page), safePageCount);
  const pages = getVisiblePages(safePage, safePageCount);
  const from = total && pageSize ? (safePage - 1) * pageSize + 1 : undefined;
  const to =
    total && pageSize ? Math.min(safePage * pageSize, total) : undefined;

  return (
    <nav
      className={cn(
        "vx-pagination flex flex-wrap items-center justify-between gap-3",
        className,
      )}
      aria-label="Pagination"
      {...props}
    >
      <div className="text-sm text-vx-text-muted">
        {typeof from === "number" &&
        typeof to === "number" &&
        typeof total === "number"
          ? `${from}-${to} / ${total}`
          : `第 ${safePage} / ${safePageCount} 页`}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          <Icon name="chevron-left" size={16} aria-hidden="true" />
          {previousLabel}
        </Button>
        {pages.map((item) => (
          <Button
            key={item}
            variant={item === safePage ? "default" : "ghost"}
            size="sm"
            aria-current={item === safePage ? "page" : undefined}
            onClick={() => onPageChange(item)}
          >
            {item}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          disabled={safePage >= safePageCount}
          onClick={() => onPageChange(safePage + 1)}
        >
          {nextLabel}
          <Icon name="chevron-right" size={16} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

export { Pagination };
