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
import { cn } from "../../../utils/cn";
import { Icon } from "../../../icons";
import { Button } from "../form/Button";
import { SegmentedControl } from "../form/SegmentedControl";

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  readonly page: number;
  readonly pageCount: number;
  readonly total?: number;
  /** 筛选后的条数：与 `total` 不同时，左侧计数语补"当前筛选 N 条"。 */
  readonly filteredTotal?: number;
  readonly pageSize?: number;
  /** 给了 `onPageSizeChange` 才出"每页 N 条"选择器（翻页条左邻）。 */
  readonly pageSizeOptions?: readonly number[];
  readonly onPageSizeChange?: (pageSize: number) => void;
  readonly onPageChange: (page: number) => void;
  readonly previousLabel?: string;
  readonly nextLabel?: string;
}

const DEFAULT_PAGE_SIZES = [10, 20, 50, 100] as const;

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
  filteredTotal,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  onPageSizeChange,
  onPageChange,
  previousLabel = "上一页",
  nextLabel = "下一页",
  ...props
}: PaginationProps) {
  const safePageCount = Math.max(1, pageCount);
  const safePage = Math.min(Math.max(1, page), safePageCount);
  const pages = getVisiblePages(safePage, safePageCount);

  return (
    <nav
      className={cn(
        "flex flex-wrap items-center justify-between gap-sm",
        className,
      )}
      aria-label="Pagination"
      {...props}
    >
      {/* 左侧计数语（admin 翻页惯例）：总数常驻，筛选生效时补一段。 */}
      <div className="text-body-sm text-muted-foreground">
        {typeof total === "number"
          ? `共 ${total} 条记录${
              typeof filteredTotal === "number" && filteredTotal !== total
                ? ` / 当前筛选 ${filteredTotal} 条`
                : ""
            }`
          : `第 ${safePage} / ${safePageCount} 页`}
      </div>
      <div className="flex flex-wrap items-center gap-sm">
        {onPageSizeChange && typeof pageSize === "number" ? (
          /* 按钮化的每页条数（承旧 PageSizePicker，载体为 SegmentedControl）：
             档位全部可见、一次点击到位，不走"点开—找—再点"的下拉。 */
          <span className="flex items-center gap-xs">
            <span className="whitespace-nowrap text-body-sm text-muted-foreground">
              每页
            </span>
            <SegmentedControl
              size="sm"
              ariaLabel="每页条数"
              value={pageSize}
              onChange={onPageSizeChange}
              items={pageSizeOptions.map((option) => ({
                value: option,
                label: option,
              }))}
            />
            <span className="whitespace-nowrap text-body-sm text-muted-foreground">
              条
            </span>
          </span>
        ) : null}
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
      </div>
    </nav>
  );
}

export { Pagination };
