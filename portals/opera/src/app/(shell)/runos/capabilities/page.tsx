"use client";

/* Capability — Runos 四原语（连接器/技能/执行器/资产）统一注册台账。
 *
 * 2026-08-11 接真实数据：opera-bff 的 runos.router.ts 直接代理 Runos 真实的
 * `/capability/capabilities` + `/capability/endpoints`（vxture-runos
 * service/src/registry/registry.controller.ts 是权威契约）。M1 只登记
 * connector/executor 两种原语（skill/asset 的注册机制还在设计阶段，见
 * vxture-runos docs/30-design/130-m1-scope.md），Policy/Credential/Quality
 * Profile/Audit/Supply Catalog/Plugin 六块 Runos 侧还没有对应接口，继续留在
 * 各自的"规划中"占位页，这里不假装能管。
 *
 * Endpoint 没有独立的列表接口——它永远挂在某个 capability 的某个版本下，注册
 * 与查看都在这个页面的详情抽屉里做，不单独开一页假装有独立集合。 */

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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Section,
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

const MANAGE = "capability:runos.manage";

interface CapabilityRecord {
  capabilityId: string;
  primitiveType: string;
  providerId: string;
  ownerRef: string;
  title: string;
  admissionTier: string;
  createdAt: string;
  updatedAt: string;
}

interface CapabilityVersionRecord {
  capabilityId: string;
  version: string;
  state: string;
  contract: Record<string, unknown>;
  contentDigest: string;
  createdAt: string;
}

interface CapabilityAliasRecord {
  capabilityId: string;
  alias: string;
  version: string;
  updatedAt: string;
}

interface EndpointInstanceRecord {
  id: string;
  capabilityId: string;
  version: string;
  environment: string;
  baseUrl: string;
  status: string;
  createdAt: string;
}

interface CapabilityDetailRecord extends CapabilityRecord {
  versions: CapabilityVersionRecord[];
  aliases: CapabilityAliasRecord[];
  endpoints: EndpointInstanceRecord[];
}

const PRIMITIVE_LABELS: Record<string, string> = {
  connector: "连接器",
  skill: "技能",
  executor: "执行器",
  asset: "资产",
};

const ADMISSION_TONE: Record<string, StatusBadgeTone> = {
  official: "success",
  certified: "info",
  experimental: "neutral",
};

const VERSION_STATE_TONE: Record<string, StatusBadgeTone> = {
  draft: "neutral",
  submitted: "neutral",
  admitted: "info",
  stable: "success",
  deprecated: "warning",
  withdrawn: "danger",
};

const ENDPOINT_STATUS_TONE: Record<string, StatusBadgeTone> = {
  active: "success",
  draining: "warning",
  disabled: "neutral",
};

const CONTRACT_TEMPLATE = `{
  "version": "1.0.0",
  "summary": "一句话描述这个能力做什么（≤200 字，用于语义检索）",
  "useWhen": "什么场景该用它",
  "avoidWhen": "什么场景不该用它",
  "operations": [
    {
      "operation": "run_code",
      "description": "运行一段代码",
      "inputSchema": { "type": "object", "properties": {} },
      "outputSchema": { "type": "object" },
      "interactionMode": "sync",
      "riskLevel": "read",
      "idempotent": false
    }
  ]
}`;

const EXECUTOR_TEMPLATE = `{
  "runtimeClass": "code-python",
  "resourceLimits": { "cpu": 1, "memoryMb": 512, "wallTimeSeconds": 60 },
  "egressPolicy": "none",
  "persistence": "ephemeral"
}`;

interface RegisterDraft {
  capabilityId: string;
  primitiveType: "connector" | "executor";
  providerId: string;
  ownerRef: string;
  title: string;
  contractJson: string;
  executorJson: string;
}

const EMPTY_DRAFT: RegisterDraft = {
  capabilityId: "",
  primitiveType: "executor",
  providerId: "",
  ownerRef: "",
  title: "",
  contractJson: CONTRACT_TEMPLATE,
  executorJson: EXECUTOR_TEMPLATE,
};

interface EndpointDraft {
  version: string;
  environment: "prod" | "sandbox";
  baseUrl: string;
}

function emptyEndpointDraft(version: string): EndpointDraft {
  return { version, environment: "sandbox", baseUrl: "" };
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

export default function CapabilitiesPage() {
  const { toast } = useToast();
  const { can } = useOperatorSession();
  const canManage = can(MANAGE);

  const [rows, setRows] = useState<CapabilityRecord[]>([]);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [keyword, setKeyword] = useState("");
  const [primitiveFilter, setPrimitiveFilter] = useState<string>("all");
  const [selectedKeys, setSelectedKeys] = useState<readonly string[]>([]);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CapabilityDetailRecord | null>(null);
  const [detailLoad, setDetailLoad] = useState<LoadState>({ kind: "ready" });

  const [registerOpen, setRegisterOpen] = useState(false);
  const [draft, setDraft] = useState<RegisterDraft>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);

  const [endpointDialog, setEndpointDialog] = useState<EndpointDraft | null>(
    null,
  );

  const reload = useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const data = await api.get<CapabilityRecord[]>("/api/runos/capabilities");
      setRows(data);
      setLoad({ kind: "ready" });
    } catch (error) {
      setLoad({
        kind: "error",
        message:
          error instanceof OperaApiError
            ? error.message
            : "读取 Capability 失败",
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadDetail = useCallback(async (capabilityId: string) => {
    setDetailLoad({ kind: "loading" });
    try {
      const data = await api.get<CapabilityDetailRecord>(
        `/api/runos/capabilities/${encodeURIComponent(capabilityId)}`,
      );
      setDetail(data);
      setDetailLoad({ kind: "ready" });
    } catch (error) {
      setDetailLoad({
        kind: "error",
        message:
          error instanceof OperaApiError ? error.message : "读取详情失败",
      });
    }
  }, []);

  function openDetail(capabilityId: string) {
    setDetailId(capabilityId);
    void loadDetail(capabilityId);
  }

  function closeDetail() {
    setDetailId(null);
    setDetail(null);
  }

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (primitiveFilter === "all" || r.primitiveType === primitiveFilter) &&
        (kw === "" ||
          r.capabilityId.toLowerCase().includes(kw) ||
          r.title.toLowerCase().includes(kw)),
    );
  }, [rows, keyword, primitiveFilter]);

  const pager = useListPagination(filtered, 20);

  function openRegister() {
    setDraft(EMPTY_DRAFT);
    setRegisterOpen(true);
  }

  async function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let contract: Record<string, unknown>;
    try {
      contract = JSON.parse(draft.contractJson) as Record<string, unknown>;
    } catch {
      toast({
        tone: "danger",
        title: "contract 不是合法 JSON",
        description: "先修好 JSON 语法再提交。",
      });
      return;
    }
    if (draft.primitiveType === "executor") {
      try {
        contract.executor = JSON.parse(draft.executorJson);
      } catch {
        toast({
          tone: "danger",
          title: "executor 不是合法 JSON",
          description: "先修好 JSON 语法再提交。",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.post("/api/runos/capabilities", {
        capability: {
          capabilityId: draft.capabilityId.trim(),
          primitiveType: draft.primitiveType,
          providerId: draft.providerId.trim(),
          ownerRef: draft.ownerRef.trim(),
          title: draft.title.trim(),
        },
        contract,
      });
      toast({ tone: "success", title: `${draft.capabilityId} 已注册` });
      setRegisterOpen(false);
      await reload();
    } catch (error) {
      toast({ tone: "danger", title: "注册失败", ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function promote(capabilityId: string, version: string) {
    setSubmitting(true);
    try {
      await api.post(
        `/api/runos/capabilities/${encodeURIComponent(capabilityId)}/versions/${encodeURIComponent(version)}/promote`,
      );
      toast({
        tone: "success",
        title: `${capabilityId}@${version} 已提升为 stable`,
      });
      await loadDetail(capabilityId);
    } catch (error) {
      toast({ tone: "danger", title: "提升失败", ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEndpoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!endpointDialog || !detail) return;
    setSubmitting(true);
    try {
      await api.post("/api/runos/endpoints", {
        capabilityId: detail.capabilityId,
        version: endpointDialog.version,
        environment: endpointDialog.environment,
        baseUrl: endpointDialog.baseUrl.trim(),
      });
      toast({ tone: "success", title: "Endpoint 已注册" });
      setEndpointDialog(null);
      await loadDetail(detail.capabilityId);
    } catch (error) {
      toast({ tone: "danger", title: "注册失败", ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function setEndpointStatus(endpointId: string, status: string) {
    if (!detail) return;
    setSubmitting(true);
    try {
      await api.patch(`/api/runos/endpoints/${endpointId}/status`, { status });
      toast({
        tone: "success",
        title: `Endpoint 已${status === "active" ? "启用" : status === "disabled" ? "禁用" : "转排空"}`,
      });
      await loadDetail(detail.capabilityId);
    } catch (error) {
      toast({ tone: "danger", title: "操作失败", ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  const draftValid =
    draft.capabilityId.trim() !== "" &&
    draft.providerId.trim() !== "" &&
    draft.ownerRef.trim() !== "" &&
    draft.title.trim() !== "";

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
      <EmptyState title="读取中…" description="正在读取 Capability 清单。" />
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
        title="没有匹配的 Capability"
        description="换个关键词或筛选条件再看。"
      />
    ) : (
      <EmptyState
        title="暂无 Capability"
        description="点击「注册 Capability」开始。"
      />
    );

  const stableAlias = detail?.aliases.find((a) => a.alias === "stable");
  const latestAlias = detail?.aliases.find((a) => a.alias === "latest");

  return (
    <>
      <ListPageTemplate
        header={
          <ViewHeader
            icon="stack"
            title="Capability"
            description="四原语统一注册台账；数据来自 Runos 的 /capability/capabilities。M1 只登记连接器与执行器。"
            action={
              canManage ? (
                <Button onClick={openRegister} disabled={submitting}>
                  <Icon name="plus" size="sm" aria-hidden="true" />
                  注册 Capability
                </Button>
              ) : null
            }
          />
        }
        filters={
          <FilterBar
            view="list"
            onViewChange={() => {}}
            cardsDisabledReason="卡片视图已下线，改用列表"
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
                placeholder="搜索 Capability…"
                aria-label="搜索 Capability"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  pager.resetPage();
                }}
              />
            </InputGroup>
            <NativeSelect
              wrapperClassName="w-fit"
              value={primitiveFilter}
              onChange={(e) => {
                setPrimitiveFilter(e.target.value);
                pager.resetPage();
              }}
              aria-label="原语类型筛选"
            >
              <option value="all">全部类型</option>
              <option value="connector">连接器</option>
              <option value="executor">执行器</option>
              <option value="skill">技能（尚不可注册）</option>
              <option value="asset">资产（尚不可注册）</option>
            </NativeSelect>
          </FilterBar>
        }
        table={
          <DataTable
            columns={[
              {
                id: "id",
                header: "Capability",
                cell: (r: CapabilityRecord) => (
                  <TableTitleCell
                    icon="stack"
                    title={<span className="font-mono">{r.capabilityId}</span>}
                    description={r.title}
                    onTitleClick={() => openDetail(r.capabilityId)}
                  />
                ),
              },
              {
                id: "provider",
                header: "Provider",
                width: "sm",
                cell: (r: CapabilityRecord) => (
                  <span className="text-code-sm">{r.providerId}</span>
                ),
              },
              {
                id: "owner",
                header: "Owner",
                width: "sm",
                cell: (r: CapabilityRecord) => (
                  <span className="text-body-sm text-muted-foreground">
                    {r.ownerRef}
                  </span>
                ),
              },
              {
                id: "type",
                header: "类型",
                align: "center",
                width: "xs",
                cell: (r: CapabilityRecord) => (
                  <Badge variant="secondary">
                    {PRIMITIVE_LABELS[r.primitiveType] ?? r.primitiveType}
                  </Badge>
                ),
              },
              {
                id: "tier",
                header: "准入等级",
                align: "center",
                width: "xs",
                cell: (r: CapabilityRecord) => (
                  <StatusBadge
                    tone={ADMISSION_TONE[r.admissionTier] ?? "neutral"}
                    dot
                  >
                    {r.admissionTier}
                  </StatusBadge>
                ),
              },
            ]}
            rows={pager.pageRows}
            rowKey={(r: CapabilityRecord) => r.capabilityId}
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            indexStart={pager.indexStart}
            rowActions={(r: CapabilityRecord) => (
              <ActionMenu
                label={`${r.capabilityId} 操作`}
                items={[
                  {
                    id: "detail",
                    label: "查看详情",
                    icon: "eye",
                    onSelect: () => openDetail(r.capabilityId),
                  },
                ]}
              />
            )}
            footer={pagination}
            empty={emptyState}
          />
        }
      />

      {/* ── 注册 Capability ─────────────────────────────────────────────── */}
      <DialogForm
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        title="注册 Capability"
        description="M1 只接受 connector / executor；skill / asset 的注册机制还没上线。"
        submitLabel="注册"
        submitting={submitting}
        submitDisabled={!draftValid}
        onSubmit={submitRegister}
      >
        <div className="max-h-[60vh] overflow-y-auto pr-2xs">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cap-id">Capability ID</FieldLabel>
              <Input
                id="cap-id"
                value={draft.capabilityId}
                onChange={(e) =>
                  setDraft({ ...draft, capabilityId: e.target.value })
                }
                placeholder="runos.code-sandbox"
                className="font-mono"
              />
              <FieldDescription>
                格式 {"{provider}.{name}"}，两段都是小写
                kebab；前缀必须等于下面的 Provider。
              </FieldDescription>
            </Field>
            <div className="grid grid-cols-2 gap-md">
              <Field>
                <FieldLabel htmlFor="cap-type">类型</FieldLabel>
                <NativeSelect
                  id="cap-type"
                  value={draft.primitiveType}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      primitiveType: e.target
                        .value as RegisterDraft["primitiveType"],
                    })
                  }
                >
                  <option value="executor">执行器（Executor）</option>
                  <option value="connector">连接器（Connector）</option>
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="cap-provider">Provider</FieldLabel>
                <Input
                  id="cap-provider"
                  value={draft.providerId}
                  onChange={(e) =>
                    setDraft({ ...draft, providerId: e.target.value })
                  }
                  placeholder="runos"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="cap-owner">Owner Ref</FieldLabel>
              <Input
                id="cap-owner"
                value={draft.ownerRef}
                onChange={(e) =>
                  setDraft({ ...draft, ownerRef: e.target.value })
                }
                placeholder="runos/executor"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cap-title">标题</FieldLabel>
              <Input
                id="cap-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Python code sandbox"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cap-contract">
                Contract（JSON，version / summary / useWhen / avoidWhen /
                operations）
              </FieldLabel>
              <Textarea
                id="cap-contract"
                value={draft.contractJson}
                onChange={(e) =>
                  setDraft({ ...draft, contractJson: e.target.value })
                }
                rows={12}
                className="font-mono text-code-sm"
              />
              <FieldDescription>
                contract 结构还在 M1 阶段，没有做成表单——字段随时可能长（见
                vxture-runos 120-capability-model.md），先按 JSON 直填，比做一个
                会漏字段的表单诚实。
              </FieldDescription>
            </Field>
            {draft.primitiveType === "executor" ? (
              <Field>
                <FieldLabel htmlFor="cap-executor">
                  Executor 契约（JSON，runtimeClass / resourceLimits /
                  egressPolicy / persistence）
                </FieldLabel>
                <Textarea
                  id="cap-executor"
                  value={draft.executorJson}
                  onChange={(e) =>
                    setDraft({ ...draft, executorJson: e.target.value })
                  }
                  rows={6}
                  className="font-mono text-code-sm"
                />
                <FieldDescription>
                  M1 只接受
                  egressPolicy=&quot;none&quot;、persistence=&quot;ephemeral&quot;。
                </FieldDescription>
              </Field>
            ) : null}
          </FieldGroup>
        </div>
      </DialogForm>

      {/* ── 详情抽屉 ─────────────────────────────────────────────────────── */}
      <Drawer
        open={detailId !== null}
        onClose={closeDetail}
        width={560}
        title={
          detailId ? <span className="font-mono">{detailId}</span> : undefined
        }
        description={detail?.title}
      >
        {detailLoad.kind === "loading" ? (
          <EmptyState title="读取中…" description="正在读取详情。" />
        ) : detailLoad.kind === "error" ? (
          <EmptyState
            title="读取失败"
            description={detailLoad.message}
            action={
              <Button
                variant="secondary"
                onClick={() => detailId && void loadDetail(detailId)}
              >
                重试
              </Button>
            }
          />
        ) : detail ? (
          <div className="flex flex-col gap-lg">
            <div className="flex flex-wrap items-center gap-sm">
              <Badge variant="secondary">
                {PRIMITIVE_LABELS[detail.primitiveType] ?? detail.primitiveType}
              </Badge>
              <StatusBadge
                tone={ADMISSION_TONE[detail.admissionTier] ?? "neutral"}
                dot
              >
                {detail.admissionTier}
              </StatusBadge>
              <span className="text-body-sm text-muted-foreground">
                Provider {detail.providerId} · Owner {detail.ownerRef}
              </span>
            </div>

            <Section title="别名" icon="link" level={2}>
              <div className="flex flex-col gap-2xs text-body-sm">
                <div>
                  <span className="text-muted-foreground">latest → </span>
                  <span className="font-mono">
                    {latestAlias?.version ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">stable → </span>
                  <span className="font-mono">
                    {stableAlias?.version ?? "（尚未提升）"}
                  </span>
                </div>
              </div>
            </Section>

            <Section title="版本" icon="git-branch" level={2}>
              <div className="flex flex-col gap-sm">
                {detail.versions.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">
                    暂无版本。
                  </p>
                ) : (
                  detail.versions.map((v) => (
                    <div
                      key={v.version}
                      className="flex items-center justify-between gap-sm rounded-md border border-border p-sm"
                    >
                      <div className="flex items-center gap-sm">
                        <span className="font-mono text-code-sm">
                          {v.version}
                        </span>
                        <StatusBadge
                          tone={VERSION_STATE_TONE[v.state] ?? "neutral"}
                          dot
                        >
                          {v.state}
                        </StatusBadge>
                      </div>
                      {canManage &&
                      (v.state === "admitted" || v.state === "stable") ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={submitting || v.state === "stable"}
                          onClick={() =>
                            void promote(detail.capabilityId, v.version)
                          }
                        >
                          {v.state === "stable"
                            ? "已是 stable"
                            : "提升为 stable"}
                        </Button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section
              title="Endpoint"
              icon="plug"
              level={2}
              description="按环境登记的物理端点；没有独立列表接口，永远挂在某个版本下。"
            >
              <div className="flex flex-col gap-sm">
                {detail.endpoints.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">
                    暂无 Endpoint。
                  </p>
                ) : (
                  detail.endpoints.map((ep) => (
                    <div
                      key={ep.id}
                      className="flex items-center justify-between gap-sm rounded-md border border-border p-sm"
                    >
                      <div className="flex flex-col gap-2xs">
                        <div className="flex items-center gap-sm">
                          <Badge variant="outline">{ep.environment}</Badge>
                          <span className="font-mono text-code-sm">
                            {ep.version}
                          </span>
                          <StatusBadge
                            tone={ENDPOINT_STATUS_TONE[ep.status] ?? "neutral"}
                            dot
                          >
                            {ep.status}
                          </StatusBadge>
                        </div>
                        <span className="text-code-sm text-muted-foreground break-all">
                          {ep.baseUrl}
                        </span>
                      </div>
                      {canManage ? (
                        <NativeSelect
                          wrapperClassName="w-fit shrink-0"
                          value={ep.status}
                          disabled={submitting}
                          onChange={(e) =>
                            void setEndpointStatus(ep.id, e.target.value)
                          }
                          aria-label={`${ep.id} 状态`}
                        >
                          <option value="active">active</option>
                          <option value="draining">draining</option>
                          <option value="disabled">disabled</option>
                        </NativeSelect>
                      ) : null}
                    </div>
                  ))
                )}
                {canManage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() =>
                      setEndpointDialog(
                        emptyEndpointDraft(latestAlias?.version ?? ""),
                      )
                    }
                  >
                    <Icon name="plus" size="sm" aria-hidden="true" />
                    注册 Endpoint
                  </Button>
                ) : null}
              </div>
            </Section>
          </div>
        ) : null}
      </Drawer>

      {/* ── 注册 Endpoint（挂在当前详情的 capability 下）────────────────────── */}
      <Dialog
        open={endpointDialog !== null}
        onOpenChange={(open) => {
          if (!open) setEndpointDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              注册 Endpoint{detail ? ` · ${detail.capabilityId}` : ""}
            </DialogTitle>
          </DialogHeader>
          {endpointDialog ? (
            <form
              className="flex flex-col gap-md"
              onSubmit={(e) => void submitEndpoint(e)}
            >
              <Banner
                tone="info"
                title="没有独立列表接口"
                description="Endpoint 永远挂在某个版本下，这里注册后会出现在上面的版本列表旁。"
              />
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="ep-version">版本</FieldLabel>
                  <Input
                    id="ep-version"
                    value={endpointDialog.version}
                    onChange={(e) =>
                      setEndpointDialog({
                        ...endpointDialog,
                        version: e.target.value,
                      })
                    }
                    placeholder="1.0.0"
                    className="font-mono"
                  />
                  <FieldDescription>必须是已注册过的版本号。</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="ep-env">环境</FieldLabel>
                  <NativeSelect
                    id="ep-env"
                    value={endpointDialog.environment}
                    onChange={(e) =>
                      setEndpointDialog({
                        ...endpointDialog,
                        environment: e.target
                          .value as EndpointDraft["environment"],
                      })
                    }
                  >
                    <option value="sandbox">sandbox</option>
                    <option value="prod">prod</option>
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="ep-url">Base URL</FieldLabel>
                  <Input
                    id="ep-url"
                    value={endpointDialog.baseUrl}
                    onChange={(e) =>
                      setEndpointDialog({
                        ...endpointDialog,
                        baseUrl: e.target.value,
                      })
                    }
                    placeholder="http://executor:3210/mcp"
                    className="font-mono"
                  />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEndpointDialog(null)}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={
                    submitting ||
                    endpointDialog.version.trim() === "" ||
                    endpointDialog.baseUrl.trim() === ""
                  }
                >
                  注册
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
