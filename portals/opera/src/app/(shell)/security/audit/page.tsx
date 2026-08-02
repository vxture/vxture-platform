"use client";

/* Audit — opera-top-level-design.md §8：谁 / 什么时间 / 修改什么；
 * Provider / Model / Endpoint / Router / Key 变更全量留痕。 */

import {
  DataTable,
  FilterBar,
  Input,
  ListPageTemplate,
  NativeSelect,
  ViewHeader,
} from "@vxture/design-system";
import { auditTrail } from "@/mocks/atlas";

export default function AuditPage() {
  return (
    <ListPageTemplate
      header={
        <ViewHeader
          icon="clipboard"
          title="Audit"
          description="配置变更审计：谁、什么时间、改了什么。只读，不可删改。"
        />
      }
      filters={
        <FilterBar>
          <Input placeholder="搜索对象 / 操作者…" className="max-w-panel-sm" />
          <NativeSelect
            wrapperClassName="w-fit"
            defaultValue="all"
            aria-label="动作筛选"
          >
            <option value="all">全部动作</option>
            <option>Router 变更</option>
            <option>Key 轮换</option>
            <option>Provider 禁用</option>
            <option>Model 注册</option>
          </NativeSelect>
        </FilterBar>
      }
      table={
        <DataTable
          columns={[
            { id: "time", header: "时间", cell: (r) => r.time },
            { id: "actor", header: "操作者", cell: (r) => r.actor },
            { id: "action", header: "动作", cell: (r) => r.action },
            {
              id: "target",
              header: "对象",
              cell: (r) => (
                <span className="text-label-md text-foreground">
                  {r.target}
                </span>
              ),
            },
            {
              id: "detail",
              header: "明细",
              cell: (r) => (
                <span className="text-body-sm text-muted-foreground">
                  {r.detail}
                </span>
              ),
            },
          ]}
          rows={auditTrail}
          rowKey={(r) => r.id}
        />
      }
    />
  );
}
