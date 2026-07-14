"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Icon,
  ActionMenu,
  Badge,
  Button,
  Checkbox,
  DialogForm,
  Input,
  Label,
  NativeSelect,
  Pagination,
  Textarea,
  ActionButton,
  EmptyState,
  ViewModeSwitch,
  useToast,
} from "@vxture/design-system";
import {
  changePlatformAdminRole,
  createPlatformAdmin,
  disablePlatformAdmin,
  enablePlatformAdmin,
  fetchCurrentUser,
  fetchPlatformAdmins,
  fetchPlatformRoles,
  forcePlatformAdminLogout,
  isStepUpRequiredError,
  resetPlatformAdminMfa,
  resetPlatformAdminPassword,
  updatePlatformAdmin,
  type PlatformAdminMetadataInput,
} from "@/api/admin-bff";
import type {
  PlatformAdminRecord,
  PlatformRoleRecord,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import {
  PageSizePicker as AdminPageSizePicker,
  type PageSize,
} from "@/modules/shared/PageSizePicker";
import { useConsoleTranslations } from "@/lib/ConsoleIntl";
import {
  formatDate,
  formatNumber,
  joinClasses,
} from "@/modules/tenants/tenant-utils";
import { useStepUp, isStepUpCancelled } from "@/providers/StepUpProvider";

type ViewMode = "list" | "cards";
type PlatformAdminStatusCode = PlatformAdminRecord["statusCode"];
type StatusFilter = "all" | PlatformAdminStatusCode;
type UserTypeFilter = "all" | "system" | "normal";
const EMPTY_MARK = "-";

function platformRoleDisplayName(
  admin: PlatformAdminRecord,
  t: ReturnType<typeof useConsoleTranslations>,
) {
  return t(admin.roleNameI18nKey, admin.roleNameEn);
}

function platformRoleStatusLabel(admin: PlatformAdminRecord) {
  if (admin.roleStatusCode === "active") return "启用";
  if (admin.roleStatusCode === "archived") return "归档";
  return "停用";
}

function platformRoleStatusPillClass(admin: PlatformAdminRecord) {
  if (admin.roleStatusCode === "active")
    return "vx-admin-role-status-pill--enabled";
  if (admin.roleStatusCode === "archived")
    return "vx-platform-user-status-pill--attention";
  return "vx-admin-role-status-pill--disabled";
}

function platformAdminStatusCode(
  admin: PlatformAdminRecord,
): PlatformAdminStatusCode {
  const statusCode = admin.statusCode;
  if (
    statusCode === "active" ||
    statusCode === "disabled" ||
    statusCode === "locked" ||
    statusCode === "pending" ||
    statusCode === "suspended"
  ) {
    return statusCode;
  }
  return admin.status ? "active" : "disabled";
}

function platformAdminSearchText(admin: PlatformAdminRecord) {
  return [
    admin.id,
    admin.username,
    admin.displayName,
    admin.email,
    admin.phone,
    admin.roleCode,
    admin.roleNameI18nKey,
    admin.roleNameEn,
    admin.lastLoginIp,
    admin.remark,
    platformAdminStatusCode(admin),
    platformAdminStatusLabel(admin),
    admin.isSystem ? "system 系统用户" : "normal 普通用户",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function platformAdminStatusLabel(admin: PlatformAdminRecord) {
  const labels: Record<PlatformAdminStatusCode, string> = {
    active: "启用",
    disabled: "停用",
    locked: "锁定",
    pending: "待激活",
    suspended: "暂停",
  };
  return labels[platformAdminStatusCode(admin)];
}

function platformAdminStatusTone(admin: PlatformAdminRecord) {
  const statusCode = platformAdminStatusCode(admin);
  if (statusCode === "active") return "normal";
  if (statusCode === "pending") return "progress";
  if (statusCode === "locked" || statusCode === "suspended") return "attention";
  return "closed";
}

function platformAdminStatusIcon(admin: PlatformAdminRecord) {
  const statusCode = platformAdminStatusCode(admin);
  if (statusCode === "active") return "check";
  if (statusCode === "pending") return "clock";
  return "x";
}

function platformAdminStatusPillClass(admin: PlatformAdminRecord) {
  const statusCode = platformAdminStatusCode(admin);
  if (statusCode === "active") return "vx-admin-role-status-pill--enabled";
  if (statusCode === "pending") return "vx-platform-user-status-pill--pending";
  if (statusCode === "locked" || statusCode === "suspended")
    return "vx-platform-user-status-pill--attention";
  return "vx-admin-role-status-pill--disabled";
}

function PlatformUserActionsMenu({
  admin,
  onView,
  onChangeRole,
  onEditMetadata,
  onToggleStatus,
  onForceLogout,
  onResetMfa,
  onResetPassword,
}: {
  admin: PlatformAdminRecord;
  onView: (admin: PlatformAdminRecord) => void;
  onChangeRole: (admin: PlatformAdminRecord) => void;
  onEditMetadata: (admin: PlatformAdminRecord) => void;
  onToggleStatus: (admin: PlatformAdminRecord) => void;
  onForceLogout: (admin: PlatformAdminRecord) => void;
  onResetMfa: (admin: PlatformAdminRecord) => void;
  onResetPassword: (admin: PlatformAdminRecord) => void;
}) {
  // TD-017 分级模型：canManage=false（目标 rank ≥ 自身）时管理项禁用；
  // 后端三层门控无论如何都会拒绝，这里只是显示层一致性。
  const managed = admin.canManage !== false;
  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${admin.displayName} 操作`}
        triggerClassName="vx-tenant-actions__trigger"
        triggerProps={{ title: "操作" }}
        items={[
          {
            id: "profile",
            label: "查看详情",
            icon: <Icon name="user" size="xs" fallback="placeholder" />,
            onSelect: () => onView(admin),
          },
          {
            id: "role",
            label: "调整角色",
            icon: <Icon name="shield-check" size="xs" fallback="placeholder" />,
            disabled: !managed,
            onSelect: () => onChangeRole(admin),
          },
          {
            id: "metadata",
            label: "编辑资料",
            icon: <Icon name="edit" size="xs" fallback="placeholder" />,
            disabled: !managed,
            onSelect: () => onEditMetadata(admin),
          },
          {
            id: "toggle-status",
            label:
              platformAdminStatusCode(admin) === "active"
                ? "停用用户"
                : "启用用户",
            icon: (
              <Icon
                name={
                  platformAdminStatusCode(admin) === "active" ? "x" : "check"
                }
                size="xs"
                fallback="placeholder"
              />
            ),
            // B9-P1b-α：经 IdP 委托停用/启用（+ 停用即吊销会话）。
            disabled: !managed,
            onSelect: () => onToggleStatus(admin),
          },
          {
            id: "force-logout",
            label: "强制下线",
            icon: <Icon name="clock" size="xs" fallback="placeholder" />,
            // B9-P1b-α：经 IdP 委托吊销该用户全部会话。
            disabled: !managed,
            onSelect: () => onForceLogout(admin),
          },
          {
            id: "mfa-reset",
            label: "重置 MFA",
            icon: <Icon name="shield-check" size="xs" fallback="placeholder" />,
            // B9-P1b-α：经 IdP 委托清除已登记的第二因子（保留策略，下次登录重登记）+ 吊销会话。
            disabled: !managed,
            onSelect: () => onResetMfa(admin),
          },
          {
            id: "reset-password",
            label: "重置密码",
            icon: <Icon name="key" size="xs" fallback="placeholder" />,
            // B9-P1b-β/TD-017：经 IdP 生成一次性重置链接并带外投递至目标本人邮箱，发起方不接触链接。
            disabled: !managed,
            onSelect: () => onResetPassword(admin),
          },
        ]}
      />
    </div>
  );
}

function PlatformUsersList({
  admins,
  startIndex,
  selectedIds,
  onToggleSelected,
  onTogglePage,
  onView,
  onChangeRole,
  onEditMetadata,
  onToggleStatus,
  onForceLogout,
  onResetMfa,
  onResetPassword,
  t,
}: {
  admins: PlatformAdminRecord[];
  startIndex: number;
  selectedIds: Set<string>;
  onToggleSelected: (id: string, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
  onView: (admin: PlatformAdminRecord) => void;
  onChangeRole: (admin: PlatformAdminRecord) => void;
  onEditMetadata: (admin: PlatformAdminRecord) => void;
  onToggleStatus: (admin: PlatformAdminRecord) => void;
  onForceLogout: (admin: PlatformAdminRecord) => void;
  onResetMfa: (admin: PlatformAdminRecord) => void;
  onResetPassword: (admin: PlatformAdminRecord) => void;
  t: ReturnType<typeof useConsoleTranslations>;
}) {
  const selectedCount = admins.filter((admin) =>
    selectedIds.has(admin.id),
  ).length;
  const pageSelected = admins.length > 0 && selectedCount === admins.length;
  const pagePartial = selectedCount > 0 && selectedCount < admins.length;

  return (
    <div
      className="vx-tenant-directory-list vx-tenant-operation-directory-list vx-platform-user-directory-list"
      role="region"
      aria-label="平台用户清单"
    >
      <div className="vx-tenant-directory-list__header">
        <span>
          <Checkbox
            className="vx-model-select-checkbox"
            checked={
              pageSelected ? true : pagePartial ? "indeterminate" : false
            }
            onCheckedChange={(value) => onTogglePage(value === true)}
            aria-label="选择当前页平台用户"
          />
        </span>
        <span>序号</span>
        <span>用户</span>
        <span>状态</span>
        <span>角色</span>
        <span>最后登录</span>
        <span>联系方式</span>
        <span>操作</span>
      </div>
      {admins.map((admin, index) => {
        const selected = selectedIds.has(admin.id);
        return (
          <div
            key={admin.id}
            className={joinClasses(
              "vx-tenant-directory-row",
              "vx-tenant-operation-row",
              "vx-platform-user-row",
              selected
                ? "vx-tenant-operation-row--selected vx-platform-user-row--selected"
                : "",
            )}
            onClick={(event) => {
              if (
                event.target instanceof HTMLElement &&
                event.target.closest(
                  'button, input, select, textarea, a, [role="button"], [role="menu"], [role="menuitem"]',
                )
              )
                return;
              onToggleSelected(admin.id, !selected);
            }}
          >
            <span className="vx-tenant-operation-row__select vx-platform-user-row__select">
              <Checkbox
                className="vx-model-select-checkbox"
                checked={selected}
                onClick={(event) => event.stopPropagation()}
                onCheckedChange={(value) =>
                  onToggleSelected(admin.id, value === true)
                }
                aria-label={`选择 ${admin.displayName || admin.username}`}
              />
            </span>
            <span className="vx-tenant-directory-row__index">
              {formatNumber(startIndex + index + 1)}
            </span>
            <span className="vx-tenant-directory-row__tenant">
              <Icon name="user" size="sm" fallback="placeholder" />
              <span>
                <span className="vx-tenant-directory-row__title-line">
                  <Button
                    variant="link"
                    className="vx-model-name-button"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {admin.displayName || admin.username}
                  </Button>
                  {admin.isSystem ? (
                    <Badge className="vx-tenant-pill vx-tenant-pill--system">
                      系统
                    </Badge>
                  ) : null}
                </span>
                <small>
                  {admin.username ? `@${admin.username}` : EMPTY_MARK}
                </small>
              </span>
            </span>
            <span className="vx-tenant-directory-row__status">
              <span className="vx-tenant-directory-row__status-line">
                <span
                  className={`vx-tenant-status-dot vx-tenant-status-dot--${platformAdminStatusTone(admin)}`}
                  role="img"
                  aria-label={platformAdminStatusLabel(admin)}
                  title={platformAdminStatusLabel(admin)}
                >
                  <Icon
                    name={platformAdminStatusIcon(admin)}
                    size="xs"
                    fallback="placeholder"
                  />
                </span>
                <Badge
                  className={`vx-tenant-pill ${platformAdminStatusPillClass(admin)}`}
                >
                  {platformAdminStatusLabel(admin)}
                </Badge>
              </span>
            </span>
            <span className="vx-platform-user-row__role">
              <span className="vx-platform-user-row__role-line">
                <strong>{platformRoleDisplayName(admin, t)}</strong>
                <Badge
                  className={`vx-tenant-pill ${platformRoleStatusPillClass(admin)}`}
                >
                  {platformRoleStatusLabel(admin)}
                </Badge>
              </span>
            </span>
            <span className="vx-platform-user-row__login">
              <strong>
                {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : EMPTY_MARK}
              </strong>
              <small>{admin.lastLoginIp || EMPTY_MARK}</small>
            </span>
            <span className="vx-platform-user-row__contact">
              <strong>{admin.email || EMPTY_MARK}</strong>
              <small>{admin.phone || EMPTY_MARK}</small>
            </span>
            <PlatformUserActionsMenu
              admin={admin}
              onView={onView}
              onChangeRole={onChangeRole}
              onEditMetadata={onEditMetadata}
              onToggleStatus={onToggleStatus}
              onForceLogout={onForceLogout}
              onResetMfa={onResetMfa}
              onResetPassword={onResetPassword}
            />
          </div>
        );
      })}
    </div>
  );
}

function PlatformUsersCards({
  admins,
  t,
}: {
  admins: PlatformAdminRecord[];
  t: ReturnType<typeof useConsoleTranslations>;
}) {
  return (
    <div className="vx-tenant-directory-cards" aria-label="平台用户卡片">
      {admins.map((admin) => (
        <article key={admin.id} className="vx-tenant-directory-card">
          <header>
            <Icon name="user" size="lg" fallback="placeholder" />
            <div>
              <strong>{admin.displayName || admin.username}</strong>
              <span>{admin.username ? `@${admin.username}` : EMPTY_MARK}</span>
            </div>
            <Badge
              className={`vx-tenant-pill ${platformAdminStatusPillClass(admin)}`}
            >
              {platformAdminStatusLabel(admin)}
            </Badge>
          </header>
          <div className="vx-tenant-directory-card__badges">
            <Badge className="vx-tenant-pill vx-account-muted-pill vx-tenant-pill--permission">
              {platformRoleDisplayName(admin, t)}
            </Badge>
            <Badge
              className={`vx-tenant-pill ${platformRoleStatusPillClass(admin)}`}
            >
              {platformRoleStatusLabel(admin)}
            </Badge>
            {admin.isSystem ? (
              <Badge className="vx-tenant-pill vx-tenant-pill--system">
                系统
              </Badge>
            ) : null}
          </div>
          <div className="vx-tenant-directory-card__metrics">
            <span>
              <b>
                {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : EMPTY_MARK}
              </b>
              <small>最后登录</small>
            </span>
            <span>
              <b>{admin.lastLoginIp || EMPTY_MARK}</b>
              <small>登录 IP</small>
            </span>
            <span>
              <b>{admin.email || admin.phone || EMPTY_MARK}</b>
              <small>联系方式</small>
            </span>
          </div>
          <footer>
            <span>{admin.remark || EMPTY_MARK}</span>
            <strong>{admin.phone || EMPTY_MARK}</strong>
          </footer>
        </article>
      ))}
    </div>
  );
}

interface MetadataFormState {
  displayName: string;
  email: string;
  phone: string;
  remark: string;
  sort: string;
}

function parseSort(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function PlatformUserDetailDialog({
  admin,
  roleLabel,
  onClose,
}: {
  admin: PlatformAdminRecord;
  roleLabel: string;
  onClose: () => void;
}) {
  return (
    <DialogForm
      open
      title={admin.displayName || admin.username}
      description={admin.username ? `@${admin.username}` : undefined}
      footer={
        <Button variant="outline" onClick={onClose}>
          关闭
        </Button>
      }
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <dl className="vx-admin-permission-detail-dialog__grid">
        <div>
          <dt>显示名</dt>
          <dd>{admin.displayName || EMPTY_MARK}</dd>
        </div>
        <div>
          <dt>用户名</dt>
          <dd>{admin.username || EMPTY_MARK}</dd>
        </div>
        <div>
          <dt>角色</dt>
          <dd>{roleLabel}</dd>
        </div>
        <div>
          <dt>状态</dt>
          <dd>{platformAdminStatusLabel(admin)}</dd>
        </div>
        <div>
          <dt>邮箱</dt>
          <dd>{admin.email || EMPTY_MARK}</dd>
        </div>
        <div>
          <dt>手机</dt>
          <dd>{admin.phone || EMPTY_MARK}</dd>
        </div>
        <div>
          <dt>最后登录</dt>
          <dd>
            {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : EMPTY_MARK}
          </dd>
        </div>
        <div>
          <dt>登录 IP</dt>
          <dd>{admin.lastLoginIp || EMPTY_MARK}</dd>
        </div>
        <div>
          <dt>排序</dt>
          <dd>{formatNumber(admin.sort)}</dd>
        </div>
        <div>
          <dt>创建时间</dt>
          <dd>{admin.createdAt ? formatDate(admin.createdAt) : EMPTY_MARK}</dd>
        </div>
        <div className="vx-admin-permission-detail-dialog__wide">
          <dt>备注</dt>
          <dd>{admin.remark || EMPTY_MARK}</dd>
        </div>
      </dl>
    </DialogForm>
  );
}

function PlatformUserRoleDialog({
  admin,
  roles,
  value,
  submitting,
  onChange,
  onClose,
  onSubmit,
}: {
  admin: PlatformAdminRecord;
  roles: PlatformRoleRecord[];
  value: string;
  submitting: boolean;
  onChange: (roleId: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <DialogForm
      open
      title="调整角色"
      description={`为 ${admin.displayName || admin.username} 分配平台角色。`}
      submitLabel="保存角色"
      submitting={submitting}
      submitDisabled={!value || value === admin.roleId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onSubmit={onSubmit}
    >
      <Label>
        平台角色
        <NativeSelect
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {roles.length === 0 ? (
            <option value="">未加载到可用角色</option>
          ) : null}
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.nameEn || role.roleCode}
            </option>
          ))}
        </NativeSelect>
      </Label>
    </DialogForm>
  );
}

interface CreateAdminFormState {
  username: string;
  displayName: string;
  email: string;
  phone: string;
  roleId: string;
}

function PlatformUserCreateDialog({
  roles,
  form,
  submitting,
  onChange,
  onClose,
  onSubmit,
}: {
  roles: PlatformRoleRecord[];
  form: CreateAdminFormState;
  submitting: boolean;
  onChange: (patch: Partial<CreateAdminFormState>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const canSubmit =
    form.username.trim() &&
    form.displayName.trim() &&
    form.email.trim() &&
    form.roleId;
  return (
    <DialogForm
      open
      title="新建运营用户"
      description="创建后系统会向该邮箱发送初始设置密码邮件，运营方不接触明文密码或链接。"
      submitLabel="创建"
      submitting={submitting}
      submitDisabled={!canSubmit}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
      onSubmit={onSubmit}
    >
      <Label>
        用户名
        <Input
          value={form.username}
          onChange={(e) => onChange({ username: e.target.value })}
          autoComplete="off"
        />
      </Label>
      <Label>
        显示名
        <Input
          value={form.displayName}
          onChange={(e) => onChange({ displayName: e.target.value })}
        />
      </Label>
      <Label>
        邮箱（初始设置密码邮件将发送至此）
        <Input
          type="email"
          value={form.email}
          onChange={(e) => onChange({ email: e.target.value })}
          autoComplete="off"
        />
      </Label>
      <Label>
        手机号（可选）
        <Input
          value={form.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          autoComplete="off"
        />
      </Label>
      <Label>
        平台角色
        <NativeSelect
          value={form.roleId}
          onChange={(e) => onChange({ roleId: e.target.value })}
        >
          <option value="">选择角色</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.nameEn || role.roleCode}
            </option>
          ))}
        </NativeSelect>
      </Label>
    </DialogForm>
  );
}

function PlatformUserMetadataDialog({
  admin,
  form,
  submitting,
  onChange,
  onClose,
  onSubmit,
}: {
  admin: PlatformAdminRecord;
  form: MetadataFormState;
  submitting: boolean;
  onChange: (patch: Partial<MetadataFormState>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <DialogForm
      open
      title="编辑资料"
      description={`维护 ${admin.displayName || admin.username} 的展示信息与联系方式。`}
      submitLabel="保存资料"
      submitting={submitting}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onSubmit={onSubmit}
    >
      <div className="vx-model-dialog__grid">
        <Label>
          显示名
          <Input
            value={form.displayName}
            maxLength={128}
            onChange={(event) => onChange({ displayName: event.target.value })}
            placeholder="显示名"
          />
        </Label>
        <Label>
          排序
          <Input
            type="number"
            value={form.sort}
            onChange={(event) => onChange({ sort: event.target.value })}
            placeholder="排序值"
          />
        </Label>
      </div>
      <div className="vx-model-dialog__grid">
        <Label>
          邮箱
          <Input
            type="email"
            value={form.email}
            onChange={(event) => onChange({ email: event.target.value })}
            placeholder="邮箱地址"
          />
        </Label>
        <Label>
          手机
          <Input
            value={form.phone}
            onChange={(event) => onChange({ phone: event.target.value })}
            placeholder="手机号"
          />
        </Label>
      </div>
      <Label>
        备注
        <Textarea
          value={form.remark}
          onChange={(event) => onChange({ remark: event.target.value })}
          placeholder="内部备注"
          rows={3}
        />
      </Label>
    </DialogForm>
  );
}

function PlatformUserPagination({
  currentPage,
  pageCount,
  total,
  pageSize,
  onPageSizeChange,
  onPageChange,
}: {
  currentPage: number;
  pageCount: number;
  total: number;
  pageSize: PageSize;
  onPageSizeChange: (value: PageSize) => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <footer className="vx-tenant-pagination">
      <span className="vx-tenant-pagination__total">
        共 {formatNumber(total)} 条记录
      </span>
      <div className="vx-tenant-pagination__actions">
        <AdminPageSizePicker value={pageSize} onChange={onPageSizeChange} />
        <Pagination
          className="vx-tenant-pagination__pager"
          page={currentPage}
          pageCount={pageCount}
          onPageChange={onPageChange}
        />
      </div>
    </footer>
  );
}

export function PlatformUsersPage() {
  const t = useConsoleTranslations();
  const { toast } = useToast();
  const { runWithStepUp } = useStepUp();
  const [resetInfo, setResetInfo] = useState<{
    deliveredTo: string;
    minutes: number;
  } | null>(null);
  const [admins, setAdmins] = useState<PlatformAdminRecord[]>([]);
  const [roles, setRoles] = useState<PlatformRoleRecord[]>([]);
  const [actorRank, setActorRank] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<UserTypeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailAdminId, setDetailAdminId] = useState<string | null>(null);
  const [roleAdminId, setRoleAdminId] = useState<string | null>(null);
  const [roleValue, setRoleValue] = useState("");
  const [metadataAdminId, setMetadataAdminId] = useState<string | null>(null);
  const [metadataForm, setMetadataForm] = useState<MetadataFormState>({
    displayName: "",
    email: "",
    phone: "",
    remark: "",
    sort: "",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdminFormState>({
    username: "",
    displayName: "",
    email: "",
    phone: "",
    roleId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    fetchPlatformAdmins()
      .then((records) => {
        if (active) setAdmins(records);
      })
      .catch((error) => {
        if (active)
          setLoadError(
            error instanceof Error ? error.message : "平台用户数据库读取失败",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchPlatformRoles()
      .then((records) => {
        if (active) setRoles(records);
      })
      .catch(() => {
        // 角色下拉为可选增强，读取失败时保持空列表，不阻塞用户列表。
      });
    // TD-017：取当前操作者 rank，用于角色下拉过滤（只可授予低于自身层级的角色）。
    fetchCurrentUser()
      .then((user) => {
        if (active) setActorRank(user?.roleRank ?? null);
      })
      .catch(() => {
        // rank 读取失败时不过滤（后端双 rank 门控仍会拒绝越级授予）。
      });
    return () => {
      active = false;
    };
  }, []);

  // 可授予角色 = rank 严格低于自身（TD-017 双 rank 门控的显示层一致性）。
  const assignableRoles =
    actorRank == null ? roles : roles.filter((role) => role.rank < actorRank);

  function reportError(fallbackTitle: string, error: unknown) {
    if (isStepUpCancelled(error)) return;
    if (isStepUpRequiredError(error)) {
      toast({
        tone: "warning",
        title: "需二次验证",
        description: "二次验证未完成或已过期，请重试该操作。",
      });
      return;
    }
    toast({
      tone: "error",
      title: fallbackTitle,
      ...(error instanceof Error && error.message
        ? { description: error.message }
        : {}),
    });
  }

  const filteredAdmins = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return admins.filter((admin) => {
      if (
        statusFilter !== "all" &&
        platformAdminStatusCode(admin) !== statusFilter
      )
        return false;
      if (typeFilter === "system" && !admin.isSystem) return false;
      if (typeFilter === "normal" && admin.isSystem) return false;
      if (
        normalizedQuery &&
        !platformAdminSearchText(admin).includes(normalizedQuery)
      )
        return false;
      return true;
    });
  }, [admins, query, statusFilter, typeFilter]);

  const enabledCount = admins.filter(
    (admin) => platformAdminStatusCode(admin) === "active",
  ).length;
  const systemCount = admins.filter((admin) => admin.isSystem).length;
  const disabledCount = admins.filter(
    (admin) => platformAdminStatusCode(admin) === "disabled",
  ).length;
  const lockedCount = admins.filter(
    (admin) => platformAdminStatusCode(admin) === "locked",
  ).length;
  const pendingCount = admins.filter(
    (admin) => platformAdminStatusCode(admin) === "pending",
  ).length;
  const suspendedCount = admins.filter(
    (admin) => platformAdminStatusCode(admin) === "suspended",
  ).length;
  const otherUserCount =
    disabledCount + lockedCount + pendingCount + suspendedCount;
  const pageCount = Math.max(1, Math.ceil(filteredAdmins.length / pageSize));
  const clampedCurrentPage = Math.min(currentPage, pageCount);
  const visibleAdmins = filteredAdmins.slice(
    (clampedCurrentPage - 1) * pageSize,
    clampedCurrentPage * pageSize,
  );

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function togglePage(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleAdmins.forEach((admin) => {
        if (checked) next.add(admin.id);
        else next.delete(admin.id);
      });
      return next;
    });
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, query, statusFilter, typeFilter, viewMode]);

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
  }

  const detailAdmin = detailAdminId
    ? (admins.find((admin) => admin.id === detailAdminId) ?? null)
    : null;
  const roleAdmin = roleAdminId
    ? (admins.find((admin) => admin.id === roleAdminId) ?? null)
    : null;
  const metadataAdmin = metadataAdminId
    ? (admins.find((admin) => admin.id === metadataAdminId) ?? null)
    : null;

  function openRoleDialog(admin: PlatformAdminRecord) {
    setRoleValue(admin.roleId);
    setRoleAdminId(admin.id);
  }

  function openCreateDialog() {
    setCreateForm({
      username: "",
      displayName: "",
      email: "",
      phone: "",
      roleId: "",
    });
    setCreateOpen(true);
  }

  function openMetadataDialog(admin: PlatformAdminRecord) {
    setMetadataForm({
      displayName: admin.displayName ?? "",
      email: admin.email ?? "",
      phone: admin.phone ?? "",
      remark: admin.remark ?? "",
      sort: String(admin.sort ?? ""),
    });
    setMetadataAdminId(admin.id);
  }

  async function submitRoleChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roleAdmin || !roleValue || roleValue === roleAdmin.roleId) return;
    setSubmitting(true);
    try {
      const updated = await runWithStepUp(() =>
        changePlatformAdminRole(roleAdmin.id, roleValue),
      );
      setAdmins((current) =>
        current.map((admin) => (admin.id === updated.id ? updated : admin)),
      );
      setRoleAdminId(null);
      toast({ tone: "success", title: "已调整角色" });
    } catch (error) {
      reportError("角色调整失败", error);
    } finally {
      setSubmitting(false);
    }
  }

  // B9-P1b-α：停用/启用经 IdP 委托（停用即吊销全部会话），返回刷新后的记录就地更新。
  async function handleToggleStatus(admin: PlatformAdminRecord) {
    const disabling = platformAdminStatusCode(admin) === "active";
    try {
      const updated = await runWithStepUp(() =>
        disabling
          ? disablePlatformAdmin(admin.id)
          : enablePlatformAdmin(admin.id),
      );
      setAdmins((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      );
      toast({
        tone: "success",
        title: disabling ? "已停用用户" : "已启用用户",
      });
    } catch (error) {
      reportError(disabling ? "停用用户失败" : "启用用户失败", error);
    }
  }

  async function handleForceLogout(admin: PlatformAdminRecord) {
    try {
      const result = await runWithStepUp(() =>
        forcePlatformAdminLogout(admin.id),
      );
      toast({
        tone: "success",
        title: "已强制下线",
        description: `已吊销 ${result.revoked} 个会话。`,
      });
    } catch (error) {
      reportError("强制下线失败", error);
    }
  }

  async function handleResetMfa(admin: PlatformAdminRecord) {
    try {
      const result = await runWithStepUp(() => resetPlatformAdminMfa(admin.id));
      toast({
        tone: "success",
        title: "已重置 MFA",
        description: `已清除第二因子并吊销 ${result.revoked} 个会话，用户下次登录需重新登记。`,
      });
    } catch (error) {
      reportError("重置 MFA 失败", error);
    }
  }

  async function handleResetPassword(admin: PlatformAdminRecord) {
    try {
      const result = await runWithStepUp(() =>
        resetPlatformAdminPassword(admin.id),
      );
      setResetInfo({
        deliveredTo: result.deliveredTo,
        minutes: Math.max(1, Math.round(result.expiresIn / 60)),
      });
    } catch (error) {
      reportError("发送重置邮件失败", error);
    }
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = createForm.username.trim();
    const displayName = createForm.displayName.trim();
    const email = createForm.email.trim();
    const phone = createForm.phone.trim();
    const roleId = createForm.roleId;
    if (!username || !displayName || !email || !roleId) return;
    setSubmitting(true);
    try {
      const result = await runWithStepUp(() =>
        createPlatformAdmin({
          username,
          displayName,
          email,
          ...(phone ? { phone } : {}),
          roleId,
        }),
      );
      setAdmins((current) => [...current, result.record]);
      setCreateOpen(false);
      toast({
        tone: "success",
        title: "已创建用户",
        description: `初始设置密码邮件已发送至 ${result.deliveredTo}。`,
      });
    } catch (error) {
      reportError("创建用户失败", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!metadataAdmin) return;
    const displayName = metadataForm.displayName.trim();
    const email = metadataForm.email.trim();
    const phone = metadataForm.phone.trim();
    const remark = metadataForm.remark.trim();
    const sort = parseSort(metadataForm.sort);
    const payload: PlatformAdminMetadataInput = {
      ...(displayName ? { displayName } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(remark ? { remark } : {}),
      ...(sort !== undefined ? { sort } : {}),
    };
    setSubmitting(true);
    try {
      const updated = await runWithStepUp(() =>
        updatePlatformAdmin(metadataAdmin.id, payload),
      );
      setAdmins((current) =>
        current.map((admin) => (admin.id === updated.id ? updated : admin)),
      );
      setMetadataAdminId(null);
      toast({ tone: "success", title: "资料已更新" });
    } catch (error) {
      reportError("资料更新失败", error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="vx-page-stack vx-tenant-management-page vx-platform-users-page">
      <PageHeader
        icon="user"
        eyebrow="身份权限"
        title="平台用户"
        description="管理平台内部管理员、运营人员和运维人员；平台用户不归属于任何租户。"
      />

      <section
        className="vx-tenant-summary vx-platform-users-summary"
        aria-label="平台用户统计"
      >
        <article className="vx-tenant-summary__item vx-tenant-summary__item--identity-icon vx-tenant-tone--blue">
          <Icon name="user" size="lg" fallback="placeholder" />
          <div>
            <span>用户总数</span>
            <p>
              <strong>{formatNumber(admins.length)}</strong>
              <em>系统用户 {formatNumber(systemCount)}人</em>
            </p>
          </div>
        </article>
        <article className="vx-tenant-summary__item vx-tenant-tone--green">
          <Icon name="check" size="lg" fallback="placeholder" />
          <div>
            <span>启用用户</span>
            <p>
              <strong>{formatNumber(enabledCount)}</strong>
              <em>可登录</em>
            </p>
          </div>
        </article>
        <article className="vx-tenant-summary__item vx-tenant-tone--rose">
          <Icon name="x" size="lg" fallback="placeholder" />
          <div>
            <span>其他用户</span>
            <p>
              <strong>{formatNumber(otherUserCount)}</strong>
              {disabledCount ? (
                <em>停用 {formatNumber(disabledCount)}</em>
              ) : null}
              {lockedCount ? <em>锁定 {formatNumber(lockedCount)}</em> : null}
              {pendingCount ? (
                <em>待激活 {formatNumber(pendingCount)}</em>
              ) : null}
              {suspendedCount ? (
                <em>暂停 {formatNumber(suspendedCount)}</em>
              ) : null}
            </p>
          </div>
        </article>
      </section>

      <div className="vx-tenant-list-shell">
        <section className="vx-tenant-toolbar" aria-label="平台用户筛选">
          <ViewModeSwitch
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="平台用户展示方式"
          />
          <span className="vx-tenant-view-count">
            {formatNumber(filteredAdmins.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索用户名、显示名、邮箱、手机、角色"
            className="vx-tenant-search"
            aria-label="搜索平台用户"
          />
          <Button variant="outline" onClick={resetFilters}>
            重置
          </Button>
          <div className="vx-tenant-filters">
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              aria-label="用户状态"
            >
              <option value="all">全部状态</option>
              <option value="active">启用</option>
              <option value="disabled">停用</option>
              <option value="locked">锁定</option>
              <option value="pending">待激活</option>
              <option value="suspended">暂停</option>
            </NativeSelect>
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as UserTypeFilter)
              }
              aria-label="用户类型"
            >
              <option value="all">全部类型</option>
              <option value="system">系统用户</option>
              <option value="normal">普通用户</option>
            </NativeSelect>
          </div>
          {/* TD-017 §③⑤：create-operator 已随分级模型整改启用——初始设置密码链接
              带外投递至新用户本人邮箱，不回传发起方。见 docs/tech-debt.md。 */}
          <ActionButton
            variant="outline"
            icon="plus"
            onClick={openCreateDialog}
          >
            新建用户
          </ActionButton>
        </section>

        <section className="vx-tenant-directory" aria-label="平台用户清单">
          {loading ? (
            <header className="vx-tenant-directory__header">
              <span>读取中</span>
            </header>
          ) : null}

          {filteredAdmins.length ? (
            viewMode === "list" ? (
              <PlatformUsersList
                admins={visibleAdmins}
                startIndex={(clampedCurrentPage - 1) * pageSize}
                selectedIds={selectedIds}
                onToggleSelected={toggleSelected}
                onTogglePage={togglePage}
                onView={(admin) => setDetailAdminId(admin.id)}
                onChangeRole={openRoleDialog}
                onEditMetadata={openMetadataDialog}
                onToggleStatus={handleToggleStatus}
                onForceLogout={handleForceLogout}
                onResetMfa={handleResetMfa}
                onResetPassword={handleResetPassword}
                t={t}
              />
            ) : (
              <PlatformUsersCards admins={visibleAdmins} t={t} />
            )
          ) : (
            <section className="vx-tenant-empty">
              <EmptyState
                title={
                  loading
                    ? "正在加载平台用户"
                    : loadError
                      ? "平台用户读取失败"
                      : "没有匹配的平台用户"
                }
                description={
                  loading
                    ? "正在读取平台用户账号。"
                    : (loadError ?? "清空筛选条件后可查看全部平台用户。")
                }
                action={
                  <ActionButton
                    variant="outline"
                    icon="x"
                    onClick={resetFilters}
                  >
                    清空筛选
                  </ActionButton>
                }
              />
            </section>
          )}

          <PlatformUserPagination
            currentPage={clampedCurrentPage}
            pageCount={pageCount}
            total={filteredAdmins.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onPageChange={(page) =>
              setCurrentPage(Math.min(Math.max(page, 1), pageCount))
            }
          />
        </section>
      </div>
      {detailAdmin ? (
        <PlatformUserDetailDialog
          admin={detailAdmin}
          roleLabel={platformRoleDisplayName(detailAdmin, t)}
          onClose={() => setDetailAdminId(null)}
        />
      ) : null}
      {createOpen ? (
        <PlatformUserCreateDialog
          roles={assignableRoles}
          form={createForm}
          submitting={submitting}
          onChange={(patch) =>
            setCreateForm((current) => ({ ...current, ...patch }))
          }
          onClose={() => setCreateOpen(false)}
          onSubmit={(event) => void submitCreate(event)}
        />
      ) : null}
      {roleAdmin ? (
        <PlatformUserRoleDialog
          admin={roleAdmin}
          roles={assignableRoles}
          value={roleValue}
          submitting={submitting}
          onChange={setRoleValue}
          onClose={() => {
            if (!submitting) setRoleAdminId(null);
          }}
          onSubmit={(event) => void submitRoleChange(event)}
        />
      ) : null}
      {metadataAdmin ? (
        <PlatformUserMetadataDialog
          admin={metadataAdmin}
          form={metadataForm}
          submitting={submitting}
          onChange={(patch) =>
            setMetadataForm((current) => ({ ...current, ...patch }))
          }
          onClose={() => {
            if (!submitting) setMetadataAdminId(null);
          }}
          onSubmit={(event) => void submitMetadata(event)}
        />
      ) : null}
      {resetInfo ? (
        <DialogForm
          open
          title="重置链接已发送"
          // TD-017 带外投递：链接只发给目标本人邮箱，发起方不接触链接/明文。
          description={`一次性重置链接已发送至 ${resetInfo.deliveredTo}（${resetInfo.minutes} 分钟内有效，用后失效）。用户点击邮件内链接自行设置新密码；该用户会话已被吊销。`}
          submitLabel="知道了"
          onOpenChange={(open) => {
            if (!open) setResetInfo(null);
          }}
          onSubmit={(event) => {
            event.preventDefault();
            setResetInfo(null);
          }}
        />
      ) : null}
    </div>
  );
}
