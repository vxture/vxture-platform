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
 */

import * as React from "react";
import { cn } from "../../utils/cn";
import { Icon } from "../../icons";
import { Checkbox } from "../ui/Checkbox";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "./EmptyState";

export type DataTableAlign = "left" | "center" | "right";

export type DataTableSortDirection = "asc" | "desc";

const ALIGN: Record<DataTableAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

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
  readonly onRowClick?: (row: TRow, rowIndex: number) => void;
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
  onRowClick,
  className,
}: DataTableProps<TRow>) {
  const selectable = selectedKeys !== undefined;
  const selected = React.useMemo(
    () => new Set(selectedKeys ?? []),
    [selectedKeys],
  );
  const keys = rows.map((row, i) => rowKey(row, i));
  const allSelected = keys.length > 0 && keys.every((k) => selected.has(k));
  const someSelected = !allSelected && keys.some((k) => selected.has(k));
  const colSpan = columns.length + (selectable ? 1 : 0);

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
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-body-sm">
          <thead className="border-b border-border bg-accent text-muted-foreground">
            <tr>
              {selectable ? (
                <th scope="col" className="w-px px-md py-sm">
                  <Checkbox
                    checked={allSelected || (someSelected && "indeterminate")}
                    onCheckedChange={toggleAll}
                    aria-label={allSelected ? "取消全选" : "全选本页"}
                  />
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
                          "inline-flex items-center gap-2xs rounded-sm outline-none",
                          "transition-colors duration-fast ease-standard",
                          "focus-visible:ring-[3px] focus-visible:ring-ring/50",
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
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: loadingRows }, (_, i) => (
                <tr key={`skeleton-${i}`} aria-hidden="true">
                  {Array.from({ length: colSpan }, (_, c) => (
                    <td key={c} className="px-md py-sm">
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
                      "transition-colors duration-fast ease-standard",
                      isSelected ? "bg-surface-selected" : "hover:bg-accent",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {selectable ? (
                      <td
                        className="w-px px-md py-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(key)}
                          aria-label="选择本行"
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={cn(
                          "px-md py-sm align-middle text-foreground",
                          ALIGN[column.align ?? "left"],
                        )}
                      >
                        {column.cell(row, rowIndex)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { DataTable };
