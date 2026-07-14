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
  archiveFeatureFlag,
  createFeatureFlag,
  fetchFeatureFlags,
  toggleFeatureFlag,
  updateFeatureFlag,
  type FeatureFlagWriteInput,
} from "@/api/admin-bff";
import type { FeatureFlagRecord } from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { formatDate, joinClasses } from "@/modules/tenants/tenant-utils";

// P2 占位板块建设：功能开关（admin.feature_flags）。全局开关 + 灰度百分比 +
// 逐租户覆盖（tenant_overrides，本页只读携带、不在 UI 编辑）+ 归档。
// 能力守卫：读 release:feature_flag.read|.manage，写 .manage（seed §4.3）。

type ArchivedFilter = "active" | "archived" | "all";
type DialogMode = "create" | "edit" | null;

interface FlagForm {
  flagKey: string;
  category: string;
  environment: string;
  description: string;
  rolloutPercentage: string;
  expiresAt: string;
  // Carried verbatim so an edit does not wipe per-tenant overrides set elsewhere.
  tenantOverrides: Record<string, boolean>;
}

const PAGE_SIZE = 20;

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isoToLocalInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : toLocalInputValue(d);
}

function createDefaultForm(): FlagForm {
  return {
    flagKey: "",
    category: "release",
    environment: "all",
    description: "",
    rolloutPercentage: "0",
    expiresAt: "",
    tenantOverrides: {},
  };
}

function formFromRecord(item: FeatureFlagRecord): FlagForm {
  return {
    flagKey: item.flagKey,
    category: item.category,
    environment: item.environment,
    description: item.description ?? "",
    rolloutPercentage: String(item.rolloutPercentage),
    expiresAt: isoToLocalInput(item.expiresAt),
    tenantOverrides: item.tenantOverrides,
  };
}

function buildPayload(
  form: FlagForm,
  includeKey: boolean,
): FeatureFlagWriteInput {
  const rollout = Number(form.rolloutPercentage);
  return {
    ...(includeKey ? { flagKey: form.flagKey.trim() } : {}),
    category: form.category.trim() || "release",
    environment: form.environment.trim() || "all",
    description: form.description.trim() || null,
    rolloutPercentage: Number.isFinite(rollout) ? rollout : 0,
    tenantOverrides: form.tenantOverrides,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
  };
}

function describeError(error: unknown): { description?: string } {
  return error instanceof Error && error.message
    ? { description: error.message }
    : {};
}

function formIsValid(form: FlagForm, mode: DialogMode) {
  const rollout = Number(form.rolloutPercentage);
  const rolloutOk = Number.isInteger(rollout) && rollout >= 0 && rollout <= 100;
  const keyOk =
    mode !== "create" ||
    (/^[a-z0-9][a-z0-9._-]*$/i.test(form.flagKey.trim()) &&
      form.flagKey.trim().length > 0);
  return keyOk && rolloutOk;
}

function overrideSummary(overrides: Record<string, boolean>): string {
  const n = Object.keys(overrides).length;
  return n === 0 ? "无" : `${n} 个租户`;
}

export function FeatureTogglesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<FeatureFlagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("all");
  const [archivedFilter, setArchivedFilter] =
    useState<ArchivedFilter>("active");
  const [page, setPage] = useState(1);

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FlagForm>(createDefaultForm);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setItems(await fetchFeatureFlags({ archived: "all" }));
  }

  useEffect(() => {
    load()
      .catch((error) =>
        toast({ tone: "error", title: "加载失败", ...describeError(error) }),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))).sort(),
    [items],
  );
  const environments = useMemo(
    () => Array.from(new Set(items.map((i) => i.environment))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    let result = items;
    if (archivedFilter === "active")
      result = result.filter((i) => !i.isArchived);
    else if (archivedFilter === "archived")
      result = result.filter((i) => i.isArchived);
    if (categoryFilter !== "all")
      result = result.filter((i) => i.category === categoryFilter);
    if (environmentFilter !== "all")
      result = result.filter((i) => i.environment === environmentFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((i) =>
        [i.flagKey, i.description ?? "", i.category, i.environment]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return result;
  }, [items, search, categoryFilter, environmentFilter, archivedFilter]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  function openCreate() {
    setEditingId(null);
    setForm(createDefaultForm());
    setDialogMode("create");
  }

  function openEdit(item: FeatureFlagRecord) {
    setEditingId(item.id);
    setForm(formFromRecord(item));
    setDialogMode("edit");
  }

  function closeDialog() {
    if (submitting) return;
    setDialogMode(null);
    setEditingId(null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formIsValid(form, dialogMode)) return;
    setSubmitting(true);
    try {
      if (dialogMode === "edit" && editingId) {
        await updateFeatureFlag(editingId, buildPayload(form, false));
        toast({ tone: "success", title: "功能开关已更新" });
      } else {
        await createFeatureFlag(buildPayload(form, true));
        toast({ tone: "success", title: "功能开关已创建" });
      }
      await load();
      setDialogMode(null);
      setEditingId(null);
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
      await load();
      toast({ tone: "success", title: label });
    } catch (error) {
      toast({ tone: "error", title: `${label}失败`, ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={joinClasses("vx-page-stack", "vx-feature-flag-page")}>
      <PageHeader
        icon="settings"
        title="功能开关"
        description="管理平台功能开关：全局启停、灰度百分比与逐租户覆盖。灰度按 flag_key 匹配，逐租户覆盖命中优先于灰度百分比。"
      />
      <div className="vx-models-summary">
        <div className="vx-models-summary__item">
          <Icon name="list" size="md" fallback="placeholder" />
          <span>开关总数</span>
          <strong>{items.filter((i) => !i.isArchived).length}</strong>
        </div>
        <div className="vx-models-summary__item">
          <Icon name="check" size="md" fallback="placeholder" />
          <span>已启用</span>
          <strong>
            {items.filter((i) => !i.isArchived && i.isGloballyEnabled).length}
          </strong>
        </div>
        <div className="vx-models-summary__item">
          <Icon
            name="clock-counter-clockwise"
            size="md"
            fallback="placeholder"
          />
          <span>已归档</span>
          <strong>{items.filter((i) => i.isArchived).length}</strong>
        </div>
      </div>
      <div className="vx-models-toolbar">
        <Input
          className="vx-models-toolbar__search"
          type="search"
          placeholder="搜索开关键、描述、分类…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="vx-models-toolbar__filters">
          <NativeSelect
            className="vx-admin-filter-select"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">全部分类</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            className="vx-admin-filter-select"
            value={environmentFilter}
            onChange={(e) => {
              setEnvironmentFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">全部环境</option>
            {environments.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            className="vx-admin-filter-select"
            value={archivedFilter}
            onChange={(e) => {
              setArchivedFilter(e.target.value as ArchivedFilter);
              setPage(1);
            }}
          >
            <option value="active">未归档</option>
            <option value="archived">已归档</option>
            <option value="all">全部</option>
          </NativeSelect>
        </div>
        <div className="vx-models-toolbar__spacer" />
        <span className="vx-models-toolbar__count">{filtered.length} 条</span>
        <Button
          variant="default"
          size="sm"
          className="vx-admin-action-btn"
          onClick={openCreate}
          title="新建功能开关"
        >
          <Icon name="plus" size="sm" fallback="placeholder" />
          新建开关
        </Button>
      </div>
      {loading ? (
        <EmptyState title="加载中…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="暂无功能开关"
          description={
            search ||
            categoryFilter !== "all" ||
            environmentFilter !== "all" ||
            archivedFilter !== "active"
              ? "尝试调整筛选条件"
              : "点击「新建开关」创建第一个功能开关"
          }
        />
      ) : (
        <>
          <div
            className="vx-tenant-directory-list vx-feature-flag-directory-list"
            role="region"
            aria-label="功能开关列表"
          >
            <div className="vx-tenant-directory-list__header">
              <span>序号</span>
              <span>开关键 / 分类</span>
              <span>环境</span>
              <span>状态</span>
              <span>灰度</span>
              <span>更新时间</span>
              <span>操作</span>
            </div>
            {pageItems.map((item, index) => (
              <div
                key={item.id}
                className="vx-tenant-directory-row vx-feature-flag-row"
                title={
                  item.description
                    ? item.description
                    : `逐租户覆盖：${overrideSummary(item.tenantOverrides)}`
                }
              >
                <span className="vx-tenant-directory-row__index">
                  {(page - 1) * PAGE_SIZE + index + 1}
                </span>
                <span className="vx-feature-flag-row__key">
                  {item.flagKey}
                  <small>
                    {item.category}
                    {item.isArchived ? " · 已归档" : ""}
                  </small>
                </span>
                <span>{item.environment}</span>
                <span>
                  <Badge
                    className={
                      item.isGloballyEnabled
                        ? "vx-admin-role-status-pill--enabled"
                        : "vx-admin-role-status-pill--disabled"
                    }
                  >
                    {item.isGloballyEnabled ? "已启用" : "已停用"}
                  </Badge>
                </span>
                <span>{item.rolloutPercentage}%</span>
                <span>{formatDate(item.updatedAt)}</span>
                <span className="vx-tenant-actions">
                  <ActionMenu
                    label="功能开关操作"
                    triggerClassName="vx-tenant-actions__trigger"
                    triggerProps={{ title: "操作", disabled: submitting }}
                    items={[
                      {
                        id: "toggle",
                        label: item.isGloballyEnabled ? "停用" : "启用",
                        icon: (
                          <Icon
                            name={item.isGloballyEnabled ? "x" : "check"}
                            size="xs"
                            fallback="placeholder"
                          />
                        ),
                        disabled: submitting || item.isArchived,
                        onSelect: () =>
                          void runAction(
                            item.isGloballyEnabled ? "已停用" : "已启用",
                            () => toggleFeatureFlag(item.id),
                          ),
                      },
                      {
                        id: "edit",
                        label: "编辑",
                        icon: (
                          <Icon name="edit" size="xs" fallback="placeholder" />
                        ),
                        disabled: submitting || item.isArchived,
                        onSelect: () => openEdit(item),
                      },
                      {
                        id: "archive",
                        label: item.isArchived ? "恢复" : "归档",
                        icon: (
                          <Icon
                            name={
                              item.isArchived
                                ? "clock-counter-clockwise"
                                : "stop"
                            }
                            size="xs"
                            fallback="placeholder"
                          />
                        ),
                        disabled: submitting,
                        onSelect: () =>
                          void runAction(
                            item.isArchived ? "已恢复" : "已归档",
                            () => archiveFeatureFlag(item.id, !item.isArchived),
                          ),
                      },
                    ]}
                  />
                </span>
              </div>
            ))}
          </div>
          {pageCount > 1 ? (
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
      {dialogMode ? (
        <DialogForm
          open
          title={dialogMode === "create" ? "新建功能开关" : "编辑功能开关"}
          description="灰度百分比 0-100；逐租户覆盖命中优先于灰度。开关键创建后不可更改。"
          submitLabel={dialogMode === "create" ? "创建" : "保存"}
          submitting={submitting}
          submitDisabled={!formIsValid(form, dialogMode)}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
          onSubmit={(event) => void submitForm(event)}
        >
          <div className="vx-model-dialog__grid">
            <Label>
              开关键
              <Input
                value={form.flagKey}
                onChange={(e) => setForm({ ...form, flagKey: e.target.value })}
                placeholder="如 billing.new_invoice_flow"
                disabled={dialogMode === "edit"}
                required
              />
            </Label>
            <Label>
              分类
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="release"
              />
            </Label>
          </div>
          <div className="vx-model-dialog__grid">
            <Label>
              环境
              <Input
                value={form.environment}
                onChange={(e) =>
                  setForm({ ...form, environment: e.target.value })
                }
                placeholder="all"
              />
            </Label>
            <Label>
              灰度百分比
              <Input
                type="number"
                min={0}
                max={100}
                value={form.rolloutPercentage}
                onChange={(e) =>
                  setForm({ ...form, rolloutPercentage: e.target.value })
                }
              />
            </Label>
          </div>
          <Label>
            过期时间（可选）
            <Input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          </Label>
          <Label>
            描述
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="说明该开关的用途与影响范围"
              rows={3}
              maxLength={512}
            />
          </Label>
          {Object.keys(form.tenantOverrides).length > 0 ? (
            <p className="vx-step-up-hint">
              逐租户覆盖：{overrideSummary(form.tenantOverrides)}
              （本页保留不变，逐租户配置在专用界面维护）
            </p>
          ) : null}
        </DialogForm>
      ) : null}
    </div>
  );
}
