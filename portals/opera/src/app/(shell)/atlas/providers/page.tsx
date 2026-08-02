"use client";

/* Provider — opera-atlas-design.md §4：CRUD + 健康检查（功能排期，界面先行）。 */

import {
  ActionMenu,
  Button,
  DataTable,
  FilterBar,
  Icon,
  Input,
  ListPageTemplate,
  NativeSelect,
  StatusBadge,
  ViewHeader,
} from "@vxture/design-system";
import { providers } from "@/mocks/atlas";
import { RESOURCE_STATUS_META } from "@/lib/status";

export default function ProvidersPage() {
  return (
    <ListPageTemplate
      header={
        <ViewHeader
          icon="plugs-connected"
          title="Provider"
          description="模型供应商接入：区域、代理出口、健康检查与延迟画像。"
          action={
            <Button>
              <Icon name="plus" size="sm" />
              接入 Provider
            </Button>
          }
        />
      }
      filters={
        <FilterBar>
          <Input placeholder="搜索 Provider…" className="max-w-panel-sm" />
          <NativeSelect
            wrapperClassName="w-fit"
            defaultValue="all"
            aria-label="状态筛选"
          >
            <option value="all">全部状态</option>
            <option value="active">运行中</option>
            <option value="degraded">降级</option>
            <option value="disabled">已停用</option>
          </NativeSelect>
        </FilterBar>
      }
      table={
        <DataTable
          columns={[
            {
              id: "name",
              header: "Provider",
              cell: (r) => (
                <span className="flex flex-col">
                  <span className="text-label-md text-foreground">
                    {r.name}
                  </span>
                  <span className="text-body-sm text-muted-foreground">
                    {r.code}
                  </span>
                </span>
              ),
            },
            {
              id: "status",
              header: "状态",
              cell: (r) => (
                <StatusBadge tone={RESOURCE_STATUS_META[r.status].tone} dot>
                  {RESOURCE_STATUS_META[r.status].label}
                </StatusBadge>
              ),
            },
            { id: "region", header: "区域", cell: (r) => r.region },
            { id: "proxy", header: "代理出口", cell: (r) => r.proxy },
            {
              id: "models",
              header: "模型数",
              align: "right",
              cell: (r) => r.models,
            },
            {
              id: "latency",
              header: "P95 延迟",
              align: "right",
              cell: (r) => (r.latencyMs ? `${r.latencyMs}ms` : "—"),
            },
            {
              id: "success",
              header: "成功率",
              align: "right",
              cell: (r) => r.successRate,
            },
            {
              id: "actions",
              header: "",
              align: "right",
              cell: (r) => (
                <ActionMenu
                  label={`${r.name} 操作`}
                  items={[
                    { id: "health", label: "健康检查", icon: "waveform" },
                    { id: "edit", label: "编辑", icon: "edit" },
                    ...(r.status === "disabled"
                      ? [{ id: "enable", label: "启用", icon: "play" as const }]
                      : [
                          {
                            id: "disable",
                            label: "禁用",
                            icon: "pause" as const,
                          },
                        ]),
                    {
                      id: "delete",
                      label: "删除",
                      icon: "trash",
                      danger: true,
                      separatorBefore: true,
                    },
                  ]}
                />
              ),
            },
          ]}
          rows={providers}
          rowKey={(r) => r.id}
        />
      }
    />
  );
}
