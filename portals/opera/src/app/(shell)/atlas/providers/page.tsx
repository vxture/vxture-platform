"use client";

/* Provider — Atlas 模型供应商管理。
 *
 * 2026-08-11 接真实数据（继维护窗口/服务监控/任务调度之后，第四个真实迁移）：
 * 之前这页跑在 mocks/atlas.ts 的虚构字段上（region/proxy/apiKey/health-check/
 * latency/successRate），与 Atlas 真实的 `/capability/providers` 契约完全对不上。
 * 现在换成 opera-bff 自己的 atlas.router.ts（providerCode/providerType/
 * providerName/description/logoUrl/homepageUrl/consoleUrl/billingUrl/
 * isActive），字段直接照 Atlas 真实响应形状来——不是照抄 admin 那份 UI，是照抄
 * 它已经验证过的真实数据契约。
 *
 * Provider 的创建/编辑/启停/删除以前在 admin 的 /atlas 页，现在专属 opera：
 * "两段裁决"里这是技术供给层（product_100_matrix.md），归 opera；商业层
 * （价格规则/策略/配额）还留在 admin，只读引用这里的数据。 */

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
  Banner,
  Button,
  DataTable,
  DialogForm,
  Drawer,
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
  Textarea,
  ViewHeader,
  useListPagination,
  useToast,
  type StatusBadgeTone,
} from "@vxture/design-system";
import { useOperatorSession } from "@/features/session/SessionProvider";
import { api, OperaApiError } from "@/lib/api";

/** 与 opera-bff atlas.router.ts 同名能力码——活库当前的三段式码，不是
 * admin-bff 那个已退役、只靠 LEGACY_CAPABILITY_BRIDGE 续命的扁平码。 */
const MANAGE = "model:provider.manage";

interface ModelProviderRecord {
  id: string;
  providerCode: string;
  providerType: string;
  providerName: string;
  description: string | null;
  logoUrl: string | null;
  homepageUrl: string | null;
  consoleUrl: string | null;
  billingUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const PROVIDER_TYPES = [
  { value: "online", label: "在线 API" },
  { value: "private", label: "私有部署" },
  { value: "custom", label: "自定义" },
];

function providerTone(isActive: boolean): StatusBadgeTone {
  return isActive ? "success" : "neutral";
}

/** 镜像 opera-bff atlas.router.ts 的 ProviderKeyRecord——不带任何密钥材料，
 * atlas 的 /capability/provider-keys 读接口本来就不回显。 */
interface ProviderKeyRecord {
  id: string;
  providerCode: string;
  keyAlias: string;
  keyScope: string;
  isActive: boolean;
  lastRotatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const KEY_SCOPES = [
  { value: "shared", label: "共享（多租户复用同一把）" },
  { value: "dedicated", label: "专属（单租户/单场景独占）" },
];

/** atlas 侧 StepUpRequiredGuard 的固定错误文案（operator-auth.guard.ts）——
 * 用于把"失败"和"需要二次验证但 opera 还没有 step-up 流程"分开提示。 */
function isStepUpError(error: unknown): boolean {
  return (
    error instanceof OperaApiError &&
    error.message.toLowerCase().includes("step-up")
  );
}

type DialogState =
  | { kind: "create" }
  | { kind: "edit"; row: ModelProviderRecord }
  | { kind: "delete"; row: ModelProviderRecord }
  | null;

interface ProviderDraft {
  providerCode: string;
  providerName: string;
  providerType: string;
  description: string;
  logoUrl: string;
  homepageUrl: string;
  consoleUrl: string;
  billingUrl: string;
}

const EMPTY_DRAFT: ProviderDraft = {
  providerCode: "",
  providerName: "",
  providerType: "online",
  description: "",
  logoUrl: "",
  homepageUrl: "",
  consoleUrl: "",
  billingUrl: "",
};

function draftFromRecord(row: ModelProviderRecord): ProviderDraft {
  return {
    providerCode: row.providerCode,
    providerName: row.providerName,
    providerType: row.providerType,
    description: row.description ?? "",
    logoUrl: row.logoUrl ?? "",
    homepageUrl: row.homepageUrl ?? "",
    consoleUrl: row.consoleUrl ?? "",
    billingUrl: row.billingUrl ?? "",
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

export default function ProvidersPage() {
  const { toast } = useToast();
  const { can } = useOperatorSession();
  const canManage = can(MANAGE);
  const [rows, setRows] = useState<ModelProviderRecord[]>([]);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [selectedKeys, setSelectedKeys] = useState<readonly string[]>([]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [draft, setDraft] = useState<ProviderDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);

  const [keysProvider, setKeysProvider] = useState<ModelProviderRecord | null>(
    null,
  );
  const [keys, setKeys] = useState<ProviderKeyRecord[]>([]);
  const [keysLoad, setKeysLoad] = useState<LoadState>({ kind: "ready" });
  const [keyDialog, setKeyDialog] = useState<
    { kind: "create" } | { kind: "rotate"; key: ProviderKeyRecord } | null
  >(null);
  const [keyAlias, setKeyAlias] = useState("");
  const [keyScope, setKeyScope] = useState("shared");
  const [plaintextKey, setPlaintextKey] = useState("");

  const reload = useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const data = await api.get<ModelProviderRecord[]>(
        "/api/atlas/providers?includeInactive=true",
      );
      setRows(data);
      setLoad({ kind: "ready" });
    } catch (error) {
      setLoad({
        kind: "error",
        message:
          error instanceof OperaApiError ? error.message : "读取 Provider 失败",
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (statusFilter === "all" ||
          (statusFilter === "active" ? r.isActive : !r.isActive)) &&
        (kw === "" ||
          r.providerName.toLowerCase().includes(kw) ||
          r.providerCode.toLowerCase().includes(kw)),
    );
  }, [rows, keyword, statusFilter]);

  const pager = useListPagination(filtered);

  function openCreate() {
    setDraft(EMPTY_DRAFT);
    setDialog({ kind: "create" });
  }

  function openEdit(row: ModelProviderRecord) {
    setDraft(draftFromRecord(row));
    setDialog({ kind: "edit", row });
  }

  const loadKeys = useCallback(async (providerCode: string) => {
    setKeysLoad({ kind: "loading" });
    try {
      const data = await api.get<ProviderKeyRecord[]>(
        `/api/atlas/provider-keys?providerCode=${encodeURIComponent(providerCode)}`,
      );
      setKeys(data);
      setKeysLoad({ kind: "ready" });
    } catch (error) {
      setKeysLoad({
        kind: "error",
        message:
          error instanceof OperaApiError ? error.message : "读取密钥失败",
      });
    }
  }, []);

  function openKeys(row: ModelProviderRecord) {
    setKeysProvider(row);
    void loadKeys(row.providerCode);
  }

  function closeKeys() {
    setKeysProvider(null);
    setKeys([]);
    setKeysLoad({ kind: "ready" });
  }

  function openCreateKey() {
    setKeyAlias("");
    setKeyScope("shared");
    setPlaintextKey("");
    setKeyDialog({ kind: "create" });
  }

  function openRotateKey(key: ProviderKeyRecord) {
    setPlaintextKey("");
    setKeyDialog({ kind: "rotate", key });
  }

  async function submitKeyDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!keyDialog || !keysProvider) return;
    setSubmitting(true);
    try {
      if (keyDialog.kind === "create") {
        await api.post("/api/atlas/provider-keys", {
          providerCode: keysProvider.providerCode,
          keyAlias: keyAlias.trim(),
          keyScope,
          plaintextKey,
        });
        toast({ tone: "success", title: `密钥「${keyAlias.trim()}」已入库` });
      } else {
        await api.post(`/api/atlas/provider-keys/${keyDialog.key.id}/rotate`, {
          plaintextKey,
        });
        toast({
          tone: "success",
          title: `密钥「${keyDialog.key.keyAlias}」已轮换`,
        });
      }
      setKeyDialog(null);
      await loadKeys(keysProvider.providerCode);
    } catch (error) {
      if (isStepUpError(error)) {
        toast({
          tone: "danger",
          title: "需要二次验证（step-up）",
          description:
            "该操作要求会话通过密码以外的额外验证因子，opera 目前还没有 step-up 登录流程，暂时无法在此完成——需要平台侧补上 step-up 后再试。",
        });
      } else {
        toast({
          tone: "danger",
          title: keyDialog.kind === "create" ? "入库失败" : "轮换失败",
          ...describeError(error),
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleKeyActive(key: ProviderKeyRecord) {
    if (!keysProvider) return;
    setSubmitting(true);
    try {
      await api.put(
        `/api/atlas/provider-keys/${key.id}/${key.isActive ? "deactivate" : "activate"}`,
        {},
      );
      toast({
        tone: "success",
        title: `密钥「${key.keyAlias}」已${key.isActive ? "停用" : "启用"}`,
      });
      await loadKeys(keysProvider.providerCode);
    } catch (error) {
      if (isStepUpError(error)) {
        toast({
          tone: "danger",
          title: "需要二次验证（step-up）",
          description:
            "该操作要求会话通过密码以外的额外验证因子，opera 目前还没有 step-up 登录流程，暂时无法在此完成——需要平台侧补上 step-up 后再试。",
        });
      } else {
        toast({ tone: "danger", title: "操作失败", ...describeError(error) });
      }
    } finally {
      setSubmitting(false);
    }
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
      await runAction(`${dialog.row.providerName} 已删除`, () =>
        api.delete(`/api/atlas/providers/${dialog.row.id}`),
      );
      return;
    }

    const payload = {
      providerCode: draft.providerCode.trim(),
      providerName: draft.providerName.trim(),
      providerType: draft.providerType,
      description: draft.description.trim() || null,
      logoUrl: draft.logoUrl.trim() || null,
      homepageUrl: draft.homepageUrl.trim() || null,
      consoleUrl: draft.consoleUrl.trim() || null,
      billingUrl: draft.billingUrl.trim() || null,
    };

    setSubmitting(true);
    try {
      if (dialog.kind === "create") {
        await api.post("/api/atlas/providers", payload);
        toast({ tone: "success", title: `${draft.providerName} 已接入` });
      } else {
        await api.put(`/api/atlas/providers/${dialog.row.id}`, payload);
        toast({ tone: "success", title: `${draft.providerName} 已保存` });
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
    draft.providerCode.trim() !== "" && draft.providerName.trim() !== "";
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
      <EmptyState title="读取中…" description="正在读取 Provider 清单。" />
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
        title="没有匹配的 Provider"
        description="换个关键词或筛选条件再看。"
      />
    ) : (
      <EmptyState
        title="暂无 Provider"
        description="点击「接入 Provider」开始。"
      />
    );

  return (
    <>
      <ListPageTemplate
        header={
          <ViewHeader
            icon="plugs-connected"
            title="Provider"
            description="模型供应商接入管理；数据来自 Atlas 的 /capability/providers。"
            action={
              canManage ? (
                <Button onClick={openCreate} disabled={submitting}>
                  <Icon name="plus" size="sm" aria-hidden="true" />
                  接入 Provider
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
                placeholder="搜索 Provider…"
                aria-label="搜索 Provider"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  pager.resetPage();
                }}
              />
            </InputGroup>
            <NativeSelect
              wrapperClassName="w-fit"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                pager.resetPage();
              }}
              aria-label="状态筛选"
            >
              <option value="all">全部状态</option>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </NativeSelect>
          </FilterBar>
        }
        table={
          <DataTable
            columns={[
              {
                id: "name",
                header: "Provider",
                cell: (r: ModelProviderRecord) => (
                  <TableTitleCell
                    icon="plugs-connected"
                    title={r.providerName}
                    description={r.providerCode}
                    {...(canManage ? { onTitleClick: () => openEdit(r) } : {})}
                  />
                ),
              },
              {
                id: "type",
                header: "类型",
                cell: (r: ModelProviderRecord) =>
                  PROVIDER_TYPES.find((t) => t.value === r.providerType)
                    ?.label ?? r.providerType,
              },
              {
                id: "status",
                header: "状态",
                align: "center",
                cell: (r: ModelProviderRecord) => (
                  <StatusBadge tone={providerTone(r.isActive)} dot>
                    {r.isActive ? "启用" : "停用"}
                  </StatusBadge>
                ),
              },
              {
                id: "description",
                header: "简介",
                cell: (r: ModelProviderRecord) => (
                  <span className="text-body-sm text-muted-foreground truncate max-w-panel-sm">
                    {r.description ?? "—"}
                  </span>
                ),
              },
            ]}
            rows={pager.pageRows}
            rowKey={(r: ModelProviderRecord) => r.id}
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            indexStart={pager.indexStart}
            {...(canManage
              ? {
                  rowActions: (r: ModelProviderRecord) => (
                    <ActionMenu
                      label={`${r.providerName} 操作`}
                      disabled={submitting}
                      items={[
                        {
                          id: "edit",
                          label: "编辑",
                          icon: "edit",
                          onSelect: () => openEdit(r),
                        },
                        {
                          id: "keys",
                          label: "密钥管理",
                          icon: "key",
                          onSelect: () => openKeys(r),
                        },
                        r.isActive
                          ? {
                              id: "disable",
                              label: "停用",
                              icon: "pause",
                              onSelect: () =>
                                void runAction(`${r.providerName} 已停用`, () =>
                                  api.post(
                                    `/api/atlas/providers/${r.id}/deactivate`,
                                  ),
                                ),
                            }
                          : {
                              id: "enable",
                              label: "启用",
                              icon: "play",
                              onSelect: () =>
                                void runAction(`${r.providerName} 已启用`, () =>
                                  api.post(
                                    `/api/atlas/providers/${r.id}/activate`,
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
        title={editing ? "编辑 Provider" : "接入 Provider"}
        submitLabel={editing ? "保存" : "接入"}
        submitting={submitting}
        submitDisabled={!draftValid}
        onSubmit={submit}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="provider-code">Code</FieldLabel>
            <Input
              id="provider-code"
              value={draft.providerCode}
              onChange={(e) =>
                setDraft({ ...draft, providerCode: e.target.value })
              }
              placeholder="openai"
              disabled={editing}
            />
            <FieldDescription>全局唯一，模型注册时引用它。</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="provider-name">名称</FieldLabel>
            <Input
              id="provider-name"
              value={draft.providerName}
              onChange={(e) =>
                setDraft({ ...draft, providerName: e.target.value })
              }
              placeholder="OpenAI"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="provider-type">类型</FieldLabel>
            <NativeSelect
              id="provider-type"
              value={draft.providerType}
              onChange={(e) =>
                setDraft({ ...draft, providerType: e.target.value })
              }
            >
              {PROVIDER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="provider-description">简介</FieldLabel>
            <Textarea
              id="provider-description"
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-2 gap-md">
            <Field>
              <FieldLabel htmlFor="provider-homepage">主页 URL</FieldLabel>
              <Input
                id="provider-homepage"
                value={draft.homepageUrl}
                onChange={(e) =>
                  setDraft({ ...draft, homepageUrl: e.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-console">控制台 URL</FieldLabel>
              <Input
                id="provider-console"
                value={draft.consoleUrl}
                onChange={(e) =>
                  setDraft({ ...draft, consoleUrl: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-md">
            <Field>
              <FieldLabel htmlFor="provider-billing">计费页 URL</FieldLabel>
              <Input
                id="provider-billing"
                value={draft.billingUrl}
                onChange={(e) =>
                  setDraft({ ...draft, billingUrl: e.target.value })
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="provider-logo">Logo URL</FieldLabel>
              <Input
                id="provider-logo"
                value={draft.logoUrl}
                onChange={(e) =>
                  setDraft({ ...draft, logoUrl: e.target.value })
                }
              />
            </Field>
          </div>
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
            ? `删除 ${dialog.row.providerName}`
            : "删除 Provider"
        }
        description="该 Provider 下的模型会受影响。此操作不可撤销。"
        submitLabel="删除"
        submitting={submitting}
        onSubmit={submit}
      />

      {/* ── 密钥管理抽屉 ─────────────────────────────────────────────────── */}
      <Drawer
        open={keysProvider !== null}
        onClose={closeKeys}
        width={520}
        title="密钥管理"
        description={
          keysProvider
            ? `${keysProvider.providerName}（${keysProvider.providerCode}）`
            : undefined
        }
      >
        {keysProvider ? (
          <div className="flex flex-col gap-lg">
            <Banner
              tone="info"
              title="零明文持有"
              description="密钥只在这里录入一次，之后任何读接口都不会回显——包括这个页面自己。忘记了只能轮换，不能查看。"
            />
            {keysLoad.kind === "loading" ? (
              <EmptyState title="读取中…" description="正在读取密钥清单。" />
            ) : keysLoad.kind === "error" ? (
              <EmptyState
                title="读取失败"
                description={keysLoad.message}
                action={
                  <Button
                    variant="secondary"
                    onClick={() => void loadKeys(keysProvider.providerCode)}
                  >
                    重试
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-sm">
                {keys.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">
                    暂无密钥。
                  </p>
                ) : (
                  keys.map((k) => (
                    <div
                      key={k.id}
                      className="flex items-center justify-between gap-sm rounded-md border border-border p-sm"
                    >
                      <div className="flex flex-col gap-2xs">
                        <div className="flex items-center gap-sm">
                          <span className="font-mono text-code-sm">
                            {k.keyAlias}
                          </span>
                          <Badge variant="outline">
                            {KEY_SCOPES.find((s) => s.value === k.keyScope)
                              ?.label ?? k.keyScope}
                          </Badge>
                          <StatusBadge tone={providerTone(k.isActive)} dot>
                            {k.isActive ? "启用" : "停用"}
                          </StatusBadge>
                        </div>
                        <span className="text-body-sm text-muted-foreground">
                          最近轮换：{k.lastRotatedAt ?? "从未"}
                        </span>
                      </div>
                      {canManage ? (
                        <ActionMenu
                          label={`${k.keyAlias} 操作`}
                          disabled={submitting}
                          items={[
                            {
                              id: "rotate",
                              label: "轮换",
                              icon: "refresh",
                              onSelect: () => openRotateKey(k),
                            },
                            {
                              id: "toggle",
                              label: k.isActive ? "停用" : "启用",
                              icon: k.isActive ? "pause" : "play",
                              onSelect: () => void toggleKeyActive(k),
                            },
                          ]}
                        />
                      ) : null}
                    </div>
                  ))
                )}
                {canManage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={openCreateKey}
                  >
                    <Icon name="plus" size="sm" aria-hidden="true" />
                    录入密钥
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </Drawer>

      {/* ── 录入 / 轮换密钥 ──────────────────────────────────────────────── */}
      <DialogForm
        open={keyDialog !== null}
        onOpenChange={(open) => {
          if (!open) setKeyDialog(null);
        }}
        size="sm"
        title={
          keyDialog?.kind === "rotate"
            ? `轮换「${keyDialog.key.keyAlias}」`
            : "录入密钥"
        }
        description={
          keyDialog?.kind === "rotate"
            ? "新值会替换旧密文，旧值不保留、不可找回。"
            : undefined
        }
        submitLabel={keyDialog?.kind === "rotate" ? "轮换" : "入库"}
        submitting={submitting}
        submitDisabled={
          keyDialog?.kind === "create"
            ? keyAlias.trim() === "" || plaintextKey.trim() === ""
            : plaintextKey.trim() === ""
        }
        onSubmit={submitKeyDialog}
      >
        <FieldGroup>
          {keyDialog?.kind === "create" ? (
            <>
              <Field>
                <FieldLabel htmlFor="key-alias">Alias</FieldLabel>
                <Input
                  id="key-alias"
                  value={keyAlias}
                  onChange={(e) => setKeyAlias(e.target.value)}
                  placeholder="default"
                  className="font-mono"
                />
                <FieldDescription>
                  同一 Provider 下唯一；模型注册时按 Provider + Alias 引用。
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="key-scope">范围</FieldLabel>
                <NativeSelect
                  id="key-scope"
                  value={keyScope}
                  onChange={(e) => setKeyScope(e.target.value)}
                >
                  {KEY_SCOPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </>
          ) : null}
          <Field>
            <FieldLabel htmlFor="key-plaintext">密钥明文</FieldLabel>
            <Input
              id="key-plaintext"
              type="password"
              value={plaintextKey}
              onChange={(e) => setPlaintextKey(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
              className="font-mono"
            />
            <FieldDescription>
              提交后立即加密入库，这个页面不会再显示它——包括你自己刷新之后。
            </FieldDescription>
          </Field>
        </FieldGroup>
      </DialogForm>
    </>
  );
}
