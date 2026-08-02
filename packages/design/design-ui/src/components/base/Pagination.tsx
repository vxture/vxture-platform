/**
 * Pagination.tsx - 分页（自有实现，非 shadcn 上游件）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Navigation
 *
 * 上游 Pagination 是一组基于 <a href> 的组合件，面向 URL 驱动的分页；工作台里的
 * 分页全是受控回调（`page` + `onPageChange`，配合客户端筛选与 pageSize），两者
 * 的取数模型不同，不是同一个东西。故保留受控 API，只把取值换成 T2 语义类。
 *
 * 视觉基座仍是本仓 Button——分页按钮与页面其他按钮的尺寸、焦点环、禁用态由此
 * 自动一致，不另起一套。
 *
 * 原实现挂了 .vx-pagination（随遗留样式层退役），且间距与字号用的是不跟随
 * 密度 / 字号三档的裸数值。
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
        "flex flex-wrap items-center justify-between gap-sm",
        className,
      )}
      aria-label="Pagination"
      {...props}
    >
      <div className="text-body-sm text-muted-foreground">
        {typeof from === "number" &&
        typeof to === "number" &&
        typeof total === "number"
          ? `${from}-${to} / ${total}`
          : `第 ${safePage} / ${safePageCount} 页`}
      </div>
      <div className="flex items-center gap-2xs">
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
