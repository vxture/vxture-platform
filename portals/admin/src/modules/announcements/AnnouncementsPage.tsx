"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ActionMenu,
  Badge,
  Button,
  DialogForm,
  Icon,
  Input,
  Label,
  NativeSelect,
  Pagination,
  Textarea,
  EmptyState,
  useToast,
} from "@vxture/design-system";
import {
  archiveAnnouncement,
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  publishAnnouncement,
  updateAnnouncement,
  type AnnouncementWriteInput,
} from "@/api/admin-bff";
import type { AnnouncementRecord } from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { formatDate, joinClasses } from "@/modules/tenants/tenant-utils";

// ─── 类型 ─────────────────────────────────────────────────────────────────────

type AnnouncementTypeFilter = AnnouncementRecord["type"] | "all";
type AnnouncementStatusFilter = AnnouncementRecord["status"] | "all";
type ViewMode = "list" | "cards";
type Severity = "info" | "warning" | "critical";
type Targeting = "all" | "personal" | "organization";
type DialogMode = "create" | "edit" | null;

interface AnnouncementForm {
  announcementType: AnnouncementRecord["type"];
  severity: Severity;
  title: string;
  content: string;
  targeting: Targeting;
  // Plan-code targeting is not editable in this form; carried verbatim so an
  // edit does not silently drop a plan-scoped audience set by other means.
  targetPlans: string[];
  publishAt: string;
  expiresAt: string;
}

const PAGE_SIZE = 20;

// ─── 辅助函数 ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<AnnouncementRecord["type"], string> = {
  system: "系统",
  maintenance: "维护",
  marketing: "营销",
  security: "安全",
};

const STATUS_LABELS: Record<AnnouncementRecord["status"], string> = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
};

const SCOPE_LABELS: Record<AnnouncementRecord["targetScope"], string> = {
  all: "全部用户",
  trial: "试用用户",
  active: "付费用户",
  custom: "自定义",
};

function statusBadgeClass(status: AnnouncementRecord["status"]) {
  if (status === "published") return "vx-admin-role-status-pill--enabled";
  if (status === "draft") return "vx-platform-user-status-pill--pending";
  return "vx-admin-role-status-pill--disabled";
}

function typeBadgeClass(type: AnnouncementRecord["type"]) {
  if (type === "security") return "vx-platform-user-status-pill--attention";
  if (type === "maintenance") return "vx-platform-user-status-pill--pending";
  if (type === "system") return "vx-admin-role-status-pill--enabled";
  return "vx-admin-role-status-pill--disabled";
}

function announcementSearchText(item: AnnouncementRecord) {
  return [
    item.title,
    item.content,
    TYPE_LABELS[item.type],
    STATUS_LABELS[item.status],
  ]
    .join(" ")
    .toLowerCase();
}

// datetime-local input value（本地时区）。
function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isoToLocalInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : toLocalInputValue(d);
}

function createDefaultForm(): AnnouncementForm {
  return {
    announcementType: "system",
    severity: "info",
    title: "",
    content: "",
    targeting: "all",
    targetPlans: [],
    publishAt: toLocalInputValue(new Date()),
    expiresAt: "",
  };
}

// 单选 targeting 无法表达多个租户类型；两者皆命中时按"全部类型"回退。
function targetingFromTenantTypes(types: string[]): Targeting {
  if (
    types.length === 1 &&
    (types[0] === "personal" || types[0] === "organization")
  ) {
    return types[0];
  }
  return "all";
}

// 编辑预填：从读模型精确还原 severity / targeting / 计划投放 / 排期时间。
function formFromRecord(item: AnnouncementRecord): AnnouncementForm {
  return {
    announcementType: item.type,
    severity: item.severity,
    title: item.title,
    content: item.content,
    targeting: targetingFromTenantTypes(item.targetTenantTypes),
    targetPlans: item.targetPlans,
    publishAt: isoToLocalInput(item.publishAt) || toLocalInputValue(new Date()),
    expiresAt: isoToLocalInput(item.expiresAt),
  };
}

function buildPayload(form: AnnouncementForm): AnnouncementWriteInput {
  return {
    announcementType: form.announcementType,
    severity: form.severity,
    title: form.title.trim(),
    content: form.content.trim(),
    targetPlans: form.targetPlans,
    targetTenantTypes: form.targeting === "all" ? [] : [form.targeting],
    publishAt: new Date(form.publishAt).toISOString(),
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
  };
}

function describeError(error: unknown): { description?: string } {
  return error instanceof Error && error.message
    ? { description: error.message }
    : {};
}

function formIsValid(form: AnnouncementForm) {
  return (
    form.title.trim().length > 0 &&
    form.content.trim().length > 0 &&
    form.publishAt.trim().length > 0
  );
}

// ─── 子组件：汇总卡片 ──────────────────────────────────────────────────────────

function AnnouncementSummary({ items }: { items: AnnouncementRecord[] }) {
  const published = items.filter((i) => i.status === "published").length;
  const drafts = items.filter((i) => i.status === "draft").length;
  const now = new Date();
  const thisMonth = items.filter((i) => {
    if (!i.publishedAt) return false;
    const d = new Date(i.publishedAt);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  }).length;

  return (
    <div className="vx-models-summary">
      <div className="vx-models-summary__item">
        <Icon name="bell" size="md" fallback="placeholder" />
        <span>已发布公告</span>
        <strong>{published}</strong>
      </div>
      <div className="vx-models-summary__item">
        <Icon name="edit" size="md" fallback="placeholder" />
        <span>草稿中</span>
        <strong>{drafts}</strong>
      </div>
      <div className="vx-models-summary__item">
        <Icon name="calendar" size="md" fallback="placeholder" />
        <span>本月已发送</span>
        <strong>{thisMonth}</strong>
      </div>
    </div>
  );
}

// ─── 子组件：工具栏 ────────────────────────────────────────────────────────────

function AnnouncementToolbar({
  search,
  typeFilter,
  statusFilter,
  viewMode,
  total,
  onSearchChange,
  onTypeFilterChange,
  onStatusFilterChange,
  onViewModeChange,
  onCreate,
}: {
  search: string;
  typeFilter: AnnouncementTypeFilter;
  statusFilter: AnnouncementStatusFilter;
  viewMode: ViewMode;
  total: number;
  onSearchChange: (v: string) => void;
  onTypeFilterChange: (v: AnnouncementTypeFilter) => void;
  onStatusFilterChange: (v: AnnouncementStatusFilter) => void;
  onViewModeChange: (v: ViewMode) => void;
  onCreate: () => void;
}) {
  return (
    <div className="vx-models-toolbar">
      <Input
        className="vx-models-toolbar__search"
        type="search"
        placeholder="搜索标题、内容…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="vx-models-toolbar__filters">
        <NativeSelect
          className="vx-admin-filter-select"
          value={typeFilter}
          onChange={(e) =>
            onTypeFilterChange(e.target.value as AnnouncementTypeFilter)
          }
        >
          <option value="all">全部类型</option>
          <option value="system">系统</option>
          <option value="maintenance">维护</option>
          <option value="marketing">营销</option>
          <option value="security">安全</option>
        </NativeSelect>
        <NativeSelect
          className="vx-admin-filter-select"
          value={statusFilter}
          onChange={(e) =>
            onStatusFilterChange(e.target.value as AnnouncementStatusFilter)
          }
        >
          <option value="all">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="archived">已归档</option>
        </NativeSelect>
        <div className="vx-admin-view-toggle">
          <Button
            variant="ghost"
            size="icon"
            className={joinClasses(
              "vx-admin-view-toggle__btn",
              viewMode === "list" ? "vx-admin-view-toggle__btn--active" : "",
            )}
            onClick={() => onViewModeChange("list")}
            title="列表视图"
          >
            <Icon name="rows" size="sm" fallback="placeholder" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={joinClasses(
              "vx-admin-view-toggle__btn",
              viewMode === "cards" ? "vx-admin-view-toggle__btn--active" : "",
            )}
            onClick={() => onViewModeChange("cards")}
            title="卡片视图"
          >
            <Icon name="squares-four" size="sm" fallback="placeholder" />
          </Button>
        </div>
      </div>
      <div className="vx-models-toolbar__spacer" />
      <span className="vx-models-toolbar__count">{total} 条</span>
      <Button
        variant="default"
        size="sm"
        className="vx-admin-action-btn"
        onClick={onCreate}
        title="新建公告"
      >
        <Icon name="plus" size="sm" fallback="placeholder" />
        新建公告
      </Button>
    </div>
  );
}

// ─── 子组件：列表视图 ──────────────────────────────────────────────────────────

function AnnouncementList({
  items,
  startIndex,
  busy,
  onEdit,
  onPublish,
  onArchive,
  onDelete,
}: {
  items: AnnouncementRecord[];
  startIndex: number;
  busy: boolean;
  onEdit: (item: AnnouncementRecord) => void;
  onPublish: (item: AnnouncementRecord) => void;
  onArchive: (item: AnnouncementRecord) => void;
  onDelete: (item: AnnouncementRecord) => void;
}) {
  return (
    <div
      className="vx-tenant-directory-list vx-announcement-directory-list"
      role="region"
      aria-label="公告列表"
    >
      <div className="vx-tenant-directory-list__header">
        <span>序号</span>
        <span>标题</span>
        <span>类型</span>
        <span>对象范围</span>
        <span>状态</span>
        <span>发布时间</span>
        <span>到期时间</span>
        <span>操作</span>
      </div>
      {items.map((item, index) => (
        <div
          key={item.id}
          className="vx-tenant-directory-row vx-announcement-row"
        >
          <span className="vx-announcement-row__index">
            {startIndex + index + 1}
          </span>
          <span className="vx-announcement-row__title">{item.title}</span>
          <span className="vx-announcement-row__type">
            <Badge className={typeBadgeClass(item.type)}>
              {TYPE_LABELS[item.type]}
            </Badge>
          </span>
          <span className="vx-announcement-row__scope">
            {SCOPE_LABELS[item.targetScope]}
          </span>
          <span className="vx-announcement-row__status">
            <Badge className={statusBadgeClass(item.status)}>
              {STATUS_LABELS[item.status]}
            </Badge>
          </span>
          <span className="vx-announcement-row__published">
            {item.publishedAt ? formatDate(item.publishedAt) : "-"}
          </span>
          <span className="vx-announcement-row__expires">
            {item.expiresAt ? formatDate(item.expiresAt) : "-"}
          </span>
          <span className="vx-tenant-actions">
            <ActionMenu
              label={`${item.title} 操作`}
              triggerClassName="vx-tenant-actions__trigger"
              triggerProps={{ title: "操作", disabled: busy }}
              items={[
                {
                  id: "edit",
                  label: "编辑",
                  icon: <Icon name="edit" size="xs" fallback="placeholder" />,
                  disabled: busy,
                  onSelect: () => onEdit(item),
                },
                {
                  id: "publish",
                  label: "发布",
                  icon: <Icon name="check" size="xs" fallback="placeholder" />,
                  disabled: busy || item.status !== "draft",
                  onSelect: () => onPublish(item),
                },
                {
                  id: "archive",
                  label: "归档",
                  icon: <Icon name="stop" size="xs" fallback="placeholder" />,
                  disabled: busy || item.status !== "published",
                  onSelect: () => onArchive(item),
                },
                {
                  id: "delete",
                  label: "删除",
                  icon: <Icon name="trash" size="xs" fallback="placeholder" />,
                  danger: true,
                  disabled: busy,
                  separatorBefore: true,
                  onSelect: () => onDelete(item),
                },
              ]}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── 子组件：卡片视图 ──────────────────────────────────────────────────────────

function AnnouncementCards({ items }: { items: AnnouncementRecord[] }) {
  return (
    <div className="vx-announcement-cards">
      {items.map((item) => (
        <div key={item.id} className="vx-announcement-card">
          <div className="vx-announcement-card__header">
            <Badge className={typeBadgeClass(item.type)}>
              {TYPE_LABELS[item.type]}
            </Badge>
            <Badge className={statusBadgeClass(item.status)}>
              {STATUS_LABELS[item.status]}
            </Badge>
          </div>
          <h3 className="vx-announcement-card__title">{item.title}</h3>
          <p className="vx-announcement-card__content">{item.content}</p>
          <div className="vx-announcement-card__meta">
            <span>{SCOPE_LABELS[item.targetScope]}</span>
            {item.publishedAt && <span>{formatDate(item.publishedAt)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 子组件：新建/编辑对话框 ───────────────────────────────────────────────────

function AnnouncementFormDialog({
  mode,
  form,
  submitting,
  onChange,
  onClose,
  onSubmit,
}: {
  mode: Exclude<DialogMode, null>;
  form: AnnouncementForm;
  submitting: boolean;
  onChange: (patch: Partial<AnnouncementForm>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <DialogForm
      open
      title={mode === "create" ? "新建公告" : "编辑公告"}
      description="草稿保存后可在列表中发布或归档。"
      submitLabel={mode === "create" ? "创建草稿" : "保存修改"}
      submitting={submitting}
      submitDisabled={!formIsValid(form)}
      contentClassName="max-w-3xl"
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onSubmit={onSubmit}
    >
      <div className="vx-model-dialog__grid">
        <Label>
          类型
          <NativeSelect
            value={form.announcementType}
            onChange={(e) =>
              onChange({
                announcementType: e.target.value as AnnouncementRecord["type"],
              })
            }
          >
            <option value="system">系统</option>
            <option value="maintenance">维护</option>
            <option value="marketing">营销</option>
            <option value="security">安全</option>
          </NativeSelect>
        </Label>
        <Label>
          严重度
          <NativeSelect
            value={form.severity}
            onChange={(e) => onChange({ severity: e.target.value as Severity })}
          >
            <option value="info">一般</option>
            <option value="warning">警告</option>
            <option value="critical">严重</option>
          </NativeSelect>
        </Label>
      </div>
      <Label>
        标题
        <Input
          value={form.title}
          maxLength={256}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="公告标题"
          required
        />
      </Label>
      <Label>
        正文
        <Textarea
          value={form.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="公告正文内容"
          rows={5}
          required
        />
      </Label>
      <div className="vx-model-dialog__grid">
        <Label>
          投放对象
          <NativeSelect
            value={form.targeting}
            onChange={(e) =>
              onChange({ targeting: e.target.value as Targeting })
            }
          >
            <option value="all">全部用户</option>
            <option value="personal">仅个人用户</option>
            <option value="organization">仅组织用户</option>
          </NativeSelect>
        </Label>
        <Label>
          发布时间
          <Input
            type="datetime-local"
            value={form.publishAt}
            onChange={(e) => onChange({ publishAt: e.target.value })}
            required
          />
        </Label>
      </div>
      <Label>
        到期时间（可选）
        <Input
          type="datetime-local"
          value={form.expiresAt}
          onChange={(e) => onChange({ expiresAt: e.target.value })}
        />
      </Label>
    </DialogForm>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export function AnnouncementsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AnnouncementTypeFilter>("all");
  const [statusFilter, setStatusFilter] =
    useState<AnnouncementStatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [page, setPage] = useState(1);

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(createDefaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AnnouncementRecord | null>(
    null,
  );

  useEffect(() => {
    fetchAnnouncements()
      .then(setItems)
      .catch((error) => {
        setItems([]);
        setLoadError(error instanceof Error ? error.message : "公告读取失败");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = items;
    if (typeFilter !== "all")
      result = result.filter((i) => i.type === typeFilter);
    if (statusFilter !== "all")
      result = result.filter((i) => i.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((i) => announcementSearchText(i).includes(q));
    }
    return result;
  }, [items, search, typeFilter, statusFilter]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const handleTypeFilter = (v: AnnouncementTypeFilter) => {
    setTypeFilter(v);
    setPage(1);
  };
  const handleStatusFilter = (v: AnnouncementStatusFilter) => {
    setStatusFilter(v);
    setPage(1);
  };

  async function reload() {
    const records = await fetchAnnouncements();
    setItems(records);
  }

  function openCreate() {
    setEditingId(null);
    setForm(createDefaultForm());
    setDialogMode("create");
  }

  function openEdit(item: AnnouncementRecord) {
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
    if (!formIsValid(form)) return;
    setSubmitting(true);
    try {
      const payload = buildPayload(form);
      if (dialogMode === "edit" && editingId) {
        await updateAnnouncement(editingId, payload);
        toast({ tone: "success", title: "公告已更新" });
      } else {
        await createAnnouncement(payload);
        toast({ tone: "success", title: "草稿已创建" });
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

  function handlePublish(item: AnnouncementRecord) {
    void runAction("公告已发布", () => publishAnnouncement(item.id));
  }

  function handleArchive(item: AnnouncementRecord) {
    void runAction("公告已归档", () => archiveAnnouncement(item.id));
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    await runAction("公告已删除", () => deleteAnnouncement(target.id));
  }

  return (
    <div className={joinClasses("vx-page-stack", "vx-announcement-page")}>
      <PageHeader
        icon="bell"
        title="消息公告"
        description="发布平台公告和定向通知，查询通知触达与历史记录。"
      />
      <AnnouncementSummary items={items} />
      <AnnouncementToolbar
        search={search}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        viewMode={viewMode}
        total={filtered.length}
        onSearchChange={handleSearch}
        onTypeFilterChange={handleTypeFilter}
        onStatusFilterChange={handleStatusFilter}
        onViewModeChange={setViewMode}
        onCreate={openCreate}
      />
      {loading ? (
        <EmptyState title="加载中…" />
      ) : loadError ? (
        <EmptyState title="公告读取失败" description={loadError} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="暂无公告"
          description={
            search || typeFilter !== "all" || statusFilter !== "all"
              ? "尝试调整筛选条件"
              : "点击「新建公告」发布第一条平台通知"
          }
        />
      ) : (
        <>
          {viewMode === "list" ? (
            <AnnouncementList
              items={pageItems}
              startIndex={(page - 1) * PAGE_SIZE}
              busy={submitting}
              onEdit={openEdit}
              onPublish={handlePublish}
              onArchive={handleArchive}
              onDelete={setPendingDelete}
            />
          ) : (
            <AnnouncementCards items={pageItems} />
          )}
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
        <AnnouncementFormDialog
          mode={dialogMode}
          form={form}
          submitting={submitting}
          onChange={(patch) => setForm((old) => ({ ...old, ...patch }))}
          onClose={closeDialog}
          onSubmit={(event) => void submitForm(event)}
        />
      ) : null}

      {pendingDelete ? (
        <DialogForm
          open
          title="删除公告"
          description={`确认删除「${pendingDelete.title}」？此操作不可撤销。`}
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
