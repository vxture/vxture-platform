/**
 * data-table.tsx - DataTable 组件
 * @package @vxture/design-system
 *
 * 功能：跨应用数据表格骨架，统一表头、空态、加载态与行交互。
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Data Display
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export type DataTableAlign = "left" | "center" | "right";

export interface DataTableColumn<TRow> {
  readonly id: string;
  readonly header: React.ReactNode;
  readonly cell: (row: TRow, rowIndex: number) => React.ReactNode;
  readonly align?: DataTableAlign;
  readonly className?: string;
  readonly headerClassName?: string;
  readonly cellClassName?: string;
}

export interface DataTableProps<TRow> extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> {
  readonly columns: readonly DataTableColumn<TRow>[];
  readonly rows: readonly TRow[];
  readonly rowKey: (row: TRow, rowIndex: number) => React.Key;
  readonly empty?: React.ReactNode;
  readonly loading?: boolean;
  readonly loadingLabel?: React.ReactNode;
  readonly onRowClick?: (row: TRow, rowIndex: number) => void;
  readonly getRowClassName?: (
    row: TRow,
    rowIndex: number,
  ) => string | undefined;
}

const alignClasses: Record<DataTableAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function DataTable<TRow>({
  className,
  columns,
  rows,
  rowKey,
  empty = "暂无数据",
  loading = false,
  loadingLabel = "加载中...",
  onRowClick,
  getRowClassName,
  ...props
}: DataTableProps<TRow>) {
  const colSpan = Math.max(columns.length, 1);
  return (
    <div
      className={cn(
        "vx-data-table overflow-hidden rounded-lg border border-vx-border bg-vx-surface",
        className,
      )}
      {...props}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-vx-surface-muted text-vx-text-muted">
            <tr>
              {columns.map((column) => {
                const align = column.align ?? "left";
                return (
                  <th
                    key={column.id}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap px-4 py-3 font-semibold",
                      alignClasses[align],
                      column.className,
                      column.headerClassName,
                    )}
                  >
                    {column.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-vx-border">
            {loading ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-vx-text-muted"
                >
                  {loadingLabel}
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row, rowIndex) => (
                <tr
                  key={rowKey(row, rowIndex)}
                  className={cn(
                    "transition-colors hover:bg-vx-surface-muted/60",
                    onRowClick && "cursor-pointer",
                    getRowClassName?.(row, rowIndex),
                  )}
                  onClick={
                    onRowClick ? () => onRowClick(row, rowIndex) : undefined
                  }
                >
                  {columns.map((column) => {
                    const align = column.align ?? "left";
                    return (
                      <td
                        key={column.id}
                        className={cn(
                          "px-4 py-3 align-middle text-vx-text-primary",
                          alignClasses[align],
                          column.className,
                          column.cellClassName,
                        )}
                      >
                        {column.cell(row, rowIndex)}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-8 text-center text-vx-text-muted"
                >
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { DataTable };
