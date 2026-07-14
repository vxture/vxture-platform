"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ActionMenu,
  Badge,
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
import { fetchPlatformSettings, updatePlatformSetting } from "@/api/admin-bff";
import type { PlatformSettingRecord } from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { joinClasses } from "@/modules/tenants/tenant-utils";

// P2 占位板块建设：平台配置（admin.settings）。读 is_sensitive/is_encrypted 脱敏；
// 编辑仅非敏感/非加密/非只读行（守卫 platform:setting.read|.manage，seed §4.3）。

const PAGE_SIZE = 20;

function describeError(error: unknown): { description?: string } {
  return error instanceof Error && error.message
    ? { description: error.message }
    : {};
}

function protectionLabel(item: PlatformSettingRecord): string | null {
  if (item.isReadonly) return "只读";
  if (item.isEncrypted) return "加密";
  if (item.isSensitive) return "敏感";
  return null;
}

export function SystemParametersPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<PlatformSettingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<PlatformSettingRecord | null>(null);
  const [editValue, setEditValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setItems(await fetchPlatformSettings());
  }

  useEffect(() => {
    load()
      .catch((error) =>
        toast({ tone: "error", title: "加载失败", ...describeError(error) }),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(
    () => Array.from(new Set(items.map((i) => i.configGroup))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    let result = items;
    if (groupFilter !== "all")
      result = result.filter((i) => i.configGroup === groupFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((i) =>
        [i.configKey, i.description ?? "", i.configGroup]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return result;
  }, [items, search, groupFilter]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  function openEdit(item: PlatformSettingRecord) {
    setEditing(item);
    setEditValue(item.configValue);
  }

  function closeEdit() {
    if (submitting) return;
    setEditing(null);
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      await updatePlatformSetting(editing.id, editValue);
      await load();
      toast({ tone: "success", title: "配置已更新" });
      setEditing(null);
    } catch (error) {
      toast({ tone: "error", title: "保存失败", ...describeError(error) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={joinClasses("vx-page-stack", "vx-setting-page")}>
      <PageHeader
        icon="settings"
        title="系统参数"
        description="查看与维护平台运行时配置。敏感/加密配置值脱敏显示；加密、只读、敏感配置不在本页编辑（分别经密钥管理器 / 业务锁 / 专用安全流程）。"
      />
      <div className="vx-models-toolbar">
        <Input
          className="vx-models-toolbar__search"
          type="search"
          placeholder="搜索配置键、说明…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="vx-models-toolbar__filters">
          <NativeSelect
            className="vx-admin-filter-select"
            value={groupFilter}
            onChange={(e) => {
              setGroupFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">全部分组</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="vx-models-toolbar__spacer" />
        <span className="vx-models-toolbar__count">{filtered.length} 条</span>
      </div>
      {loading ? (
        <EmptyState title="加载中…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="暂无配置"
          description={
            search || groupFilter !== "all"
              ? "尝试调整筛选条件"
              : "数据库中没有平台配置项"
          }
        />
      ) : (
        <>
          <div
            className="vx-tenant-directory-list vx-setting-directory-list"
            role="region"
            aria-label="平台配置列表"
          >
            <div className="vx-tenant-directory-list__header">
              <span>序号</span>
              <span>配置键 / 分组</span>
              <span>类型</span>
              <span>值</span>
              <span>说明</span>
              <span>操作</span>
            </div>
            {pageItems.map((item, index) => {
              const protection = protectionLabel(item);
              return (
                <div
                  key={item.id}
                  className="vx-tenant-directory-row vx-setting-row"
                  title={item.description ?? undefined}
                >
                  <span className="vx-tenant-directory-row__index">
                    {(page - 1) * PAGE_SIZE + index + 1}
                  </span>
                  <span className="vx-config-row__key">
                    {item.configKey}
                    <small>{item.configGroup}</small>
                  </span>
                  <span>{item.valueType}</span>
                  <span className="vx-config-row__value">
                    {item.configValue}
                    {protection ? (
                      <Badge className="vx-admin-role-status-pill--disabled">
                        {protection}
                      </Badge>
                    ) : null}
                  </span>
                  <span>{item.description ?? "-"}</span>
                  <span className="vx-tenant-actions">
                    <ActionMenu
                      label="配置操作"
                      triggerClassName="vx-tenant-actions__trigger"
                      triggerProps={{ title: "操作", disabled: submitting }}
                      items={[
                        {
                          id: "edit",
                          label: item.isEditable ? "编辑值" : "不可编辑",
                          icon: (
                            <Icon
                              name="edit"
                              size="xs"
                              fallback="placeholder"
                            />
                          ),
                          disabled: submitting || !item.isEditable,
                          onSelect: () => openEdit(item),
                        },
                      ]}
                    />
                  </span>
                </div>
              );
            })}
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
      {editing ? (
        <DialogForm
          open
          title="编辑配置值"
          description={`${editing.configKey}（${editing.valueType}）${
            editing.validationRule ? ` · 校验：${editing.validationRule}` : ""
          }`}
          submitLabel="保存"
          submitting={submitting}
          submitDisabled={editValue.trim().length === 0}
          onOpenChange={(open) => {
            if (!open) closeEdit();
          }}
          onSubmit={(event) => void submitEdit(event)}
        >
          <Label>
            配置值
            {editing.valueType === "bool" ? (
              <NativeSelect
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </NativeSelect>
            ) : editing.valueType === "json" ? (
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={6}
                placeholder='{"key": "value"}'
              />
            ) : (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                inputMode={editing.valueType === "int" ? "numeric" : undefined}
              />
            )}
          </Label>
          {editing.description ? (
            <p className="vx-step-up-hint">{editing.description}</p>
          ) : null}
        </DialogForm>
      ) : null}
    </div>
  );
}
