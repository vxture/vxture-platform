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
  cancelMaintenanceWindow,
  completeMaintenanceWindow,
  createMaintenanceWindow,
  fetchMaintenanceWindows,
  startMaintenanceWindow,
  updateMaintenanceWindow,
  type MaintenanceWindowWriteInput,
} from "@/api/admin-bff";
import type { MaintenanceWindowItem } from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { formatDate, joinClasses } from "@/modules/tenants/tenant-utils";

// TD-021 维护窗口页。设计权威 = governance-write-paths.md §3.3/§5。
// scheduled→start→in_progress→complete→completed；scheduled|in_progress→cancel；
// 无删除（终态即归档留存对账）。通知策略：不自动发公告，需要时经消息公告手工发布（GQ5）。

type StatusFilter = MaintenanceWindowItem["status"] | "all";
type DialogMode = "create" | "edit" | null;

interface WindowForm {
  severity: MaintenanceWindowItem["severity"];
  title: string;
  description: string;
  impactDescription: string;
  affectedServices: string;
  startAt: string;
  endAt: string;
}

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<MaintenanceWindowItem["status"], string> = {
  scheduled: "已计划",
  in_progress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};

const SEVERITY_LABELS: Record<MaintenanceWindowItem["severity"], string> = {
  minor: "一般",
  major: "重要",
  critical: "严重",
};

function statusBadgeClass(status: MaintenanceWindowItem["status"]) {
  if (status === "in_progress")
    return "vx-platform-user-status-pill--attention";
  if (status === "scheduled") return "vx-platform-user-status-pill--pending";
  if (status === "completed") return "vx-admin-role-status-pill--enabled";
  return "vx-admin-role-status-pill--disabled";
}

function severityBadgeClass(severity: MaintenanceWindowItem["severity"]) {
  if (severity === "critical") return "vx-platform-user-status-pill--attention";
  if (severity === "major") return "vx-platform-user-status-pill--pending";
  return "vx-admin-role-status-pill--enabled";
}

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isoToLocalInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : toLocalInputValue(d);
}

function createDefaultForm(): WindowForm {
  const start = new Date(Date.now() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    severity: "minor",
    title: "",
    description: "",
    impactDescription: "",
    affectedServices: "",
    startAt: toLocalInputValue(start),
    endAt: toLocalInputValue(end),
  };
}

function formFromRecord(item: MaintenanceWindowItem): WindowForm {
  return {
    severity: item.severity,
    title: item.title,
    description: item.description ?? "",
    impactDescription: item.impactDescription ?? "",
    affectedServices: item.affectedServices.join(", "),
    startAt: isoToLocalInput(item.startAt),
    endAt: isoToLocalInput(item.endAt),
  };
}

function buildPayload(form: WindowForm): MaintenanceWindowWriteInput {
  return {
    severity: form.severity,
    title: form.title.trim(),
    description: form.description.trim() || null,
    impactDescription: form.impactDescription.trim() || null,
    affectedServices: form.affectedServices
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    startAt: new Date(form.startAt).toISOString(),
    endAt: new Date(form.endAt).toISOString(),
  };
}

function describeError(error: unknown): { description?: string } {
  return error instanceof Error && error.message
    ? { description: error.message }
    : {};
}

function formIsValid(form: WindowForm) {
  return (
    form.title.trim().length > 0 &&
    form.startAt.trim().length > 0 &&
    form.endAt.trim().length > 0 &&
    new Date(form.endAt) > new Date(form.startAt)
  );
}

export function MaintenanceWindowsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<MaintenanceWindowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] =
    useState<MaintenanceWindowItem["status"]>("scheduled");
  const [form, setForm] = useState<WindowForm>(createDefaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [pendingCancel, setPendingCancel] =
    useState<MaintenanceWindowItem | null>(null);

  useEffect(() => {
    fetchMaintenanceWindows()
      .then(setItems)
      .catch((error) => {
        setItems([]);
        setLoadError(
          error instanceof Error ? error.message : "维护窗口读取失败",
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
        [i.title, i.description ?? "", ...i.affectedServices]
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
    setItems(await fetchMaintenanceWindows());
  }

  function openCreate() {
    setEditingId(null);
    setForm(createDefaultForm());
    setDialogMode("create");
  }

  function openEdit(item: MaintenanceWindowItem) {
    setEditingId(item.id);
    setEditingStatus(item.status);
    setForm(formFromRecord(item));
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingId(null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formIsValid(form)) return;
    setSubmitting(true);
    try {
      if (dialogMode === "edit" && editingId) {
        // in_progress 仅提交现场可改字段（endAt 顺延 + 描述），后端强制。
        const payload =
          editingStatus === "in_progress"
            ? {
                endAt: new Date(form.endAt).toISOString(),
                description: form.description.trim() || null,
                impactDescription: form.impactDescription.trim() || null,
              }
            : buildPayload(form);
        await updateMaintenanceWindow(editingId, payload);
        toast({ tone: "success", title: "维护窗口已更新" });
      } else {
        await createMaintenanceWindow(buildPayload(form));
        toast({ tone: "success", title: "维护窗口已创建" });
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

  async function confirmCancel() {
    if (!pendingCancel) return;
    const target = pendingCancel;
    setPendingCancel(null);
    await runAction("维护窗口已取消", () => cancelMaintenanceWindow(target.id));
  }

  return (
    <div className={joinClasses("vx-page-stack", "vx-maintenance-page")}>
      <PageHeader
        icon="clock"
        title="维护窗口"
        description="声明与管理平台维护窗口：计划、执行、完成与取消，实际结束时间对账。需要对外通知时经「消息公告」手工发布。"
      />
      <div className="vx-models-summary">
        <div className="vx-models-summary__item">
          <Icon name="calendar" size="md" fallback="placeholder" />
          <span>已计划</span>
          <strong>
            {items.filter((i) => i.status === "scheduled").length}
          </strong>
        </div>
        <div className="vx-models-summary__item">
          <Icon name="clock" size="md" fallback="placeholder" />
          <span>进行中</span>
          <strong>
            {items.filter((i) => i.status === "in_progress").length}
          </strong>
        </div>
        <div className="vx-models-summary__item">
          <Icon name="check" size="md" fallback="placeholder" />
          <span>已完成</span>
          <strong>
            {items.filter((i) => i.status === "completed").length}
          </strong>
        </div>
      </div>
      <div className="vx-models-toolbar">
        <Input
          className="vx-models-toolbar__search"
          type="search"
          placeholder="搜索标题、描述、受影响服务…"
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
            <option value="scheduled">已计划</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </NativeSelect>
        </div>
        <div className="vx-models-toolbar__spacer" />
        <span className="vx-models-toolbar__count">{filtered.length} 条</span>
        <Button
          variant="default"
          size="sm"
          className="vx-admin-action-btn"
          onClick={openCreate}
          title="新建维护窗口"
        >
          <Icon name="plus" size="sm" fallback="placeholder" />
          新建窗口
        </Button>
      </div>
      {loading ? (
        <EmptyState title="加载中…" />
      ) : loadError ? (
        <EmptyState title="维护窗口读取失败" description={loadError} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="暂无维护窗口"
          description={
            search || statusFilter !== "all"
              ? "尝试调整筛选条件"
              : "点击「新建窗口」声明第一个平台维护窗口"
          }
        />
      ) : (
        <>
          <div
            className="vx-tenant-directory-list vx-maintenance-directory-list"
            role="region"
            aria-label="维护窗口列表"
          >
            <div className="vx-tenant-directory-list__header">
              <span>序号</span>
              <span>标题</span>
              <span>严重度</span>
              <span>状态</span>
              <span>计划开始</span>
              <span>计划结束</span>
              <span>实际结束</span>
              <span>操作</span>
            </div>
            {pageItems.map((item, index) => (
              <div
                key={item.id}
                className="vx-tenant-directory-row vx-maintenance-row"
                title={
                  item.affectedServices.length > 0
                    ? `受影响服务：${item.affectedServices.join(", ")}`
                    : undefined
                }
              >
                <span className="vx-tenant-directory-row__index">
                  {(page - 1) * PAGE_SIZE + index + 1}
                </span>
                <span className="vx-maintenance-row__title">{item.title}</span>
                <span>
                  <Badge className={severityBadgeClass(item.severity)}>
                    {SEVERITY_LABELS[item.severity]}
                  </Badge>
                </span>
                <span>
                  <Badge className={statusBadgeClass(item.status)}>
                    {STATUS_LABELS[item.status]}
                  </Badge>
                </span>
                <span>{formatDate(item.startAt)}</span>
                <span>{formatDate(item.endAt)}</span>
                <span>
                  {item.actualEndAt ? formatDate(item.actualEndAt) : "-"}
                </span>
                <span className="vx-tenant-actions">
                  <ActionMenu
                    label="维护窗口操作"
                    triggerClassName="vx-tenant-actions__trigger"
                    triggerProps={{ title: "操作", disabled: submitting }}
                    items={[
                      {
                        id: "start",
                        label: "开始维护",
                        icon: (
                          <Icon name="play" size="xs" fallback="placeholder" />
                        ),
                        disabled: submitting || item.status !== "scheduled",
                        onSelect: () =>
                          void runAction("维护已开始", () =>
                            startMaintenanceWindow(item.id),
                          ),
                      },
                      {
                        id: "complete",
                        label: "完成维护",
                        icon: (
                          <Icon name="check" size="xs" fallback="placeholder" />
                        ),
                        disabled: submitting || item.status !== "in_progress",
                        onSelect: () =>
                          void runAction("维护已完成", () =>
                            completeMaintenanceWindow(item.id),
                          ),
                      },
                      {
                        id: "edit",
                        label: "编辑",
                        icon: (
                          <Icon name="edit" size="xs" fallback="placeholder" />
                        ),
                        disabled:
                          submitting ||
                          (item.status !== "scheduled" &&
                            item.status !== "in_progress"),
                        onSelect: () => openEdit(item),
                      },
                      {
                        id: "cancel",
                        label: "取消窗口",
                        icon: (
                          <Icon name="stop" size="xs" fallback="placeholder" />
                        ),
                        danger: true,
                        disabled:
                          submitting ||
                          (item.status !== "scheduled" &&
                            item.status !== "in_progress"),
                        separatorBefore: true,
                        onSelect: () => setPendingCancel(item),
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
          title={dialogMode === "create" ? "新建维护窗口" : "编辑维护窗口"}
          description={
            dialogMode === "edit" && editingStatus === "in_progress"
              ? "进行中的窗口仅允许顺延结束时间与更新描述。"
              : "声明计划维护窗口；到点后手动「开始维护」。"
          }
          submitLabel={dialogMode === "create" ? "创建" : "保存修改"}
          submitting={submitting}
          submitDisabled={!formIsValid(form)}
          contentClassName="max-w-3xl"
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
          onSubmit={(event) => void submitForm(event)}
        >
          <Label>
            标题
            <Input
              value={form.title}
              maxLength={256}
              disabled={
                dialogMode === "edit" && editingStatus === "in_progress"
              }
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="如 数据库版本升级"
              required
            />
          </Label>
          <div className="vx-model-dialog__grid">
            <Label>
              严重度
              <NativeSelect
                value={form.severity}
                disabled={
                  dialogMode === "edit" && editingStatus === "in_progress"
                }
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    severity: e.target
                      .value as MaintenanceWindowItem["severity"],
                  }))
                }
              >
                <option value="minor">一般</option>
                <option value="major">重要</option>
                <option value="critical">严重</option>
              </NativeSelect>
            </Label>
            <Label>
              受影响服务（逗号分隔，可选）
              <Input
                value={form.affectedServices}
                disabled={
                  dialogMode === "edit" && editingStatus === "in_progress"
                }
                onChange={(e) =>
                  setForm((f) => ({ ...f, affectedServices: e.target.value }))
                }
                placeholder="如 auth-bff, admin-bff"
              />
            </Label>
          </div>
          <div className="vx-model-dialog__grid">
            <Label>
              计划开始
              <Input
                type="datetime-local"
                value={form.startAt}
                disabled={
                  dialogMode === "edit" && editingStatus === "in_progress"
                }
                onChange={(e) =>
                  setForm((f) => ({ ...f, startAt: e.target.value }))
                }
                required
              />
            </Label>
            <Label>
              计划结束
              <Input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endAt: e.target.value }))
                }
                required
              />
            </Label>
          </div>
          <Label>
            描述（可选）
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
              placeholder="维护内容说明"
            />
          </Label>
          <Label>
            影响说明（可选）
            <Textarea
              value={form.impactDescription}
              onChange={(e) =>
                setForm((f) => ({ ...f, impactDescription: e.target.value }))
              }
              rows={3}
              placeholder="对用户/租户的影响范围与降级预期"
            />
          </Label>
        </DialogForm>
      ) : null}

      {pendingCancel ? (
        <DialogForm
          open
          title="取消维护窗口"
          description={`确认取消「${pendingCancel.title}」？取消后窗口进入终态，保留历史记录。`}
          submitLabel="取消窗口"
          submitVariant="destructive"
          submitting={submitting}
          onOpenChange={(open) => {
            if (!open) setPendingCancel(null);
          }}
          onSubmit={(event) => {
            event.preventDefault();
            void confirmCancel();
          }}
        />
      ) : null}
    </div>
  );
}
