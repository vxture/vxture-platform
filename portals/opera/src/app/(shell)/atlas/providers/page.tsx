"use client";

/* Provider — opera-atlas-design.md §4：CRUD + 健康检查。
 *
 * 写路径先跑在本地状态上（BFF 未通，见 mocks/atlas.ts）：接入 / 编辑 / 启停 /
 * 删除都改本地行，结果走 toast。接 BFF 时只换各 handler 的实现，页面结构与
 * 对话框不动。 */

import { useMemo, useState, type FormEvent } from "react";
import {
  ActionMenu,
  Button,
  DataTable,
  DialogForm,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FilterBar,
  Icon,
  Input,
  ListPageTemplate,
  NativeSelect,
  StatusBadge,
  ViewHeader,
  useToast,
} from "@vxture/design-system";
import { providers as seed, type ProviderRow } from "@/mocks/atlas";
import { RESOURCE_STATUS_META, type ResourceStatus } from "@/lib/status";

/** 对话框的三种用途；null = 关闭。 */
type DialogState =
  | { kind: "create" }
  | { kind: "edit"; row: ProviderRow }
  | { kind: "delete"; row: ProviderRow }
  | null;

/** 表单只覆盖可编辑面：状态与观测指标由平台写入，不进表单。 */
interface ProviderDraft {
  code: string;
  name: string;
  region: string;
  proxy: string;
  apiKey: string;
}

const EMPTY_DRAFT: ProviderDraft = {
  code: "",
  name: "",
  region: "cn",
  proxy: "direct",
  apiKey: "",
};

const REGIONS = [
  { value: "cn", label: "中国大陆" },
  { value: "us", label: "美国" },
  { value: "eu", label: "欧洲" },
];

export default function ProvidersPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ProviderRow[]>(seed);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<ResourceStatus | "all">(
    "all",
  );
  const [dialog, setDialog] = useState<DialogState>(null);
  const [draft, setDraft] = useState<ProviderDraft>(EMPTY_DRAFT);

  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (statusFilter === "all" || r.status === statusFilter) &&
        (kw === "" ||
          r.name.toLowerCase().includes(kw) ||
          r.code.toLowerCase().includes(kw)),
    );
  }, [rows, keyword, statusFilter]);

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setDialog({ kind: "create" });
  };

  const openEdit = (row: ProviderRow) => {
    setDraft({
      code: row.code,
      name: row.name,
      region: row.region,
      proxy: row.proxy,
      // 已存密钥不回显；编辑时留空 = 不改。
      apiKey: "",
    });
    setDialog({ kind: "edit", row });
  };

  const setStatus = (row: ProviderRow, status: ResourceStatus) => {
    setRows((all) => all.map((r) => (r.id === row.id ? { ...r, status } : r)));
    toast({
      tone: status === "disabled" ? "warning" : "success",
      title: `${row.name} 已${status === "disabled" ? "停用" : "启用"}`,
      description:
        status === "disabled"
          ? "Router 会跳过该 Provider 下的全部模型。"
          : "该 Provider 重新参与路由。",
    });
  };

  const runHealthCheck = (row: ProviderRow) =>
    toast({
      tone: row.status === "degraded" ? "warning" : "info",
      title: `${row.name} 健康检查`,
      description:
        row.status === "disabled"
          ? "该 Provider 已停用，未发起探测。"
          : `P95 ${row.latencyMs}ms，成功率 ${row.successRate}。`,
    });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dialog) return;

    if (dialog.kind === "delete") {
      setRows((all) => all.filter((r) => r.id !== dialog.row.id));
      toast({
        tone: "success",
        title: `${dialog.row.name} 已删除`,
        description: "关联模型一并下线，审计已记录。",
      });
    } else if (dialog.kind === "create") {
      setRows((all) => [
        ...all,
        {
          id: `p-${draft.code}`,
          code: draft.code,
          name: draft.name,
          status: "active",
          region: draft.region,
          proxy: draft.proxy,
          models: 0,
          latencyMs: 0,
          successRate: "—",
        },
      ]);
      toast({
        tone: "success",
        title: `${draft.name} 已接入`,
        description: "下一步到 Model Registry 注册它的模型。",
      });
    } else {
      setRows((all) =>
        all.map((r) =>
          r.id === dialog.row.id
            ? {
                ...r,
                code: draft.code,
                name: draft.name,
                region: draft.region,
                proxy: draft.proxy,
              }
            : r,
        ),
      );
      toast({ tone: "success", title: `${draft.name} 已保存` });
    }

    setDialog(null);
  };

  const draftValid = draft.code.trim() !== "" && draft.name.trim() !== "";
  const editing = dialog?.kind === "edit";

  return (
    <>
      <ListPageTemplate
        header={
          <ViewHeader
            icon="plugs-connected"
            title="Provider"
            description="模型供应商接入：区域、代理出口、健康检查与延迟画像。"
            action={
              <Button onClick={openCreate}>
                <Icon name="plus" size="sm" />
                接入 Provider
              </Button>
            }
          />
        }
        filters={
          <FilterBar>
            <Input
              placeholder="搜索 Provider…"
              className="max-w-panel-sm"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <NativeSelect
              wrapperClassName="w-fit"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as ResourceStatus | "all")
              }
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
                      {
                        id: "health",
                        label: "健康检查",
                        icon: "waveform",
                        onSelect: () => runHealthCheck(r),
                      },
                      {
                        id: "edit",
                        label: "编辑",
                        icon: "edit",
                        onSelect: () => openEdit(r),
                      },
                      r.status === "disabled"
                        ? {
                            id: "enable",
                            label: "启用",
                            icon: "play" as const,
                            onSelect: () => setStatus(r, "active"),
                          }
                        : {
                            id: "disable",
                            label: "禁用",
                            icon: "pause" as const,
                            onSelect: () => setStatus(r, "disabled"),
                          },
                      {
                        id: "delete",
                        label: "删除",
                        icon: "trash",
                        danger: true,
                        separatorBefore: true,
                        onSelect: () => setDialog({ kind: "delete", row: r }),
                      },
                    ]}
                  />
                ),
              },
            ]}
            rows={visible}
            rowKey={(r) => r.id}
          />
        }
      />

      <DialogForm
        open={dialog?.kind === "create" || editing}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={editing ? "编辑 Provider" : "接入 Provider"}
        description="代理出口决定请求从哪台机器发出：境外供应商走直连会超时。"
        submitLabel={editing ? "保存" : "接入"}
        submitDisabled={!draftValid}
        onSubmit={submit}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="provider-code">Code</FieldLabel>
            <Input
              id="provider-code"
              value={draft.code}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
              placeholder="openai"
            />
            <FieldDescription>
              全局唯一，模型注册时引用它。创建后不建议再改。
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="provider-name">名称</FieldLabel>
            <Input
              id="provider-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="OpenAI"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="provider-region">区域</FieldLabel>
            <NativeSelect
              id="provider-region"
              value={draft.region}
              onChange={(e) => setDraft({ ...draft, region: e.target.value })}
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel htmlFor="provider-proxy">代理出口</FieldLabel>
            <Input
              id="provider-proxy"
              value={draft.proxy}
              onChange={(e) => setDraft({ ...draft, proxy: e.target.value })}
              placeholder="direct / egress-us-1"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="provider-key">API Key</FieldLabel>
            <Input
              id="provider-key"
              type="password"
              value={draft.apiKey}
              onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
              placeholder={editing ? "留空则不修改" : "sk-…"}
            />
            <FieldDescription>写入后不再回显，只能轮换。</FieldDescription>
          </Field>
        </FieldGroup>
      </DialogForm>

      <DialogForm
        open={dialog?.kind === "delete"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        size="sm"
        danger
        title={
          dialog?.kind === "delete"
            ? `删除 ${dialog.row.name}`
            : "删除 Provider"
        }
        description="该 Provider 下的模型会一并下线，引用它的 Endpoint 将失去 primary。此操作不可撤销。"
        submitLabel="删除"
        onSubmit={submit}
      />
    </>
  );
}
