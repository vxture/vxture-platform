"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ActionMenu,
  Badge,
  BulkActionBar,
  Button,
  Checkbox,
  DialogForm,
  Icon,
  Input,
  Label,
  NativeSelect,
  ActionButton,
  EmptyState,
  PageHeader,
} from "@vxture/design-system";
import {
  createTenantRole,
  deleteTenantRole,
  fetchTenantPermissions,
  fetchTenantRoles,
  updateTenantRole,
} from "@/api/console-bff";
import type {
  TenantPermissionRecord,
  TenantRoleRecord,
} from "@/entities/console";
import { useConsoleSession } from "@/features/session/ConsoleSessionProvider";
import { useTranslations } from "next-intl";

type RoleFilter = "all" | "active" | "disabled" | "system" | "custom";
type Feedback = {
  tone: "success" | "error";
  key: string;
  values?: Record<string, number | string>;
} | null;

const ROLES_PAGE_SIZE = 10;

function rolePermissionSummary(role: TenantRoleRecord) {
  return role.permissions
    .map((permission) => permission.permissionCode)
    .join(", ");
}

function roleSearchText(role: TenantRoleRecord) {
  return [
    role.roleName,
    role.roleCode,
    role.description,
    role.status,
    role.isSystem ? "system" : "custom",
    rolePermissionSummary(role),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function RolesPage() {
  const t = useTranslations("rolesPage");
  const { session } = useConsoleSession();
  const [roles, setRoles] = useState<TenantRoleRecord[]>([]);
  const [permissions, setPermissions] = useState<TenantPermissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    roleCode: "",
    roleName: "",
    description: "",
    status: "active" as "active" | "disabled",
    permissionIds: [] as string[],
  });

  const currentTenantId =
    session.tenant?.mode === "tenant" ? session.tenant.id : undefined;

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([fetchTenantRoles(), fetchTenantPermissions()])
      .then(([roleRecords, permissionRecords]) => {
        if (!active) {
          return;
        }

        setRoles(roleRecords);
        setPermissions(permissionRecords);
        setSelectedIds(new Set());
        setSelectedId(null);
        setFeedback(null);
      })
      .catch(() => {
        if (active) {
          setFeedback({ tone: "error", key: "loadError" });
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentTenantId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, filter]);

  function resetFeedback() {
    setFeedback(null);
  }

  function resetForm(role?: TenantRoleRecord | null) {
    setForm({
      roleCode: role?.roleCode ?? "",
      roleName: role?.roleName ?? "",
      description: role?.description ?? "",
      status: role?.status ?? "active",
      permissionIds: role?.permissions.map((permission) => permission.id) ?? [],
    });
  }

  function openCreateDialog() {
    resetForm();
    resetFeedback();
    setDialogMode("create");
  }

  function openEditDialog(role: TenantRoleRecord) {
    setSelectedId(role.id);
    resetForm(role);
    resetFeedback();
    setDialogMode("edit");
  }

  function openDeleteDialog(role: TenantRoleRecord) {
    if (role.isSystem) {
      return;
    }

    setSelectedId(role.id);
    resetFeedback();
    setDeleteOpen(true);
  }

  async function reloadRoles(nextSelectedId?: string | null) {
    const roleRecords = await fetchTenantRoles();
    setRoles(roleRecords);
    setSelectedIds(new Set());
    setSelectedId(nextSelectedId ?? null);
  }

  async function submitRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    resetFeedback();

    try {
      if (dialogMode === "create") {
        const created = await createTenantRole({
          roleCode: form.roleCode,
          roleName: form.roleName,
          description: form.description,
          permissionIds: form.permissionIds,
        });
        await reloadRoles(created.id);
        setFeedback({ tone: "success", key: "createSuccess" });
      } else if (dialogMode === "edit" && selected) {
        const updated = await updateTenantRole(selected.id, {
          roleName: form.roleName,
          description: form.description,
          status: form.status,
          permissionIds: form.permissionIds,
        });
        await reloadRoles(updated.id);
        setFeedback({ tone: "success", key: "updateSuccess" });
      }

      setDialogMode(null);
    } catch {
      setFeedback({
        tone: "error",
        key: dialogMode === "create" ? "createError" : "updateError",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleRoleStatus(role: TenantRoleRecord) {
    const nextStatus = role.status === "active" ? "disabled" : "active";
    setSubmitting(true);
    resetFeedback();

    try {
      const updated = await updateTenantRole(role.id, { status: nextStatus });
      await reloadRoles(updated.id);
      setFeedback({
        tone: "success",
        key: nextStatus === "active" ? "enableSuccess" : "disableSuccess",
      });
    } catch {
      setFeedback({
        tone: "error",
        key: nextStatus === "active" ? "enableError" : "disableError",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteRole() {
    if (!selected || selected.isSystem) {
      return;
    }

    setSubmitting(true);
    resetFeedback();

    try {
      await deleteTenantRole(selected.id);
      await reloadRoles();
      setDeleteOpen(false);
      setFeedback({ tone: "success", key: "deleteSuccess" });
    } catch {
      setFeedback({ tone: "error", key: "deleteError" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkStatus(nextStatus: "active" | "disabled") {
    const targets = roles.filter(
      (role) => selectedIds.has(role.id) && role.status !== nextStatus,
    );
    if (!targets.length) {
      return;
    }

    setSubmitting(true);
    resetFeedback();

    try {
      await Promise.all(
        targets.map((role) =>
          updateTenantRole(role.id, { status: nextStatus }),
        ),
      );
      await reloadRoles();
      setFeedback({
        tone: "success",
        key: nextStatus === "active" ? "bulkEnabled" : "bulkDisabled",
        values: { count: targets.length },
      });
    } catch {
      setFeedback({
        tone: "error",
        key: nextStatus === "active" ? "bulkEnableError" : "bulkDisableError",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkDeleteRoles() {
    const targets = roles.filter(
      (role) => selectedIds.has(role.id) && !role.isSystem,
    );
    if (!targets.length) {
      return;
    }

    setSubmitting(true);
    resetFeedback();

    try {
      await Promise.all(targets.map((role) => deleteTenantRole(role.id)));
      await reloadRoles();
      setBulkDeleteOpen(false);
      setFeedback({
        tone: "success",
        key: "bulkDeleted",
        values: { count: targets.length },
      });
    } catch {
      setFeedback({ tone: "error", key: "bulkDeleteError" });
    } finally {
      setSubmitting(false);
    }
  }

  function togglePermission(permissionId: string) {
    setForm((current) => ({
      ...current,
      permissionIds: current.permissionIds.includes(permissionId)
        ? current.permissionIds.filter((item) => item !== permissionId)
        : [...current.permissionIds, permissionId],
    }));
  }

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return roles.filter((role) => {
      const matchesQuery =
        !normalizedQuery || roleSearchText(role).includes(normalizedQuery);
      const matchesFilter =
        filter === "all" ||
        role.status === filter ||
        (filter === "system" && role.isSystem) ||
        (filter === "custom" && !role.isSystem);
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, roles]);

  const roleCounts = useMemo(
    () => ({
      active: roles.filter((role) => role.status === "active").length,
      disabled: roles.filter((role) => role.status === "disabled").length,
      system: roles.filter((role) => role.isSystem).length,
      custom: roles.filter((role) => !role.isSystem).length,
    }),
    [roles],
  );

  const selected = roles.find((role) => role.id === selectedId) ?? null;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROLES_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * ROLES_PAGE_SIZE;
  const pagedRoles = filtered.slice(pageStart, pageStart + ROLES_PAGE_SIZE);
  const selectedRoles = roles.filter((role) => selectedIds.has(role.id));
  const selectedCount = selectedRoles.length;
  const selectablePageIds = pagedRoles.map((role) => role.id);
  const isPageSelected =
    selectablePageIds.length > 0 &&
    selectablePageIds.every((id) => selectedIds.has(id));
  const hasSelectedActive = selectedRoles.some(
    (role) => role.status === "active",
  );
  const hasSelectedDisabled = selectedRoles.some(
    (role) => role.status === "disabled",
  );
  const hasSelectedCustom = selectedRoles.some((role) => !role.isSystem);
  const bulkDeleteCount = selectedRoles.filter((role) => !role.isSystem).length;
  const countTitle = t("toolbar.countHint", {
    total: roles.length,
    active: roleCounts.active,
    disabled: roleCounts.disabled,
    system: roleCounts.system,
    custom: roleCounts.custom,
  });

  const roleFilters = [
    { value: "all", label: t("filters.all") },
    { value: "active", label: t("filters.active") },
    { value: "disabled", label: t("filters.disabled") },
    { value: "system", label: t("filters.system") },
    { value: "custom", label: t("filters.custom") },
  ] as const;

  const canCreateRole = true;

  function toggleRoleSelection(roleId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(roleId);
      } else {
        next.delete(roleId);
      }
      return next;
    });
  }

  function togglePageSelection(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      selectablePageIds.forEach((id) => {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  }

  return (
    <div
      className={
        selectedCount
          ? "vx-page-stack vx-roles-page vx-roles-page--selecting"
          : "vx-page-stack vx-roles-page"
      }
    >
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
      />

      {feedback ? (
        <p
          className={
            feedback.tone === "success"
              ? "vx-profile-message"
              : "vx-profile-error"
          }
        >
          {t(`feedback.${feedback.key}`, feedback.values)}
        </p>
      ) : null}

      <div className="vx-roles-workspace">
        <div className="vx-roles-actionbar">
          <BulkActionBar
            selectedLabel={
              selectedCount
                ? t("bulk.selected", { count: selectedCount })
                : undefined
            }
            selectionActions={
              selectedCount ? (
                <>
                  <ActionButton
                    variant="outline"
                    icon="shield-check"
                    disabled={submitting || !hasSelectedActive}
                    onClick={() => void handleBulkStatus("disabled")}
                  >
                    {t("bulk.disable")}
                  </ActionButton>
                  <ActionButton
                    variant="outline"
                    icon="check"
                    disabled={submitting || !hasSelectedDisabled}
                    onClick={() => void handleBulkStatus("active")}
                  >
                    {t("bulk.enable")}
                  </ActionButton>
                  <ActionButton
                    variant="outline"
                    icon="trash"
                    disabled={submitting || !hasSelectedCustom}
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    {t("bulk.delete")}
                  </ActionButton>
                </>
              ) : null
            }
            primaryActions={
              canCreateRole ? (
                <ActionButton icon="plus" onClick={openCreateDialog}>
                  {t("header.create")}
                </ActionButton>
              ) : null
            }
          />
        </div>

        <div className="vx-roles-toolbar">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("toolbar.searchPlaceholder")}
            className="vx-search-input vx-roles-toolbar__search"
            aria-label={t("toolbar.searchAriaLabel")}
          />
          <div className="vx-roles-toolbar__filters">
            <span className="vx-roles-toolbar__count" title={countTitle}>
              {t("toolbar.count", { count: filtered.length })}
            </span>
            <div
              className="vx-segmented-control"
              role="tablist"
              aria-label={t("toolbar.filterAriaLabel")}
            >
              {roleFilters.map((item) => (
                <Button
                  key={item.value}
                  variant={filter === item.value ? "secondary" : "ghost"}
                  size="sm"
                  role="tab"
                  title={item.label}
                  aria-selected={filter === item.value}
                  className={
                    filter === item.value
                      ? "vx-segmented-control__item vx-segmented-control__item--active"
                      : "vx-segmented-control__item"
                  }
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="vx-role-list">
          <div className="vx-role-list__header">
            <span
              className="vx-role-select vx-role-select--header"
              title={t("list.selectPage")}
            >
              <Checkbox
                checked={isPageSelected}
                aria-label={t("list.selectPage")}
                onCheckedChange={(value) => togglePageSelection(value === true)}
              />
            </span>
            <span>{t("list.columns.name")}</span>
            <span>{t("list.columns.code")}</span>
            <span>{t("list.columns.status")}</span>
            <span>{t("list.columns.type")}</span>
            <span>{t("list.columns.permissions")}</span>
            <span>{t("list.columns.description")}</span>
            <span />
          </div>

          {pagedRoles.length ? (
            pagedRoles.map((role) => {
              const permissionCodes =
                rolePermissionSummary(role) || t("list.noPermissions");
              const roleTitle = t("list.roleTitle", {
                name: role.roleName,
                code: role.roleCode,
                status:
                  role.status === "active"
                    ? t("status.active")
                    : t("status.disabled"),
                type: role.isSystem ? t("type.system") : t("type.custom"),
                permissions: role.permissions.length,
              });

              return (
                <div key={role.id} className="vx-role-row" title={roleTitle}>
                  <span
                    className="vx-role-select"
                    title={t("list.selectRole", { name: role.roleName })}
                  >
                    <Checkbox
                      checked={selectedIds.has(role.id)}
                      aria-label={t("list.selectRole", { name: role.roleName })}
                      onCheckedChange={(value) =>
                        toggleRoleSelection(role.id, value === true)
                      }
                    />
                  </span>
                  <div className="vx-role-row__identity">
                    <span
                      className={
                        role.isSystem
                          ? "vx-role-avatar vx-role-avatar--system"
                          : "vx-role-avatar vx-role-avatar--custom"
                      }
                      role="img"
                      aria-label={
                        role.isSystem
                          ? t("type.systemIcon")
                          : t("type.customIcon")
                      }
                      title={
                        role.isSystem
                          ? t("type.systemIcon")
                          : t("type.customIcon")
                      }
                    >
                      <Icon
                        name={role.isSystem ? "shield-check" : "users"}
                        size="xs"
                        fallback="placeholder"
                      />
                    </span>
                    <div className="vx-role-row__identity-copy">
                      <strong>{role.roleName}</strong>
                      <p title={role.description || t("list.noDescription")}>
                        {role.description || t("list.noDescription")}
                      </p>
                    </div>
                  </div>
                  <span className="vx-role-row__muted" title={role.roleCode}>
                    {role.roleCode}
                  </span>
                  <span>
                    <Badge
                      className={
                        role.status === "active"
                          ? "vx-role-status vx-role-status--active"
                          : "vx-role-status vx-role-status--disabled"
                      }
                      title={
                        role.status === "active"
                          ? t("status.active")
                          : t("status.disabled")
                      }
                    >
                      {role.status === "active"
                        ? t("status.active")
                        : t("status.disabled")}
                    </Badge>
                  </span>
                  <span className="vx-role-row__muted">
                    {role.isSystem ? t("type.system") : t("type.custom")}
                  </span>
                  <span className="vx-role-row__text" title={permissionCodes}>
                    {t("list.permissionCount", {
                      count: role.permissions.length,
                    })}
                  </span>
                  <span
                    className="vx-role-row__muted"
                    title={role.description || t("list.noDescription")}
                  >
                    {role.description || t("list.noDescription")}
                  </span>
                  <div className="vx-role-row__menu">
                    <ActionMenu
                      label={t("actions.menuLabel", { name: role.roleName })}
                      triggerProps={{
                        title: t("actions.menuLabel", { name: role.roleName }),
                      }}
                      items={[
                        {
                          id: "edit",
                          label: t("actions.edit"),
                          icon: (
                            <Icon
                              name="edit"
                              size="xs"
                              fallback="placeholder"
                            />
                          ),
                          onSelect: () => openEditDialog(role),
                        },
                        {
                          id: "toggle-status",
                          label:
                            role.status === "active"
                              ? t("actions.disable")
                              : t("actions.enable"),
                          icon: (
                            <Icon
                              name="shield-check"
                              size="xs"
                              fallback="placeholder"
                            />
                          ),
                          disabled: submitting,
                          onSelect: () => void handleToggleRoleStatus(role),
                        },
                        ...(!role.isSystem
                          ? [
                              {
                                id: "delete",
                                label: t("actions.delete"),
                                icon: (
                                  <Icon
                                    name="trash"
                                    size="xs"
                                    fallback="placeholder"
                                  />
                                ),
                                disabled: submitting,
                                danger: true,
                                onSelect: () => openDeleteDialog(role),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              title={loading ? t("empty.loadingTitle") : t("empty.title")}
              description={
                loading ? t("empty.loadingDescription") : t("empty.description")
              }
              action={
                <ActionButton
                  variant="outline"
                  icon="x"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  {t("empty.resetFilters")}
                </ActionButton>
              }
            />
          )}
        </div>

        <div className="vx-roles-pagination">
          <div className="vx-roles-pagination__actions">
            <span>
              {t("pagination.summary", {
                page: safeCurrentPage,
                totalPages,
                total: filtered.length,
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              {t("pagination.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>

        {dialogMode ? (
          <DialogForm
            open
            title={
              dialogMode === "create"
                ? t("dialog.createTitle")
                : t("dialog.editTitle")
            }
            submitLabel={
              dialogMode === "create" ? t("dialog.create") : t("dialog.save")
            }
            cancelLabel={t("dialog.cancel")}
            submitting={submitting}
            onOpenChange={(open) => {
              if (!open) setDialogMode(null);
            }}
            onSubmit={(event) => void submitRole(event)}
          >
            <Label>
              {t("dialog.fields.code")}
              <Input
                value={form.roleCode}
                disabled={dialogMode === "edit"}
                onChange={(event) =>
                  setForm((old) => ({ ...old, roleCode: event.target.value }))
                }
                required
              />
            </Label>
            <Label>
              {t("dialog.fields.name")}
              <Input
                value={form.roleName}
                onChange={(event) =>
                  setForm((old) => ({ ...old, roleName: event.target.value }))
                }
                required
              />
            </Label>
            <Label>
              {t("dialog.fields.description")}
              <Input
                value={form.description}
                onChange={(event) =>
                  setForm((old) => ({
                    ...old,
                    description: event.target.value,
                  }))
                }
              />
            </Label>
            <Label>
              {t("dialog.fields.status")}
              <NativeSelect
                className="vx-input"
                value={form.status}
                onChange={(event) =>
                  setForm((old) => ({
                    ...old,
                    status: event.target.value as "active" | "disabled",
                  }))
                }
              >
                <option value="active">{t("status.active")}</option>
                <option value="disabled">{t("status.disabled")}</option>
              </NativeSelect>
            </Label>
            <div className="vx-role-permission-picker">
              <header>
                <h2>{t("dialog.permissionsTitle")}</h2>
                <p>{t("dialog.permissionsDescription")}</p>
              </header>
              <div className="vx-role-permission-picker__list">
                {permissions.map((permission) => (
                  <Button
                    key={permission.id}
                    variant={
                      form.permissionIds.includes(permission.id)
                        ? "secondary"
                        : "outline"
                    }
                    size="sm"
                    title={permission.description ?? permission.permissionName}
                    className={
                      form.permissionIds.includes(permission.id)
                        ? "vx-role-permission-chip vx-role-permission-chip--active"
                        : "vx-role-permission-chip"
                    }
                    onClick={() => togglePermission(permission.id)}
                  >
                    {permission.permissionCode}
                  </Button>
                ))}
              </div>
            </div>
          </DialogForm>
        ) : null}

        {deleteOpen && selected ? (
          <DialogForm
            open
            title={t("dialog.deleteTitle")}
            description={t("dialog.deleteDescription", {
              name: selected.roleName,
            })}
            submitLabel={t("dialog.delete")}
            submitVariant="destructive"
            cancelLabel={t("dialog.cancel")}
            submitting={submitting}
            onOpenChange={(open) => {
              if (!open) setDeleteOpen(false);
            }}
            onSubmit={(event) => {
              event.preventDefault();
              void handleDeleteRole();
            }}
          />
        ) : null}

        {bulkDeleteOpen ? (
          <DialogForm
            open
            title={t("dialog.bulkDeleteTitle")}
            description={t("dialog.bulkDeleteDescription", {
              count: bulkDeleteCount,
            })}
            submitLabel={t("dialog.delete")}
            submitVariant="destructive"
            submitDisabled={!bulkDeleteCount}
            cancelLabel={t("dialog.cancel")}
            submitting={submitting}
            onOpenChange={(open) => {
              if (!open) setBulkDeleteOpen(false);
            }}
            onSubmit={(event) => {
              event.preventDefault();
              void handleBulkDeleteRoles();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
