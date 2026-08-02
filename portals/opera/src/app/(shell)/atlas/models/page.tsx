"use client";

/* Model Registry — opera-atlas-design.md §5：CRUD + Capability Tag。 */

import {
  ActionMenu,
  Badge,
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
import { models } from "@/mocks/atlas";
import { RESOURCE_STATUS_META } from "@/lib/status";

export default function ModelsPage() {
  return (
    <ListPageTemplate
      header={
        <ViewHeader
          icon="brain"
          title="Model Registry"
          description="统一模型注册中心：模型编码、能力标签与上下文窗口。业务系统不直连模型，只经 Endpoint。"
          action={
            <Button>
              <Icon name="plus" size="sm" />
              注册模型
            </Button>
          }
        />
      }
      filters={
        <FilterBar>
          <Input placeholder="搜索模型编码…" className="max-w-panel-sm" />
          <NativeSelect
            wrapperClassName="w-fit"
            defaultValue="all"
            aria-label="能力筛选"
          >
            <option value="all">全部能力</option>
            <option>Chat</option>
            <option>Reasoning</option>
            <option>Embedding</option>
            <option>Vision</option>
          </NativeSelect>
        </FilterBar>
      }
      table={
        <DataTable
          columns={[
            {
              id: "model",
              header: "模型",
              cell: (r) => (
                <span className="flex flex-col">
                  <span className="text-label-md text-foreground">
                    {r.name}
                  </span>
                  <span className="text-code-sm text-muted-foreground">
                    {r.code}
                  </span>
                </span>
              ),
            },
            { id: "provider", header: "Provider", cell: (r) => r.provider },
            { id: "version", header: "版本", cell: (r) => r.version },
            {
              id: "context",
              header: "上下文",
              align: "right",
              cell: (r) => r.contextWindow,
            },
            {
              id: "capabilities",
              header: "能力",
              cell: (r) => (
                <span className="flex flex-wrap gap-2xs">
                  {r.capabilities.map((c) => (
                    <Badge key={c} variant="secondary">
                      {c}
                    </Badge>
                  ))}
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
            {
              id: "actions",
              header: "",
              align: "right",
              cell: (r) => (
                <ActionMenu
                  label={`${r.code} 操作`}
                  items={[
                    { id: "edit", label: "编辑", icon: "edit" },
                    { id: "tag", label: "调整能力标签", icon: "flag" },
                    {
                      id: "retire",
                      label: "下线",
                      icon: "prohibit",
                      danger: true,
                      separatorBefore: true,
                    },
                  ]}
                />
              ),
            },
          ]}
          rows={models}
          rowKey={(r) => r.id}
        />
      }
    />
  );
}
