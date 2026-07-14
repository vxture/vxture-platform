"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ActionMenu,
  Badge,
  Button,
  DialogForm,
  EmptyState,
  Icon,
  Input,
  Label,
  NativeSelect,
  Pagination,
  Textarea,
  useToast,
} from "@vxture/design-system";
import {
  assignComplianceEvent,
  createComplianceEvent,
  deleteComplianceEvent,
  dismissComplianceEvent,
  fetchComplianceEvents,
  fetchPlatformAdmins,
  resolveComplianceEvent,
  updateComplianceEvent,
  type ComplianceEventWriteInput,
} from "@/api/admin-bff";
import type { ComplianceEventItem } from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { formatDate, joinClasses } from "@/modules/tenants/tenant-utils";

// TD-021 合规事件页。设计权威 = governance-write-paths.md §3.2/§5。
// 状态机 open→(指派)in_review→resolved / open|in_review→dismissed；终态只读；
// 软删仅限终态（后端强制）。

type StatusFilter = ComplianceEventItem["status"] | "all";
type DialogMode = "create" | "edit" | null;

interface EventForm {
  tenantId: string;
  eventType: string;
  regulationCode: string;
  evidenceUrl: string;
  tags: string;
}

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<ComplianceEventItem["status"], string> = {
  open: "待处理",
  in_review: "处理中",
  resolved: "已办结",
  dismissed: "已驳回",
};

function statusBadgeClass(status: ComplianceEventItem["status"]) {
  if (status === "open") return "vx-platform-user-status-pill--attention";
  if (status === "in_review") return "vx-platform-user-status-pill--pending";
  if (status === "resolved") return "vx-admin-role-status-pill--enabled";
  return "vx-admin-role-status-pill--disabled";
}

const TERMINAL: ReadonlySet<ComplianceEventItem["status"]> = new Set([
  "resolved",
  "dismissed",
]);

function createDefaultForm(): EventForm {
  return {
    tenantId: "",
    eventType: "",
    regulationCode: "",
    evidenceUrl: "",
    tags: "",
  };
}

function formFromRecord(item: ComplianceEventItem): EventForm {
  return {
    tenantId: item.tenantId ?? "",
    eventType: item.eventType,
    regulationCode: item.regulationCode ?? "",
    evidenceUrl: item.evidenceUrl ?? "",
    tags: item.tags.join(", "),
  };
}

function buildPayload(form: EventForm): ComplianceEventWriteInput {
  return {
    tenantId: form.tenantId.trim() || null,
    eventType: form.eventType.trim(),
    regulationCode: form.regulationCode.trim() || null,
    evidenceUrl: form.evidenceUrl.trim() || null,
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

function describeError(error: unknown): { description?: string } {
  return error instanceof Error && error.message
    ? { description: error.message }
    : {};
}

interface HandlerOption {
  id: string;
  name: string;
}

export function ComplianceEventsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<ComplianceEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(createDefaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] =
    useState<ComplianceEventItem | null>(null);
  const [assignTarget, setAssignTarget] = useState<ComplianceEventItem | null>(
    null,
  );
  const [handlerOptions, setHandlerOptions] = useState<HandlerOption[]>([]);
  const [handlerId, setHandlerId] = useState("");

  useEffect(() => {
    fetchComplianceEvents()
      .then(setItems)
      .catch((error) => {
        setItems([]);
        setLoadError(
          error instanceof Error ? error.message : "合规事件读取失败",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (statusFilter !== "all")
      result = result.filter((i) => i.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((i) =>
        [
          i.eventType,
          i.tenantName ?? "",
          i.regulationCode ?? "",
          i.handlerName ?? "",
          ...i.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return result;
  }, [items, search, statusFilter]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  async function reload() {
    setItems(await fetchComplianceEvents());
  }

  function openCreate() {
    setEditingId(null);
    setForm(createDefaultForm());
    setDialogMode("create");
  }

  function openEdit(item: ComplianceEventItem) {
    setEditingId(item.id);
    setForm(formFromRecord(item));
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingId(null);
  }

  async function openAssign(item: ComplianceEventItem) {
    setAssignTarget(item);
    setHandlerId(item.handlerId ?? "");
    if (handlerOptions.length === 0) {
      try {
        const admins = await fetchPlatformAdmins();
        setHandlerOptions(
          admins
            .filter((a) => a.statusCode === "active")
            .map((a) => ({ id: a.id, name: a.displayName || a.username })),
        );
      } catch {
        // 拉取失败时仍可手填 handler uuid（选项为空 → 显示提示）。
      }
    }
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.eventType.trim().length === 0) return;
    setSubmitting(true);
    try {
      if (dialogMode === "edit" && editingId) {
        await updateComplianceEvent(editingId, buildPayload(form));
        toast({ tone: "success", title: "合规事件已更新" });
      } else {
        await createComplianceEvent(buildPayload(form));
        toast({ tone: "success", title: "合规事件已创建" });
      }
      await reload();
      closeDialog();
    } catch (error) {
      toast({ tone: "error", title: "保存失败", ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(label: string, action: () => Promise<unknown>) {
    setSubmitting(true);
    try {
      await action();
      await reload();
      toast({ tone: "success", title: label });
    } catch (error) {
      toast({ tone: "error", title: `${label}失败`, ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignTarget || !handlerId) return;
    const target = assignTarget;
    setAssignTarget(null);
    await runAction("已指派处理人", () =>
      assignComplianceEvent(target.id, handlerId),
    );
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    await runAction("合规事件已删除", () => deleteComplianceEvent(target.id));
  }

  return (
    <div className={joinClasses("vx-page-stack", "vx-compliance-page")}>
      <PageHeader
        icon="shield-check"
        title="合规事件"
        description="跟踪平台与租户合规事件：指派处理人、办结与驳回、证据留存。"
      />
      <div className="vx-models-summary">
        <div className="vx-models-summary__item">
          <Icon name="warning" size="md" fallback="placeholder" />
          <span>待处理</span>
          <strong>{items.filter((i) => i.status === "open").length}</strong>
        </div>
        <div className="vx-models-summary__item">
          <Icon name="clock" size="md" fallback="placeholder" />
          <span>处理中</span>
          <strong>
            {items.filter((i) => i.status === "in_review").length}
          </strong>
        </div>
        <div className="vx-models-summary__item">
          <Icon name="check" size="md" fallback="placeholder" />
          <span>已办结</span>
          <strong>{items.filter((i) => i.status === "resolved").length}</strong>
        </div>
      </div>
      <div className="vx-models-toolbar">
        <Input
          className="vx-models-toolbar__search"
          type="search"
          placeholder="搜索事件类型、租户、法规、处理人…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="vx-models-toolbar__filters">
          <NativeSelect
            className="vx-admin-filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
          >
            <option value="all">全部状态</option>
            <option value="open">待处理</option>
            <option value="in_review">处理中</option>
            <option value="resolved">已办结</option>
            <option value="dismissed">已驳回</option>
          </NativeSelect>
        </div>
        <div className="vx-models-toolbar__spacer" />
        <span className="vx-models-toolbar__count">{filtered.length} 条</span>
        <Button
          variant="default"
          size="sm"
          className="vx-admin-action-btn"
          onClick={openCreate}
          title="新建合规事件"
        >
          <Icon name="plus" size="sm" fallback="placeholder" />
          新建事件
        </Button>
      </div>
      {loading ? (
        <EmptyState title="加载中…" />
      ) : loadError ? (
        <EmptyState title="合规事件读取失败" description={loadError} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="暂无合规事件"
          description={
            search || statusFilter !== "all"
              ? "尝试调整筛选条件"
              : "点击「新建事件」登记第一条合规事件"
          }
        />
      ) : (
        <>
          <div
            className="vx-tenant-directory-list vx-compliance-directory-list"
            role="region"
            aria-label="合规事件列表"
          >
            <div className="vx-tenant-directory-list__header">
              <span>序号</span>
              <span>事件类型</span>
              <span>租户</span>
              <span>状态</span>
              <span>法规条款</span>
              <span>处理人</span>
              <span>更新时间</span>
              <span>操作</span>
            </div>
            {pageItems.map((item, index) => (
              <div
                key={item.id}
                className="vx-tenant-directory-row vx-compliance-row"
              >
                <span className="vx-tenant-directory-row__index">
                  {(page - 1) * PAGE_SIZE + index + 1}
                </span>
                <span className="vx-compliance-row__type">
                  {item.eventType}
                  {item.evidenceUrl ? (
                    <a
                      href={item.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="查看证据材料"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Icon
                        name="arrow-long-right"
                        size="xs"
                        fallback="placeholder"
                      />
                    </a>
                  ) : null}
                </span>
                <span>
                  {item.tenantName ??
                    (item.tenantId ? item.tenantId : "平台级")}
                </span>
                <span>
                  <Badge className={statusBadgeClass(item.status)}>
                    {STATUS_LABELS[item.status]}
                  </Badge>
                </span>
                <span>{item.regulationCode ?? "-"}</span>
                <span>{item.handlerName ?? "-"}</span>
                <span>{formatDate(item.updatedAt)}</span>
                <span className="vx-tenant-actions">
                  <ActionMenu
                    label="合规事件操作"
                    triggerClassName="vx-tenant-actions__trigger"
                    triggerProps={{ title: "操作", disabled: submitting }}
                    items={[
                      {
                        id: "assign",
                        label: item.handlerId ? "改派处理人" : "指派处理人",
                        icon: (
                          <Icon name="user" size="xs" fallback="placeholder" />
                        ),
                        disabled: submitting || TERMINAL.has(item.status),
                        onSelect: () => void openAssign(item),
                      },
                      {
                        id: "resolve",
                        label: "办结",
                        icon: (
                          <Icon name="check" size="xs" fallback="placeholder" />
                        ),
                        disabled:
                          submitting ||
                          item.status !== "in_review" ||
                          !item.handlerId,
                        onSelect: () =>
                          void runAction("事件已办结", () =>
                            resolveComplianceEvent(item.id),
                          ),
                      },
                      {
                        id: "dismiss",
                        label: "驳回（误报/不适用）",
                        icon: (
                          <Icon name="stop" size="xs" fallback="placeholder" />
                        ),
                        disabled: submitting || TERMINAL.has(item.status),
                        onSelect: () =>
                          void runAction("事件已驳回", () =>
                            dismissComplianceEvent(item.id),
                          ),
                      },
                      {
                        id: "edit",
                        label: "编辑",
                        icon: (
                          <Icon name="edit" size="xs" fallback="placeholder" />
                        ),
                        disabled: submitting || TERMINAL.has(item.status),
                        onSelect: () => openEdit(item),
                      },
                      {
                        id: "delete",
                        label: "删除（仅终态）",
                        icon: (
                          <Icon name="trash" size="xs" fallback="placeholder" />
                        ),
                        danger: true,
                        disabled: submitting || !TERMINAL.has(item.status),
                        separatorBefore: true,
                        onSelect: () => setPendingDelete(item),
                      },
                    ]}
                  />
                </span>
              </div>
            ))}
          </div>
          {pageCount > 1 ? (
            <Pagination
              className="vx-tenant-pagination"
              page={page}
              pageCount={pageCount}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}

      {dialogMode ? (
        <DialogForm
          open
          title={dialogMode === "create" ? "新建合规事件" : "编辑合规事件"}
          description="事件登记后经「指派处理人」进入处理，办结/驳回后只读。"
          submitLabel={dialogMode === "create" ? "创建" : "保存修改"}
          submitting={submitting}
          submitDisabled={form.eventType.trim().length === 0}
          contentClassName="max-w-3xl"
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
          onSubmit={(event) => void submitForm(event)}
        >
          <div className="vx-model-dialog__grid">
            <Label>
              事件类型
              <Input
                value={form.eventType}
                maxLength={64}
                onChange={(e) =>
                  setForm((f) => ({ ...f, eventType: e.target.value }))
                }
                placeholder="如 kyc_review / content_takedown"
                required
              />
            </Label>
            <Label>
              法规条款（可选）
              <Input
                value={form.regulationCode}
                maxLength={64}
                onChange={(e) =>
                  setForm((f) => ({ ...f, regulationCode: e.target.value }))
                }
                placeholder="如 GDPR-32"
              />
            </Label>
          </div>
          <Label>
            关联租户 ID（可选，留空 = 平台级事件）
            <Input
              value={form.tenantId}
              onChange={(e) =>
                setForm((f) => ({ ...f, tenantId: e.target.value }))
              }
              placeholder="tenancy.tenants 的 uuid"
            />
          </Label>
          <Label>
            证据材料 URL（可选，仅 http/https）
            <Input
              type="url"
              value={form.evidenceUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, evidenceUrl: e.target.value }))
              }
              placeholder="https://…"
            />
          </Label>
          <Label>
            标签（逗号分隔，可选）
            <Textarea
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              rows={2}
              placeholder="如 kyc, quarterly"
            />
          </Label>
        </DialogForm>
      ) : null}

      {assignTarget ? (
        <DialogForm
          open
          title="指派处理人"
          description={`为「${assignTarget.eventType}」指定处理运营；首次指派后事件进入处理中。`}
          submitLabel="指派"
          submitting={submitting}
          submitDisabled={!handlerId}
          onOpenChange={(open) => {
            if (!open) setAssignTarget(null);
          }}
          onSubmit={(event) => void confirmAssign(event)}
        >
          <Label>
            处理人
            {handlerOptions.length > 0 ? (
              <NativeSelect
                value={handlerId}
                onChange={(e) => setHandlerId(e.target.value)}
              >
                <option value="">请选择</option>
                {handlerOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </NativeSelect>
            ) : (
              <Input
                value={handlerId}
                onChange={(e) => setHandlerId(e.target.value)}
                placeholder="处理人 operator uuid"
              />
            )}
          </Label>
        </DialogForm>
      ) : null}

      {pendingDelete ? (
        <DialogForm
          open
          title="删除合规事件"
          description={`确认删除「${pendingDelete.eventType}」？记录将被软删并从列表隐藏。`}
          submitLabel="删除"
          submitVariant="destructive"
          submitting={submitting}
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
          onSubmit={(event) => {
            event.preventDefault();
            void confirmDelete();
          }}
        />
      ) : null}
    </div>
  );
}
