"use client";

/* Endpoint — opera-atlas-design.md §6：统一能力入口，业务系统只依赖 Endpoint。 */

import {
  ActionMenu,
  Button,
  DataTable,
  FilterBar,
  Icon,
  Input,
  Kbd,
  ListPageTemplate,
  StatusBadge,
  ViewHeader,
} from "@vxture/design-system";
import { endpoints } from "@/mocks/atlas";

export default function EndpointsPage() {
  return (
    <ListPageTemplate
      header={
        <ViewHeader
          icon="plug"
          title="Endpoint"
          description="统一能力入口（chat/default、embedding/default…）。业务系统永远访问 Endpoint，不直接访问模型。"
          action={
            <Button>
              <Icon name="plus" size="sm" />
              新建 Endpoint
            </Button>
          }
        />
      }
      filters={
        <FilterBar>
          <Input placeholder="搜索 Endpoint…" className="max-w-panel-sm" />
        </FilterBar>
      }
      table={
        <DataTable
          columns={[
            {
              id: "code",
              header: "Endpoint",
              cell: (r) => <Kbd>{r.code}</Kbd>,
            },
            { id: "category", header: "类别", cell: (r) => r.category },
            {
              id: "primary",
              header: "Primary",
              cell: (r) => (
                <span className="text-code-sm">{r.primaryModel}</span>
              ),
            },
            {
              id: "fallback",
              header: "Fallback",
              cell: (r) =>
                r.fallbackModel ? (
                  <span className="text-code-sm">{r.fallbackModel}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                ),
            },
            { id: "qps", header: "QPS", align: "right", cell: (r) => r.qps },
            {
              id: "enabled",
              header: "状态",
              cell: (r) => (
                <StatusBadge tone={r.enabled ? "success" : "neutral"} dot>
                  {r.enabled ? "已启用" : "已停用"}
                </StatusBadge>
              ),
            },
            {
              id: "actions",
              header: "",
              align: "right",
              cell: (r) => (
                <ActionMenu
                  label={`${r.code} 操作`}
                  items={[
                    { id: "route", label: "调整路由", icon: "tree-structure" },
                    { id: "edit", label: "编辑", icon: "edit" },
                    r.enabled
                      ? {
                          id: "disable",
                          label: "停用",
                          icon: "pause",
                          danger: true,
                          separatorBefore: true,
                        }
                      : {
                          id: "enable",
                          label: "启用",
                          icon: "play",
                          separatorBefore: true,
                        },
                  ]}
                />
              ),
            },
          ]}
          rows={endpoints}
          rowKey={(r) => r.id}
        />
      }
    />
  );
}
