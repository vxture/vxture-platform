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
  createRiskRecord,
  deleteRiskRecord,
  fetchRiskRecords,
  reviewRiskRecord,
  updateRiskRecord,
  type RiskRecordWriteInput,
} from "@/api/admin-bff";
import type { RiskRecordItem } from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { formatDate, joinClasses } from "@/modules/tenants/tenant-utils";

// TD-021 风险记录页。设计权威 = governance-write-paths.md §3.1/§5。
// 「审阅」= 后端写 reviewer_id；risk_level 变更后端自动清空 reviewer_id。

type LevelFilter = RiskRecordItem["riskLevel"] | "all";
type ReviewFilter = "all" | "reviewed" | "pending";
type DialogMode = "create" | "edit" | null;

interface RiskForm {
  tenantId: string;
  riskLevel: RiskRecordItem["riskLevel"];
  riskScore: string;
  scope: string;
  reason: string;
  tags: string;
}

const PAGE_SIZE = 20;

const LEVEL_LABELS: Record<RiskRecordItem["riskLevel"], string> = {
  normal: "常规",
  follow_up: "需跟进",
  high: "高风险",
};

function levelBadgeClass(level: RiskRecordItem["riskLevel"]) {
  if (level === "high") return "vx-platform-user-status-pill--attention";
  if (level === "follow_up") return "vx-platform-user-status-pill--pending";
  return "vx-admin-role-status-pill--enabled";
}

function createDefaultForm(): RiskForm {
  return {
    tenantId: "",
    riskLevel: "normal",
    riskScore: "",
    scope: "",
    reason: "",
    tags: "",
  };
}

function formFromRecord(item: RiskRecordItem): RiskForm {
  return {
    tenantId: item.tenantId,
    riskLevel: item.riskLevel,
    riskScore: item.riskScore === null ? "" : String(item.riskScore),
    scope: item.scope ?? "",
    reason: item.reason,
    tags: item.tags.join(", "),
  };
}

function buildPayload(
  form: RiskForm,
  mode: "create" | "edit",
): RiskRecordWriteInput {
  const tags = form.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    ...(mode === "create" ? { tenantId: form.tenantId.trim() } : {}),
    riskLevel: form.riskLevel,
    riskScore: form.riskScore === "" ? null : Number(form.riskScore),
    scope: form.scope.trim() || null,
    reason: form.reason.trim(),
    tags,
  };
}

function describeError(error: unknown): { description?: string } {
  return error instanceof Error && error.message
    ? { description: error.message }
    : {};
}

function formIsValid(form: RiskForm, mode: "create" | "edit") {
  if (form.reason.trim().length === 0) return false;
  if (mode === "create" && form.tenantId.trim().length === 0) return false;
  if (form.riskScore !== "") {
    const n = Number(form.riskScore);
    if (!Number.isInteger(n) || n < 0 || n > 100) return false;
  }
  return true;
}

export function RiskRecordsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<RiskRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [page, setPage] = useState(1);

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RiskForm>(createDefaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RiskRecordItem | null>(
    null,
  );

  useEffect(() => {
    // 待处置视图与总览卡口径对齐（reviewed=false&riskLevel=follow_up,high）由
    // URL 直达场景通过筛选器复现；列表本身拉全量（≤500）客户端过滤。
    const params = new URLSearchParams(window.location.search);
    if (params.get("reviewed") === "false") setReviewFilter("pending");
    const level = params.get("riskLevel");
    if (level === "follow_up,high") setLevelFilter("all");
    fetchRiskRecords()
      .then(setItems)
      .catch((error) => {
        setItems([]);
        setLoadError(
          error instanceof Error ? error.message : "风险记录读取失败",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (levelFilter !== "all")
      result = result.filter((i) => i.riskLevel === levelFilter);
    if (reviewFilter === "reviewed")
      result = result.filter((i) => i.reviewerId !== null);
    if (reviewFilter === "pending")
      result = result.filter((i) => i.reviewerId === null);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((i) =>
        [i.tenantName ?? "", i.tenantId, i.scope ?? "", i.reason, ...i.tags]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return result;
  }, [items, search, levelFilter, reviewFilter]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  async function reload() {
    setItems(await fetchRiskRecords());
  }

  function openCreate() {
    setEditingId(null);
    setForm(createDefaultForm());
    setDialogMode("create");
  }

  function openEdit(item: RiskRecordItem) {
    setEditingId(item.id);
    setForm(formFromRecord(item));
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingId(null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialogMode || !formIsValid(form, dialogMode)) return;
    setSubmitting(true);
    try {
      if (dialogMode === "edit" && editingId) {
        await updateRiskRecord(editingId, buildPayload(form, "edit"));
        toast({ tone: "success", title: "风险记录已更新" });
      } else {
        await createRiskRecord(buildPayload(form, "create"));
        toast({ tone: "success", title: "风险记录已创建" });
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

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    await runAction("风险记录已删除", () => deleteRiskRecord(target.id));
  }

  const pendingCount = items.filter(
    (i) => i.reviewerId === null && i.riskLevel !== "normal",
  ).length;

  return (
    <div className={joinClasses("vx-page-stack", "vx-risk-records-page")}>
      <PageHeader
        icon="warning"
        title="风险记录"
        description="管理租户风险评估记录：录入、跟进、审阅处置与标签归类。"
      />
      <div className="vx-models-summary">
        <div className="vx-models-summary__item">
          <Icon name="warning" size="md" fallback="placeholder" />
          <span>待处置（需跟进/高风险）</span>
          <strong>{pendingCount}</strong>
        </div>
        <div className="vx-models-summary__item">
          <Icon name="check" size="md" fallback="placeholder" />
          <span>已审阅</span>
          <strong>{items.filter((i) => i.reviewerId !== null).length}</strong>
        </div>
        <div className="vx-models-summary__item">
          <Icon name="table" size="md" fallback="placeholder" />
          <span>记录总数</span>
          <strong>{items.length}</strong>
        </div>
      </div>
      <div className="vx-models-toolbar">
        <Input
          className="vx-models-toolbar__search"
          type="search"
          placeholder="搜索租户、范围、原因、标签…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="vx-models-toolbar__filters">
          <NativeSelect
            className="vx-admin-filter-select"
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value as LevelFilter);
              setPage(1);
            }}
          >
            <option value="all">全部等级</option>
            <option value="normal">常规</option>
            <option value="follow_up">需跟进</option>
            <option value="high">高风险</option>
          </NativeSelect>
          <NativeSelect
            className="vx-admin-filter-select"
            value={reviewFilter}
            onChange={(e) => {
              setReviewFilter(e.target.value as ReviewFilter);
              setPage(1);
            }}
          >
            <option value="all">全部状态</option>
            <option value="pending">待审阅</option>
            <option value="reviewed">已审阅</option>
          </NativeSelect>
        </div>
        <div className="vx-models-toolbar__spacer" />
        <span className="vx-models-toolbar__count">{filtered.length} 条</span>
        <Button
          variant="default"
          size="sm"
          className="vx-admin-action-btn"
          onClick={openCreate}
          title="新建风险记录"
        >
          <Icon name="plus" size="sm" fallback="placeholder" />
          新建记录
        </Button>
      </div>
      {loading ? (
        <EmptyState title="加载中…" />
      ) : loadError ? (
        <EmptyState title="风险记录读取失败" description={loadError} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="暂无风险记录"
          description={
            search || levelFilter !== "all" || reviewFilter !== "all"
              ? "尝试调整筛选条件"
              : "点击「新建记录」录入第一条租户风险评估"
          }
        />
      ) : (
        <>
          <div
            className="vx-tenant-directory-list vx-risk-directory-list"
            role="region"
            aria-label="风险记录列表"
          >
            <div className="vx-tenant-directory-list__header">
              <span>序号</span>
              <span>租户</span>
              <span>等级</span>
              <span>评分</span>
              <span>范围</span>
              <span>标签</span>
              <span>审阅人</span>
              <span>更新时间</span>
              <span>操作</span>
            </div>
            {pageItems.map((item, index) => (
              <div
                key={item.id}
                className="vx-tenant-directory-row vx-risk-row"
                title={item.reason}
              >
                <span className="vx-tenant-directory-row__index">
                  {(page - 1) * PAGE_SIZE + index + 1}
                </span>
                <span className="vx-risk-row__tenant">
                  {item.tenantName ?? item.tenantId}
                  {item.tenantNo ? <small>#{item.tenantNo}</small> : null}
                </span>
                <span>
                  <Badge className={levelBadgeClass(item.riskLevel)}>
                    {LEVEL_LABELS[item.riskLevel]}
                  </Badge>
                </span>
                <span>{item.riskScore ?? "-"}</span>
                <span className="vx-risk-row__scope">{item.scope ?? "-"}</span>
                <span className="vx-risk-row__tags">
                  {item.tags.length > 0 ? item.tags.join(", ") : "-"}
                </span>
                <span>{item.reviewerName ?? "待审阅"}</span>
                <span>{formatDate(item.updatedAt)}</span>
                <span className="vx-tenant-actions">
                  <ActionMenu
                    label={`风险记录操作`}
                    triggerClassName="vx-tenant-actions__trigger"
                    triggerProps={{ title: "操作", disabled: submitting }}
                    items={[
                      {
                        id: "review",
                        label: item.reviewerId ? "重新审阅" : "标记已审阅",
                        icon: (
                          <Icon name="check" size="xs" fallback="placeholder" />
                        ),
                        disabled: submitting,
                        onSelect: () =>
                          void runAction("已标记审阅", () =>
                            reviewRiskRecord(item.id),
                          ),
                      },
                      {
                        id: "edit",
                        label: "编辑",
                        icon: (
                          <Icon name="edit" size="xs" fallback="placeholder" />
                        ),
                        disabled: submitting,
                        onSelect: () => openEdit(item),
                      },
                      {
                        id: "delete",
                        label: "删除",
                        icon: (
                          <Icon name="trash" size="xs" fallback="placeholder" />
                        ),
                        danger: true,
                        disabled: submitting,
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
          title={dialogMode === "create" ? "新建风险记录" : "编辑风险记录"}
          description={
            dialogMode === "create"
              ? "录入租户风险评估。创建后可在列表中审阅处置。"
              : "调整风险等级会自动清除审阅标记（记录重新进入待处置）。"
          }
          submitLabel={dialogMode === "create" ? "创建" : "保存修改"}
          submitting={submitting}
          submitDisabled={!formIsValid(form, dialogMode)}
          contentClassName="max-w-3xl"
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
          onSubmit={(event) => void submitForm(event)}
        >
          {dialogMode === "create" ? (
            <Label>
              租户 ID
              <Input
                value={form.tenantId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tenantId: e.target.value }))
                }
                placeholder="tenancy.tenants 的 uuid"
                required
              />
            </Label>
          ) : null}
          <div className="vx-model-dialog__grid">
            <Label>
              风险等级
              <NativeSelect
                value={form.riskLevel}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    riskLevel: e.target.value as RiskRecordItem["riskLevel"],
                  }))
                }
              >
                <option value="normal">常规</option>
                <option value="follow_up">需跟进</option>
                <option value="high">高风险</option>
              </NativeSelect>
            </Label>
            <Label>
              风险评分（0–100，可选）
              <Input
                type="number"
                min={0}
                max={100}
                value={form.riskScore}
                onChange={(e) =>
                  setForm((f) => ({ ...f, riskScore: e.target.value }))
                }
              />
            </Label>
          </div>
          <Label>
            风险范围（可选）
            <Input
              value={form.scope}
              maxLength={160}
              onChange={(e) =>
                setForm((f) => ({ ...f, scope: e.target.value }))
              }
              placeholder="如 billing / 内容安全 / API 滥用"
            />
          </Label>
          <Label>
            原因说明
            <Textarea
              value={form.reason}
              onChange={(e) =>
                setForm((f) => ({ ...f, reason: e.target.value }))
              }
              placeholder="风险判定的依据与说明"
              rows={4}
              required
            />
          </Label>
          <Label>
            标签（逗号分隔，可选）
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="如 usage, kyc"
            />
          </Label>
        </DialogForm>
      ) : null}

      {pendingDelete ? (
        <DialogForm
          open
          title="删除风险记录"
          description={`确认删除「${pendingDelete.tenantName ?? pendingDelete.tenantId}」的风险记录？记录将被软删并从列表隐藏。`}
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
