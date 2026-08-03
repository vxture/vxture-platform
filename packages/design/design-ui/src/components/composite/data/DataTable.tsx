/**
 * DataTable.tsx - 表格骨架。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 列由 `columns` 描述，单元格取值由 `cell` 回调给出——DS 不认业务字段，只认形状。
 *
 * 三态一次定齐：加载中出骨架行（保持表格高度，不让页面跳），空态出 `EmptyState`，
 * 有数据出行。原实现三者是三段各写各的 markup，加载与空态都只有一行居中文字。
 *
 * 选择态由本件出复选框，`selectedKeys` 受控——`BulkActionBar` 要的就是这个集合，
 * 两件对得上才不会各自实现一遍全选/半选。表头那个复选框的半选态必须走
 * `indeterminate`，不能靠给它换个图标。
 *
 * 相对原实现：删 `className` / `headerClassName` / `cellClassName` 三个列级逃生口
 * （列的对齐由 `align` 表达，其余交给单元格内容）与 `getRowClassName`——按行改样式
 * 等于把行的视觉状态交回调用方，行选中与行禁用本件自己画。
 *
 * 透明模式（workplan §1 V5）：表格不套容器卡。它直接浮在页面底色上，结构由
 * 三条线定义——顶边实线开区块，表头下实线，行间虚线。首末列内边距归零，
 * 让表格文字与上下文的左右缘对齐（admin 的表格就是靠这个嵌进页面的）。
 * 表头与数据行共用同一个 `align` 轴——admin 表头居中、行左对齐的轴冲突（X1）
 * 在这里从结构上不可能发生。
 *
 * 选择列 / 序号列固定宽（`w-control-3xl`，约 64px）、内容居中，且**不**参与
 * 首末列零边距——`first:` 选择器认的是 DOM 里真实的第一个 `<td>`，选择列一旦
 * 存在就是它，零边距会把复选框顶到容器边界外观（2026-08-03 owner 实测抓到）。
 * 零边距的意图仍在：没有选择/序号列时，业务首列照常贴边对齐上下文。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { hairline, interactive } from "../../../styles/recipes";
import { Icon } from "../../../icons";
import { Checkbox } from "../../base/form/Checkbox";
import { Skeleton } from "../../base/display/Skeleton";
import { EmptyState } from "../../base/display/EmptyState";

export type DataTableAlign = "left" | "center" | "right";

export type DataTableSortDirection = "asc" | "desc";

const ALIGN: Record<DataTableAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/** 选择列 / 序号列共用：固定宽、居中，不吃首列零边距。 */
const EDGE_COL = "w-control-3xl px-md text-center";

export interface DataTableColumn<TRow> {
  readonly id: string;
  readonly header: React.ReactNode;
  readonly cell: (row: TRow, rowIndex: number) => React.ReactNode;
  readonly align?: DataTableAlign;
  /** 可排序。排序本身由调用方做，本件只出表头控件与方向指示。 */
  readonly sortable?: boolean;
}

export interface DataTableSort {
  readonly columnId: string;
  readonly direction: DataTableSortDirection;
}

export interface DataTableProps<TRow> {
  readonly columns: readonly DataTableColumn<TRow>[];
  readonly rows: readonly TRow[];
  readonly rowKey: (row: TRow, rowIndex: number) => string;
  readonly loading?: boolean;
  /** 加载态渲染多少条骨架行。取列表常用页长的一半即可，只为撑住高度。 */
  readonly loadingRows?: number;
  readonly emptyTitle?: React.ReactNode;
  readonly emptyDescription?: React.ReactNode;
  readonly emptyAction?: React.ReactNode;
  readonly sort?: DataTableSort;
  readonly onSortChange?: (sort: DataTableSort) => void;
  /** 给了才出复选框列。 */
  readonly selectedKeys?: readonly string[];
  readonly onSelectionChange?: (keys: readonly string[]) => void;
  /**
   * 给了才出序号列（复选框之后、首业务列之前），值为本页首行的序号——
   * 翻页时由调用方递进（`(page-1)*pageSize+1`），本件不认分页。
   */
  readonly indexStart?: number;
  /**
   * 给了才出行操作列：钉在最右、横向滚动时锁定不动（admin 列锁定惯例）。
   * 单元格点击不冒泡到 `onRowClick`——行点击是选择/进详情，操作是操作。
   */
  readonly rowActions?: (row: TRow, rowIndex: number) => React.ReactNode;
  readonly rowActionsHeader?: React.ReactNode;
  readonly onRowClick?: (row: TRow, rowIndex: number) => void;
  /** 表尾：分页、总数一类。渲染在虚线上边框之下，左右两端由调用方内容自摆。 */
  readonly footer?: React.ReactNode;
  readonly className?: string;
}

function nextDirection(
  sort: DataTableSort | undefined,
  columnId: string,
): DataTableSortDirection {
  return sort?.columnId === columnId && sort.direction === "asc"
    ? "desc"
    : "asc";
}

function DataTable<TRow>({
  columns,
  rows,
  rowKey,
  loading = false,
  loadingRows = 5,
  emptyTitle = "暂无数据",
  emptyDescription,
  emptyAction,
  sort,
  onSortChange,
  selectedKeys,
  onSelectionChange,
  indexStart,
  rowActions,
  rowActionsHeader = "操作",
  onRowClick,
  footer,
  className,
}: DataTableProps<TRow>) {
  const selectable = selectedKeys !== undefined;
  const indexed = indexStart !== undefined;
  const selected = React.useMemo(
    () => new Set(selectedKeys ?? []),
    [selectedKeys],
  );
  const keys = rows.map((row, i) => rowKey(row, i));
  const allSelected = keys.length > 0 && keys.every((k) => selected.has(k));
  const someSelected = !allSelected && keys.some((k) => selected.has(k));
  const colSpan =
    columns.length +
    (selectable ? 1 : 0) +
    (indexed ? 1 : 0) +
    (rowActions ? 1 : 0);

  const toggleAll = () => {
    onSelectionChange?.(allSelected ? [] : keys);
  };

  const toggleRow = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange?.([...next]);
  };

  return (
    <div className={cn("border-t", hairline.block, className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-body-sm">
          <thead
            className={cn("border-b", hairline.block, "text-muted-foreground")}
          >
            <tr>
              {selectable ? (
                <th scope="col" className={cn(EDGE_COL, "py-sm")}>
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={allSelected || (someSelected && "indeterminate")}
                      onCheckedChange={toggleAll}
                      aria-label={allSelected ? "取消全选" : "全选本页"}
                    />
                  </div>
                </th>
              ) : null}
              {indexed ? (
                <th
                  scope="col"
                  className={cn(
                    EDGE_COL,
                    "py-sm whitespace-nowrap text-label-sm",
                  )}
                >
                  序号
                </th>
              ) : null}
              {columns.map((column) => {
                const align = column.align ?? "left";
                const active = sort?.columnId === column.id;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      active
                        ? sort.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={cn(
                      "whitespace-nowrap px-md py-sm text-label-sm",
                      "first:pl-none last:pr-none",
                      ALIGN[align],
                    )}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() =>
                          onSortChange({
                            columnId: column.id,
                            direction: nextDirection(sort, column.id),
                          })
                        }
                        className={cn(
                          "inline-flex items-center gap-2xs rounded-sm",
                          interactive,
                          active ? "text-foreground" : "hover:text-foreground",
                        )}
                      >
                        {column.header}
                        <Icon
                          name={
                            active && sort.direction === "desc"
                              ? "arrow-down"
                              : "arrow-up"
                          }
                          size={16}
                          aria-hidden="true"
                          className={active ? undefined : "opacity-muted"}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {rowActions ? (
                <th
                  scope="col"
                  className="sticky right-0 w-px whitespace-nowrap bg-background px-md py-sm text-center text-label-sm"
                >
                  {rowActionsHeader}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: loadingRows }, (_, i) => (
                <tr key={`skeleton-${i}`} aria-hidden="true">
                  {Array.from({ length: colSpan }, (_, c) => (
                    <td
                      key={c}
                      className="px-md py-sm first:pl-none last:pr-none"
                    >
                      <Skeleton className="h-control-xs w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="p-lg">
                  <EmptyState
                    icon="list"
                    title={emptyTitle}
                    {...(emptyDescription !== undefined
                      ? { description: emptyDescription }
                      : {})}
                    {...(emptyAction !== undefined
                      ? { action: emptyAction }
                      : {})}
                  />
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => {
                const key = keys[rowIndex] as string;
                const isSelected = selected.has(key);
                return (
                  <tr
                    key={key}
                    {...(selectable ? { "aria-selected": isSelected } : {})}
                    onClick={
                      onRowClick ? () => onRowClick(row, rowIndex) : undefined
                    }
                    className={cn(
                      "group border-b last:border-b-0",
                      hairline.field,
                      "transition-colors duration-fast ease-standard",
                      isSelected ? "bg-surface-selected" : "hover:bg-accent",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {selectable ? (
                      <td
                        className={cn(EDGE_COL, "py-md align-middle")}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(key)}
                            aria-label="选择本行"
                          />
                        </div>
                      </td>
                    ) : null}
                    {indexed ? (
                      <td
                        className={cn(
                          EDGE_COL,
                          "py-md align-middle whitespace-nowrap text-body-sm text-muted-foreground",
                        )}
                      >
                        {indexStart + rowIndex}
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={cn(
                          "px-md py-md align-middle text-foreground",
                          "first:pl-none last:pr-none",
                          ALIGN[column.align ?? "left"],
                        )}
                      >
                        {column.cell(row, rowIndex)}
                      </td>
                    ))}
                    {rowActions ? (
                      /* 锁定列自己铺底：横向滚动时业务列从其下方经过，
                         bg-background 垫底、行 hover/选中态在其上再铺一层，
                         与行的视觉状态保持同步。h-full：内层 div 默认只随内容
                         撑高，行内别的单元格更高（如两行主列）时它会矮一截，
                         hover/选中背景上下留白（2026-08-03 owner 实测抓到）——
                         撑满单元格高度才能让背景条与整行同高。 */
                      <td
                        className="sticky right-0 w-px whitespace-nowrap bg-background p-none align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className={cn(
                            "flex h-full items-center justify-end px-md",
                            "transition-colors duration-fast ease-standard",
                            isSelected
                              ? "bg-surface-selected"
                              : "group-hover:bg-accent",
                          )}
                        >
                          {rowActions(row, rowIndex)}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {footer ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-sm border-t py-md",
            hairline.field,
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export { DataTable };
