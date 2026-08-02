/**
 * ListPageTemplate.tsx - 标准列表页骨架。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Template
 *
 * 模板层只定结构与区块占位：页头 → 筛选行 → 批量操作条 → 表格，自上而下。
 * 每个槽收什么由调用方决定（header 放 ViewHeader、filters 放 FilterBar、
 * bulkBar 放 BulkActionBar、table 放 DataTable 是典型组合），模板不含任何
 * 文案默认值——DS 零业务，列表页"长什么样"在这里，"列什么"永远在产品侧。
 *
 * 纵向节奏两档：页头与列表区之间走 ViewLayout 的 `gap-xl`（板块间距）；
 * 筛选行 / 批量条 / 表格三者是**同一个板块的三段**，收紧到 `gap-sm`——
 * 批量条出现与消失（BulkActionBar count 归零返回 null）时，表格只在这一小段
 * 距离里位移，节奏不散。
 *
 * 响应式：本件不设断点。FilterBar 自己 flex-wrap、DataTable 自己横向滚动，
 * 窄屏行为由下两层各管各的，模板重复定一遍只会打架。
 */

import * as React from "react";
import { ViewLayout } from "../layout/ViewLayout";

export interface ListPageTemplateProps {
  /** 页头槽，通常是 ViewHeader。 */
  readonly header?: React.ReactNode;
  /** 筛选行槽，通常是 FilterBar。 */
  readonly filters?: React.ReactNode;
  /** 批量操作条槽，通常是 BulkActionBar——无选中时它自己返回 null。 */
  readonly bulkBar?: React.ReactNode;
  /** 表格槽，通常是 DataTable。 */
  readonly table: React.ReactNode;
  readonly className?: string;
}

export function ListPageTemplate({
  header,
  filters,
  bulkBar,
  table,
  className,
}: ListPageTemplateProps) {
  return (
    <ViewLayout {...(className !== undefined ? { className } : {})}>
      {header}
      <div className="flex flex-col gap-sm">
        {filters}
        {bulkBar}
        {table}
      </div>
    </ViewLayout>
  );
}
