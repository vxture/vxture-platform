"use client";

/* API Key — opera-atlas-design.md §9：Internal / External 两类，
 * 创建 / 吊销 / 禁用 / 轮换（功能排期）。 */

import {
  ActionMenu,
  Badge,
  Button,
  DataTable,
  FilterBar,
  Icon,
  Input,
  Kbd,
  ListPageTemplate,
  NativeSelect,
  StatusBadge,
  ViewHeader,
} from "@vxture/design-system";
import { apiKeys } from "@/mocks/atlas";
import { KEY_STATUS_META } from "@/lib/status";

export default function KeysPage() {
  return (
    <ListPageTemplate
      header={
        <ViewHeader
          icon="key"
          title="API Key"
          description="服务间调用走 Internal Key，外部应用走 External Key；轮换与吊销全部留痕进 Audit。"
          action={
            <Button>
              <Icon name="plus" size="sm" />
              签发 Key
            </Button>
          }
        />
      }
      filters={
        <FilterBar>
          <Input placeholder="搜索名称 / 前缀…" className="max-w-panel-sm" />
          <NativeSelect
            wrapperClassName="w-fit"
            defaultValue="all"
            aria-label="类型筛选"
          >
            <option value="all">全部类型</option>
            <option value="internal">Internal</option>
            <option value="external">External</option>
          </NativeSelect>
        </FilterBar>
      }
      table={
        <DataTable
          columns={[
            {
              id: "name",
              header: "名称",
              cell: (r) => (
                <span className="text-label-md text-foreground">{r.name}</span>
              ),
            },
            {
              id: "kind",
              header: "类型",
              cell: (r) => (
                <Badge
                  variant={r.kind === "internal" ? "secondary" : "outline"}
                >
                  {r.kind === "internal" ? "Internal" : "External"}
                </Badge>
              ),
            },
            { id: "owner", header: "归属", cell: (r) => r.owner },
            {
              id: "prefix",
              header: "前缀",
              cell: (r) => <Kbd>{r.prefix}</Kbd>,
            },
            {
              id: "status",
              header: "状态",
              cell: (r) => (
                <StatusBadge tone={KEY_STATUS_META[r.status].tone} dot>
                  {KEY_STATUS_META[r.status].label}
                </StatusBadge>
              ),
            },
            { id: "lastUsed", header: "最近使用", cell: (r) => r.lastUsed },
            { id: "createdAt", header: "签发于", cell: (r) => r.createdAt },
            {
              id: "actions",
              header: "",
              align: "right",
              cell: (r) => (
                <ActionMenu
                  label={`${r.name} 操作`}
                  items={[
                    {
                      id: "rotate",
                      label: "轮换",
                      icon: "refresh",
                      disabled: r.status !== "active",
                    },
                    {
                      id: "disable",
                      label: "禁用",
                      icon: "pause",
                      disabled: r.status !== "active",
                    },
                    {
                      id: "revoke",
                      label: "吊销",
                      icon: "prohibit",
                      danger: true,
                      separatorBefore: true,
                      disabled: r.status === "revoked",
                    },
                  ]}
                />
              ),
            },
          ]}
          rows={apiKeys}
          rowKey={(r) => r.id}
        />
      }
    />
  );
}
