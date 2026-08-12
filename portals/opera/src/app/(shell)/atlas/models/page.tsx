"use client";

/* Model Registry — Atlas 统一模型注册中心。
 *
 * 2026-08-11 接真实数据：字段照 Atlas 真实的 `/capability/models` 契约
 * （modelCode/modelName/provider/providerId/endpointUrl/protocol/capabilities/
 * keyReference/isActive），不是 mocks/atlas.ts 那份虚构的 version/contextWindow
 * 字段集。Provider 下拉从真实 Provider 列表取（GET /api/atlas/providers），
 * 不是硬编码的固定四选一——那是 admin 旧版的已知缺口，这里不重复它。
 *
 * 模型的创建/编辑/启停/删除专属 opera（技术供给层，两段裁决）；商业层的计价
 * 规则/策略/配额留在 admin，只读引用这里的 model 列表。 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ActionMenu,
  Badge,
  Button,
  DataTable,
  DialogForm,
  EmptyState,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FilterBar,
  Icon,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  ListPageTemplate,
  NativeSelect,
  Pagination,
  StatusBadge,
  TableTitleCell,
  ViewHeader,
  useListPagination,
  useToast,
  type StatusBadgeTone,
} from "@vxture/design-system";
import { useOperatorSession } from "@/features/session/SessionProvider";
import { api, OperaApiError } from "@/lib/api";

/** 与 opera-bff atlas.router.ts 同名能力码——活库当前的三段式码。 */
const MANAGE = "model:model.manage";

interface ModelProviderRecord {
  id: string;
  providerCode: string;
  providerName: string;
  isActive: boolean;
}

interface AiModelRecord {
  id: string;
  providerId: string | null;
  modelCode: string;
  modelName: string;
  provider: string;
  endpointUrl: string;
  protocol: string;
  capabilities: string[];
  keyReference: { source: "env"; name: string; configured: boolean } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const PROTOCOLS = ["openai-compatible", "anthropic-messages", "custom"];
const CAPABILITY_OPTIONS = [
  "chat",
  "reasoning",
  "embedding",
  "vision",
  "image",
  "audio",
  "video",
  "tool_calling",
];

function modelTone(isActive: boolean): StatusBadgeTone {
  return isActive ? "success" : "neutral";
}

type DialogState =
  | { kind: "create" }
  | { kind: "edit"; row: AiModelRecord }
  | { kind: "delete"; row: AiModelRecord }
  | null;

interface ModelDraft {
  modelCode: string;
  modelName: string;
  providerId: string;
  endpointUrl: string;
  protocol: string;
  capabilities: string[];
  keyReferenceName: string;
}

function emptyDraft(defaultProviderId: string): ModelDraft {
  return {
    modelCode: "",
    modelName: "",
    providerId: defaultProviderId,
    endpointUrl: "",
    protocol: "openai-compatible",
    capabilities: ["chat"],
    keyReferenceName: "",
  };
}

function draftFromRecord(row: AiModelRecord): ModelDraft {
  return {
    modelCode: row.modelCode,
    modelName: row.modelName,
    providerId: row.providerId ?? "",
    endpointUrl: row.endpointUrl,
    protocol: row.protocol,
    capabilities: [...row.capabilities],
    keyReferenceName: row.keyReference?.name ?? "",
  };
}

function describeError(error: unknown): { description?: string } {
  return error instanceof OperaApiError && error.message
    ? { description: error.message }
    : {};
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

export default function ModelsPage() {
  const { toast } = useToast();
  const { can } = useOperatorSession();
  const canManage = can(MANAGE);
  const [rows, setRows] = useState<AiModelRecord[]>([]);
  const [providers, setProviders] = useState<ModelProviderRecord[]>([]);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [keyword, setKeyword] = useState("");
  const [capability, setCapability] = useState("all");
  const [selectedKeys, setSelectedKeys] = useState<readonly string[]>([]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [draft, setDraft] = useState<ModelDraft>(emptyDraft(""));
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const [models, providerRows] = await Promise.all([
        api.get<AiModelRecord[]>("/api/atlas/models?includeInactive=true"),
        api.get<ModelProviderRecord[]>(
          "/api/atlas/providers?includeInactive=false",
        ),
      ]);
      setRows(models);
      setProviders(providerRows);
      setLoad({ kind: "ready" });
    } catch (error) {
      setLoad({
        kind: "error",
        message:
          error instanceof OperaApiError ? error.message : "读取模型失败",
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const providerById = useMemo(
    () => new Map(providers.map((p) => [p.id, p])),
    [providers],
  );

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (capability === "all" || r.capabilities.includes(capability)) &&
        (kw === "" ||
          r.modelCode.toLowerCase().includes(kw) ||
          r.modelName.toLowerCase().includes(kw)),
    );
  }, [rows, keyword, capability]);

  const pager = useListPagination(filtered);

  function openCreate() {
    setDraft(emptyDraft(providers[0]?.id ?? ""));
    setDialog({ kind: "create" });
  }

  function openEdit(row: AiModelRecord) {
    setDraft(draftFromRecord(row));
    setDialog({ kind: "edit", row });
  }

  function toggleCapability(cap: string) {
    setDraft((d) => ({
      ...d,
      capabilities: d.capabilities.includes(cap)
        ? d.capabilities.filter((c) => c !== cap)
        : [...d.capabilities, cap],
    }));
  }

  async function runAction(label: string, action: () => Promise<unknown>) {
    setSubmitting(true);
    try {
      await action();
      toast({ tone: "success", title: label });
      await reload();
    } catch (error) {
      toast({ tone: "danger", title: `${label}失败`, ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;

    if (dialog.kind === "delete") {
      setDialog(null);
      await runAction(`${dialog.row.modelName} 已删除`, () =>
        api.delete(`/api/atlas/models/${dialog.row.id}`),
      );
      return;
    }

    const provider = providerById.get(draft.providerId);
    const payload = {
      modelCode: draft.modelCode.trim(),
      modelName: draft.modelName.trim(),
      providerId: draft.providerId || null,
      provider: provider?.providerCode ?? draft.providerId,
      endpointUrl: draft.endpointUrl.trim(),
      protocol: draft.protocol,
      capabilities: draft.capabilities,
      keyReference: draft.keyReferenceName.trim()
        ? { source: "env" as const, name: draft.keyReferenceName.trim() }
        : null,
    };

    setSubmitting(true);
    try {
      if (dialog.kind === "create") {
        await api.post("/api/atlas/models", payload);
        toast({ tone: "success", title: `${draft.modelCode} 已注册` });
      } else {
        await api.put(`/api/atlas/models/${dialog.row.id}`, payload);
        toast({ tone: "success", title: `${draft.modelCode} 已保存` });
      }
      setDialog(null);
      await reload();
    } catch (error) {
      toast({ tone: "danger", title: "保存失败", ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  const draftValid =
    draft.modelCode.trim() !== "" &&
    draft.modelName.trim() !== "" &&
    draft.endpointUrl.trim() !== "" &&
    draft.capabilities.length > 0;
  const editing = dialog?.kind === "edit";

  const pagination = (
    <Pagination
      className="w-full"
      page={pager.page}
      pageCount={pager.pageCount}
      total={rows.length}
      filteredTotal={filtered.length}
      pageSize={pager.pageSize}
      onPageSizeChange={pager.onPageSizeChange}
      onPageChange={pager.onPageChange}
    />
  );

  const emptyState =
    load.kind === "loading" ? (
      <EmptyState title="读取中…" description="正在读取模型注册表。" />
    ) : load.kind === "error" ? (
      <EmptyState
        title="读取失败"
        description={load.message}
        action={
          <Button variant="secondary" onClick={() => void reload()}>
            重试
          </Button>
        }
      />
    ) : filtered.length !== rows.length ? (
      <EmptyState
        title="没有匹配的模型"
        description="换个关键词或筛选条件再看。"
      />
    ) : (
      <EmptyState title="暂无模型" description="点击「注册模型」开始。" />
    );

  return (
    <>
      <ListPageTemplate
        header={
          <ViewHeader
            icon="brain"
            title="Model Registry"
            description="统一模型注册中心；数据来自 Atlas 的 /capability/models。"
            action={
              canManage ? (
                <Button
                  onClick={openCreate}
                  disabled={submitting || providers.length === 0}
                >
                  <Icon name="plus" size="sm" aria-hidden="true" />
                  注册模型
                </Button>
              ) : null
            }
          />
        }
        filters={
          <FilterBar
            count={
              filtered.length === rows.length
                ? rows.length
                : `${filtered.length} / ${rows.length}`
            }
          >
            <InputGroup className="grow basis-media-3xl max-w-panel-sm">
              <InputGroupAddon>
                <Icon name="search" size="sm" aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="搜索模型编码…"
                aria-label="搜索模型"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  pager.resetPage();
                }}
              />
            </InputGroup>
            <NativeSelect
              wrapperClassName="w-fit"
              value={capability}
              onChange={(e) => {
                setCapability(e.target.value);
                pager.resetPage();
              }}
              aria-label="能力筛选"
            >
              <option value="all">全部能力</option>
              {CAPABILITY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </NativeSelect>
          </FilterBar>
        }
        table={
          <DataTable
            columns={[
              {
                id: "model",
                header: "模型",
                cell: (r: AiModelRecord) => (
                  <TableTitleCell
                    icon="brain"
                    title={r.modelName}
                    description={r.modelCode}
                    {...(canManage ? { onTitleClick: () => openEdit(r) } : {})}
                  />
                ),
              },
              {
                id: "provider",
                header: "Provider",
                cell: (r: AiModelRecord) =>
                  (r.providerId &&
                    providerById.get(r.providerId)?.providerName) ??
                  r.provider,
              },
              {
                id: "protocol",
                header: "协议",
                cell: (r: AiModelRecord) => r.protocol,
              },
              {
                id: "capabilities",
                header: "能力",
                cell: (r: AiModelRecord) => (
                  <span className="flex flex-wrap gap-2xs">
                    {r.capabilities.slice(0, 3).map((c) => (
                      <Badge key={c} variant="secondary">
                        {c}
                      </Badge>
                    ))}
                    {r.capabilities.length > 3 ? (
                      <Badge variant="secondary">
                        +{r.capabilities.length - 3}
                      </Badge>
                    ) : null}
                  </span>
                ),
              },
              {
                id: "status",
                header: "状态",
                align: "center",
                cell: (r: AiModelRecord) => (
                  <StatusBadge tone={modelTone(r.isActive)} dot>
                    {r.isActive ? "启用" : "停用"}
                  </StatusBadge>
                ),
              },
            ]}
            rows={pager.pageRows}
            rowKey={(r: AiModelRecord) => r.id}
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            indexStart={pager.indexStart}
            {...(canManage
              ? {
                  rowActions: (r: AiModelRecord) => (
                    <ActionMenu
                      label={`${r.modelCode} 操作`}
                      disabled={submitting}
                      items={[
                        {
                          id: "edit",
                          label: "编辑",
                          icon: "edit",
                          onSelect: () => openEdit(r),
                        },
                        r.isActive
                          ? {
                              id: "disable",
                              label: "下线",
                              icon: "prohibit",
                              onSelect: () =>
                                void runAction(`${r.modelCode} 已下线`, () =>
                                  api.post(
                                    `/api/atlas/models/${r.id}/deactivate`,
                                  ),
                                ),
                            }
                          : {
                              id: "enable",
                              label: "重新上线",
                              icon: "play",
                              onSelect: () =>
                                void runAction(
                                  `${r.modelCode} 已重新上线`,
                                  () =>
                                    api.post(
                                      `/api/atlas/models/${r.id}/activate`,
                                    ),
                                ),
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
                }
              : {})}
            footer={pagination}
            empty={emptyState}
          />
        }
      />

      <DialogForm
        open={dialog?.kind === "create" || editing}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        size="lg"
        title={editing ? "编辑模型" : "注册模型"}
        description="编码是业务侧唯一认得的标识，注册后不建议再改。"
        submitLabel={editing ? "保存" : "注册"}
        submitting={submitting}
        submitDisabled={!draftValid}
        onSubmit={submit}
      >
        <FieldGroup>
          <div className="grid grid-cols-2 gap-md">
            <Field>
              <FieldLabel htmlFor="model-code">编码</FieldLabel>
              <Input
                id="model-code"
                value={draft.modelCode}
                onChange={(e) =>
                  setDraft({ ...draft, modelCode: e.target.value })
                }
                placeholder="gpt-5-mini"
                disabled={editing}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="model-name">名称</FieldLabel>
              <Input
                id="model-name"
                value={draft.modelName}
                onChange={(e) =>
                  setDraft({ ...draft, modelName: e.target.value })
                }
                placeholder="GPT-5 Mini"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="model-provider">Provider</FieldLabel>
            <NativeSelect
              id="model-provider"
              value={draft.providerId}
              onChange={(e) =>
                setDraft({ ...draft, providerId: e.target.value })
              }
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.providerName}
                </option>
              ))}
            </NativeSelect>
            <FieldDescription>
              只列启用中的 Provider——停用的挂上去也不会有流量。
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="model-endpoint">Endpoint URL</FieldLabel>
            <Input
              id="model-endpoint"
              value={draft.endpointUrl}
              onChange={(e) =>
                setDraft({ ...draft, endpointUrl: e.target.value })
              }
              placeholder="https://api.openai.com/v1"
            />
          </Field>
          <div className="grid grid-cols-2 gap-md">
            <Field>
              <FieldLabel htmlFor="model-protocol">协议</FieldLabel>
              <NativeSelect
                id="model-protocol"
                value={draft.protocol}
                onChange={(e) =>
                  setDraft({ ...draft, protocol: e.target.value })
                }
              >
                {PROTOCOLS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="model-key">
                密钥引用（env 变量名）
              </FieldLabel>
              <Input
                id="model-key"
                value={draft.keyReferenceName}
                onChange={(e) =>
                  setDraft({ ...draft, keyReferenceName: e.target.value })
                }
                placeholder="OPENAI_API_KEY"
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>能力标签</FieldLabel>
            <div className="flex flex-wrap gap-sm">
              {CAPABILITY_OPTIONS.map((c) => {
                const active = draft.capabilities.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCapability(c)}
                    className="inline-flex"
                  >
                    <Badge variant={active ? "default" : "outline"}>{c}</Badge>
                  </button>
                );
              })}
            </div>
            <FieldDescription>至少选一项。</FieldDescription>
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
            ? `删除 ${dialog.row.modelCode}`
            : "删除模型"
        }
        description="删除后不再接受新请求，此操作不可撤销。"
        submitLabel="删除"
        submitting={submitting}
        onSubmit={submit}
      />
    </>
  );
}
