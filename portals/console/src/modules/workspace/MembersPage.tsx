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
  UserAvatar,
  ActionButton,
  EmptyState,
  PageHeader,
} from "@vxture/design-system";
import {
  createMember,
  disableMember,
  fetchMembers,
  fetchTenantRoles,
  inviteMember,
  resetMemberPassword,
  unlinkMember,
  updateMember,
} from "@/api/console-bff";
import type { MemberRecord, TenantRoleRecord } from "@/entities/console";
import { useTranslations } from "next-intl";
import { useConsoleSession } from "@/features/session/ConsoleSessionProvider";

type MemberStatusFilter = "all" | "active" | "invited" | "suspended";

const MEMBERS_PAGE_SIZE = 10;

const statusClassMap: Record<MemberRecord["status"], string> = {
  Active: "vx-member-status--active",
  Invited: "vx-member-status--invited",
  Suspended: "vx-member-status--suspended",
};

function memberUsername(member: MemberRecord) {
  return (
    member.username?.trim() || member.email.split("@")[0] || member.accountId
  );
}

function memberSearchText(member: MemberRecord) {
  return [
    member.name,
    memberUsername(member),
    member.email,
    member.phone,
    member.role,
    member.team,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function MembersPage() {
  const t = useTranslations("membersPage");
  const { session } = useConsoleSession();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [roles, setRoles] = useState<TenantRoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<MemberStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<"create" | "invite" | null>(
    null,
  );
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [bulkUnlinkOpen, setBulkUnlinkOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({
    email: "",
    nickname: "",
    remark: "",
    roleId: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    nextPassword: "",
  });

  useEffect(() => {
    let active = true;

    setLoading(true);
    Promise.all([fetchMembers(), fetchTenantRoles()])
      .then(([records, roleRecords]) => {
        if (!active) {
          return;
        }

        setMembers(records);
        setRoles(roleRecords.filter((role) => role.status === "active"));
        setSelectedIds(new Set());
        setSelectedId(null);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [session.tenant?.id, session.tenant?.mode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, status]);

  function resetFeedback() {
    setMessage(null);
    setError(null);
  }

  function resetMemberForm(member?: MemberRecord | null) {
    setMemberForm({
      email: member?.email ?? "",
      nickname: member?.name ?? "",
      remark: member?.team === "Workspace" ? "" : (member?.team ?? ""),
      roleId: member?.roleId ?? "",
    });
  }

  function openCreateDialog(mode: "create" | "invite") {
    resetMemberForm();
    resetFeedback();
    setCreateMode(mode);
  }

  function openEditDialog(member: MemberRecord) {
    setSelectedId(member.id);
    resetMemberForm(member);
    resetFeedback();
    setEditOpen(true);
  }

  function openResetDialog(member: MemberRecord) {
    setSelectedId(member.id);
    setPasswordForm({ nextPassword: "" });
    resetFeedback();
    setResetOpen(true);
  }

  function openUnlinkDialog(member: MemberRecord) {
    setSelectedId(member.id);
    resetFeedback();
    setUnlinkOpen(true);
  }

  async function reloadMembers(nextSelectedId?: string | null) {
    const records = await fetchMembers();
    setMembers(records);
    setSelectedIds(new Set());
    setSelectedId(nextSelectedId ?? null);
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createMode) {
      return;
    }

    setSubmitting(true);
    resetFeedback();

    try {
      const payload = {
        email: memberForm.email,
        nickname: memberForm.nickname,
        remark: memberForm.remark,
        roleId: memberForm.roleId || null,
      };

      const created =
        createMode === "invite"
          ? await inviteMember(payload)
          : await createMember(payload);

      await reloadMembers(created.id);
      setCreateMode(null);
      resetMemberForm();
      setMessage(
        t(
          createMode === "invite"
            ? "feedback.inviteSuccess"
            : "feedback.createSuccess",
        ),
      );
    } catch {
      setError(
        t(
          createMode === "invite"
            ? "feedback.inviteError"
            : "feedback.createError",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      return;
    }

    setSubmitting(true);
    resetFeedback();

    try {
      const updated = await updateMember(selected.id, {
        nickname: memberForm.nickname,
        remark: memberForm.remark,
        roleId: memberForm.roleId || null,
      });
      await reloadMembers(updated.id);
      setEditOpen(false);
      setMessage(t("feedback.updateSuccess"));
    } catch {
      setError(t("feedback.updateError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      return;
    }

    if (passwordForm.nextPassword.length < 6) {
      setError(t("feedback.resetPasswordLength"));
      return;
    }

    setSubmitting(true);
    resetFeedback();

    try {
      await resetMemberPassword(selected.id, {
        nextPassword: passwordForm.nextPassword,
      });
      setResetOpen(false);
      setPasswordForm({ nextPassword: "" });
      setMessage(t("feedback.resetPasswordSuccess", { name: selected.name }));
    } catch {
      setError(t("feedback.resetPasswordError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleMemberStatus(member: MemberRecord) {
    const nextStatus = member.status === "Suspended" ? "active" : "banned";
    setSubmitting(true);
    resetFeedback();

    try {
      const updated =
        nextStatus === "banned"
          ? await disableMember(member.id)
          : await updateMember(member.id, { status: nextStatus });
      await reloadMembers(updated.id);
      setMessage(
        nextStatus === "banned"
          ? t("feedback.memberDisabled")
          : t("feedback.memberEnabled"),
      );
    } catch {
      setError(
        nextStatus === "banned"
          ? t("feedback.memberDisableError")
          : t("feedback.memberEnableError"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnlinkMember() {
    if (!selected) {
      return;
    }

    setSubmitting(true);
    resetFeedback();

    try {
      await unlinkMember(selected.id);
      await reloadMembers();
      setUnlinkOpen(false);
      setMessage(t("feedback.unlinkSuccess"));
    } catch {
      setError(t("feedback.unlinkError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkStatus(nextStatus: "active" | "banned") {
    const targets = members.filter(
      (member) =>
        selectedIds.has(member.id) &&
        (nextStatus === "banned"
          ? member.status !== "Suspended"
          : member.status === "Suspended"),
    );
    if (!targets.length) {
      return;
    }

    setSubmitting(true);
    resetFeedback();

    try {
      await Promise.all(
        targets.map((member) =>
          nextStatus === "banned"
            ? disableMember(member.id)
            : updateMember(member.id, { status: nextStatus }),
        ),
      );
      await reloadMembers();
      setMessage(
        nextStatus === "banned"
          ? t("feedback.bulkDisabled", { count: targets.length })
          : t("feedback.bulkEnabled", { count: targets.length }),
      );
    } catch {
      setError(
        nextStatus === "banned"
          ? t("feedback.bulkDisableError")
          : t("feedback.bulkEnableError"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkUnlink() {
    const targets = members.filter((member) => selectedIds.has(member.id));
    if (!targets.length) {
      return;
    }

    setSubmitting(true);
    resetFeedback();

    try {
      await Promise.all(targets.map((member) => unlinkMember(member.id)));
      await reloadMembers();
      setBulkUnlinkOpen(false);
      setMessage(t("feedback.bulkUnlinkSuccess", { count: targets.length }));
    } catch {
      setError(t("feedback.bulkUnlinkError"));
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return members.filter((member) => {
      const matchesQuery =
        !normalizedQuery || memberSearchText(member).includes(normalizedQuery);
      const matchesStatus =
        status === "all" || member.status.toLowerCase() === status;
      return matchesQuery && matchesStatus;
    });
  }, [members, query, status]);

  const statusCounts = useMemo(
    () => ({
      active: members.filter((member) => member.status === "Active").length,
      invited: members.filter((member) => member.status === "Invited").length,
      suspended: members.filter((member) => member.status === "Suspended")
        .length,
    }),
    [members],
  );

  const selected = members.find((member) => member.id === selectedId) ?? null;
  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / MEMBERS_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * MEMBERS_PAGE_SIZE;
  const pagedMembers = filtered.slice(pageStart, pageStart + MEMBERS_PAGE_SIZE);
  const selectedMembers = members.filter((member) =>
    selectedIds.has(member.id),
  );
  const selectedCount = selectedMembers.length;
  const selectablePageIds = pagedMembers.map((member) => member.id);
  const isPageSelected =
    selectablePageIds.length > 0 &&
    selectablePageIds.every((id) => selectedIds.has(id));
  const hasSelectedActive = selectedMembers.some(
    (member) => member.status !== "Suspended",
  );
  const hasSelectedSuspended = selectedMembers.some(
    (member) => member.status === "Suspended",
  );
  const memberActionVisibility = {
    bulk: selectedCount > 0,
    invite: true,
    create: true,
  };

  const statusFilters = [
    { value: "all", label: t("filters.all") },
    { value: "active", label: t("filters.active") },
    { value: "invited", label: t("filters.invited") },
    { value: "suspended", label: t("filters.suspended") },
  ] as const;

  const countTitle = t("table.countHint", {
    total: members.length,
    active: statusCounts.active,
    invited: statusCounts.invited,
    suspended: statusCounts.suspended,
  });

  function toggleMemberSelection(memberId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(memberId);
      } else {
        next.delete(memberId);
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
          ? "vx-page-stack vx-members-page vx-members-page--selecting"
          : "vx-page-stack vx-members-page"
      }
    >
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
      />

      {message ? <p className="vx-profile-message">{message}</p> : null}
      {error ? <p className="vx-profile-error">{error}</p> : null}

      <div className="vx-members-workspace">
        <div className="vx-members-actionbar">
          <BulkActionBar
            selectedLabel={
              memberActionVisibility.bulk
                ? t("bulk.selected", { count: selectedCount })
                : undefined
            }
            selectionActions={
              memberActionVisibility.bulk ? (
                <>
                  <ActionButton
                    variant="outline"
                    icon="shield-check"
                    disabled={submitting || !hasSelectedActive}
                    onClick={() => void handleBulkStatus("banned")}
                  >
                    {t("bulk.disable")}
                  </ActionButton>
                  <ActionButton
                    variant="outline"
                    icon="check"
                    disabled={submitting || !hasSelectedSuspended}
                    onClick={() => void handleBulkStatus("active")}
                  >
                    {t("bulk.enable")}
                  </ActionButton>
                  <ActionButton
                    variant="outline"
                    icon="user-switch"
                    disabled={submitting}
                    onClick={() => setBulkUnlinkOpen(true)}
                  >
                    {t("bulk.unlink")}
                  </ActionButton>
                </>
              ) : null
            }
            primaryActions={
              <>
                {memberActionVisibility.invite ? (
                  <ActionButton
                    variant="outline"
                    icon="mail"
                    onClick={() => openCreateDialog("invite")}
                  >
                    {t("header.inviteMember")}
                  </ActionButton>
                ) : null}
                {memberActionVisibility.create ? (
                  <ActionButton
                    icon="plus"
                    onClick={() => openCreateDialog("create")}
                  >
                    {t("header.addMember")}
                  </ActionButton>
                ) : null}
              </>
            }
          />
        </div>

        <div className="vx-members-toolbar">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("table.searchPlaceholder")}
            className="vx-search-input vx-members-toolbar__search"
            aria-label={t("table.searchAriaLabel")}
          />
          <div className="vx-members-toolbar__filters">
            <span className="vx-members-toolbar__count" title={countTitle}>
              {t("table.toolbarTitle", { count: filtered.length })}
            </span>
            <div
              className="vx-segmented-control"
              role="tablist"
              aria-label={t("table.filterAriaLabel")}
            >
              {statusFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={status === filter.value ? "secondary" : "ghost"}
                  size="sm"
                  role="tab"
                  title={filter.label}
                  aria-selected={status === filter.value}
                  className={
                    status === filter.value
                      ? "vx-segmented-control__item vx-segmented-control__item--active"
                      : "vx-segmented-control__item"
                  }
                  onClick={() => setStatus(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="vx-member-list">
          <div className="vx-member-list__header">
            <span
              className="vx-member-select vx-member-select--header"
              title={t("table.selectPage")}
            >
              <Checkbox
                checked={isPageSelected}
                aria-label={t("table.selectPage")}
                onCheckedChange={(value) => togglePageSelection(value === true)}
              />
            </span>
            <span>{t("table.columns.name")}</span>
            <span>{t("table.columns.phone")}</span>
            <span>{t("table.columns.email")}</span>
            <span>{t("table.columns.role")}</span>
            <span>{t("table.columns.status")}</span>
            <span>{t("table.columns.lastActive")}</span>
            <span />
          </div>
          {pagedMembers.length ? (
            pagedMembers.map((member) => {
              const username = memberUsername(member);
              const detailTitle = t("table.memberTitle", {
                name: member.name,
                username,
                phone: member.phone ?? t("table.emptyPhone"),
                email: member.email,
                role: member.role,
                team: member.team,
                status: t(`status.${member.status}`),
              });

              return (
                <div
                  key={member.id}
                  className="vx-member-table__row"
                  title={detailTitle}
                >
                  <span
                    className="vx-member-select"
                    title={t("table.selectMember", { name: member.name })}
                  >
                    <Checkbox
                      checked={selectedIds.has(member.id)}
                      aria-label={t("table.selectMember", {
                        name: member.name,
                      })}
                      onCheckedChange={(value) =>
                        toggleMemberSelection(member.id, value === true)
                      }
                    />
                  </span>
                  <div className="vx-member-table__identity">
                    <UserAvatar
                      className="vx-member-table__avatar"
                      src={member.avatarUrl?.trim() || null}
                      alt={t("table.avatarAlt", { name: member.name })}
                    />
                    <div className="vx-member-table__person">
                      <div className="vx-member-table__person-line">
                        <strong>{member.name}</strong>
                        {member.isPrimaryOwner ? (
                          <span>{t("table.primaryOwner")}</span>
                        ) : null}
                      </div>
                      <p title={username}>{username}</p>
                    </div>
                  </div>
                  <span
                    className="vx-member-table__muted"
                    title={member.phone ?? t("table.emptyPhone")}
                  >
                    {member.phone ?? t("table.emptyPhone")}
                  </span>
                  <span className="vx-member-table__muted" title={member.email}>
                    {member.email}
                  </span>
                  <span className="vx-member-table__text" title={member.role}>
                    {member.role}
                  </span>
                  <span>
                    <Badge
                      className={`vx-member-status ${statusClassMap[member.status]}`}
                      title={t("table.statusTitle", {
                        status: t(`status.${member.status}`),
                      })}
                    >
                      {t(`status.${member.status}`)}
                    </Badge>
                  </span>
                  <span
                    className="vx-member-table__muted"
                    title={member.lastActive}
                  >
                    {member.lastActive}
                  </span>
                  <div className="vx-member-table__menu">
                    <ActionMenu
                      label={t("actions.menuLabel", { name: member.name })}
                      triggerProps={{
                        title: t("actions.menuLabel", { name: member.name }),
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
                          onSelect: () => openEditDialog(member),
                        },
                        {
                          id: "toggle-status",
                          label:
                            member.status === "Suspended"
                              ? t("actions.enableMember")
                              : member.status === "Invited"
                                ? t("actions.disableInvite")
                                : t("actions.disableMember"),
                          icon: (
                            <Icon
                              name="shield-check"
                              size="xs"
                              fallback="placeholder"
                            />
                          ),
                          disabled: submitting,
                          onSelect: () => void handleToggleMemberStatus(member),
                        },
                        {
                          id: "reset-password",
                          label: t("actions.resetPassword"),
                          icon: (
                            <Icon name="key" size="xs" fallback="placeholder" />
                          ),
                          onSelect: () => openResetDialog(member),
                        },
                        {
                          id: "unlink",
                          label: t("actions.unlink"),
                          icon: (
                            <Icon
                              name="user-switch"
                              size="xs"
                              fallback="placeholder"
                            />
                          ),
                          disabled: submitting,
                          danger: true,
                          onSelect: () => openUnlinkDialog(member),
                        },
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
                    setStatus("all");
                  }}
                >
                  {t("empty.resetFilters")}
                </ActionButton>
              }
            />
          )}
        </div>

        <div className="vx-members-pagination">
          <div className="vx-members-pagination__actions">
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

        {createMode ? (
          <DialogForm
            open
            title={
              createMode === "invite"
                ? t("dialogs.invite.title")
                : t("dialogs.create.title")
            }
            submitLabel={
              createMode === "invite"
                ? t("dialogs.actions.sendInvite")
                : t("dialogs.actions.create")
            }
            cancelLabel={t("dialogs.actions.cancel")}
            submitting={submitting}
            onOpenChange={(open) => {
              if (!open) setCreateMode(null);
            }}
            onSubmit={(event) => void submitCreate(event)}
          >
            <Label>
              {t("dialogs.fields.email")}
              <Input
                type="email"
                value={memberForm.email}
                onChange={(event) =>
                  setMemberForm((old) => ({
                    ...old,
                    email: event.target.value,
                  }))
                }
                required
              />
            </Label>
            <Label>
              {t("dialogs.fields.nickname")}
              <Input
                value={memberForm.nickname}
                onChange={(event) =>
                  setMemberForm((old) => ({
                    ...old,
                    nickname: event.target.value,
                  }))
                }
              />
            </Label>
            <Label>
              {t("dialogs.fields.teamRemark")}
              <Input
                value={memberForm.remark}
                onChange={(event) =>
                  setMemberForm((old) => ({
                    ...old,
                    remark: event.target.value,
                  }))
                }
              />
            </Label>
            <Label>
              {t("dialogs.fields.role")}
              <NativeSelect
                className="vx-input"
                value={memberForm.roleId}
                onChange={(event) =>
                  setMemberForm((old) => ({
                    ...old,
                    roleId: event.target.value,
                  }))
                }
              >
                <option value="">{t("dialogs.fields.defaultRole")}</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.roleName}
                  </option>
                ))}
              </NativeSelect>
            </Label>
          </DialogForm>
        ) : null}

        {editOpen && selected ? (
          <DialogForm
            open
            title={t("dialogs.edit.title")}
            submitLabel={t("dialogs.actions.save")}
            cancelLabel={t("dialogs.actions.cancel")}
            submitting={submitting}
            onOpenChange={(open) => {
              if (!open) setEditOpen(false);
            }}
            onSubmit={(event) => void submitEdit(event)}
          >
            <Label>
              {t("dialogs.fields.email")}
              <Input value={selected.email} disabled />
            </Label>
            <Label>
              {t("dialogs.fields.nickname")}
              <Input
                value={memberForm.nickname}
                onChange={(event) =>
                  setMemberForm((old) => ({
                    ...old,
                    nickname: event.target.value,
                  }))
                }
              />
            </Label>
            <Label>
              {t("dialogs.fields.teamRemark")}
              <Input
                value={memberForm.remark}
                onChange={(event) =>
                  setMemberForm((old) => ({
                    ...old,
                    remark: event.target.value,
                  }))
                }
              />
            </Label>
            <Label>
              {t("dialogs.fields.role")}
              <NativeSelect
                className="vx-input"
                value={memberForm.roleId}
                onChange={(event) =>
                  setMemberForm((old) => ({
                    ...old,
                    roleId: event.target.value,
                  }))
                }
              >
                <option value="">{t("dialogs.fields.defaultRole")}</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.roleName}
                  </option>
                ))}
              </NativeSelect>
            </Label>
          </DialogForm>
        ) : null}

        {resetOpen && selected ? (
          <DialogForm
            open
            title={t("dialogs.reset.title")}
            description={t("dialogs.reset.description", {
              name: selected.name,
            })}
            submitLabel={t("dialogs.actions.resetPassword")}
            cancelLabel={t("dialogs.actions.cancel")}
            submitting={submitting}
            onOpenChange={(open) => {
              if (!open) setResetOpen(false);
            }}
            onSubmit={(event) => void submitResetPassword(event)}
          >
            <Label>
              {t("dialogs.fields.nextPassword")}
              <Input
                type="password"
                value={passwordForm.nextPassword}
                onChange={(event) =>
                  setPasswordForm({ nextPassword: event.target.value })
                }
                minLength={6}
                required
              />
            </Label>
          </DialogForm>
        ) : null}

        {unlinkOpen && selected ? (
          <DialogForm
            open
            title={t("dialogs.unlink.title")}
            description={t("dialogs.unlink.description", {
              name: selected.name,
            })}
            submitLabel={t("dialogs.actions.unlink")}
            submitVariant="destructive"
            cancelLabel={t("dialogs.actions.cancel")}
            submitting={submitting}
            onOpenChange={(open) => {
              if (!open) setUnlinkOpen(false);
            }}
            onSubmit={(event) => {
              event.preventDefault();
              void handleUnlinkMember();
            }}
          />
        ) : null}

        {bulkUnlinkOpen ? (
          <DialogForm
            open
            title={t("dialogs.bulkUnlink.title")}
            description={t("dialogs.bulkUnlink.description", {
              count: selectedCount,
            })}
            submitLabel={t("dialogs.actions.unlink")}
            submitVariant="destructive"
            cancelLabel={t("dialogs.actions.cancel")}
            submitting={submitting}
            onOpenChange={(open) => {
              if (!open) setBulkUnlinkOpen(false);
            }}
            onSubmit={(event) => {
              event.preventDefault();
              void handleBulkUnlink();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
