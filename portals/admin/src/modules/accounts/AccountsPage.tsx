"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Banner,
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
  ActionButton,
  EmptyState,
  Textarea,
  ViewModeSwitch,
  useToast,
} from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import {
  disableAccount,
  enableAccount,
  fetchAccountOperations,
  forceLogoutAccount,
} from "@/api/admin-bff";
import type { AccountOperationRecord } from "@/entities/console";
import { isListTruncated } from "@/lib/list-truncation";
import { PageHeader } from "@/modules/shared/PageHeader";
import {
  PageSizePicker as AdminPageSizePicker,
  type PageSize,
} from "@/modules/shared/PageSizePicker";
import {
  formatDate,
  formatNumber,
  joinClasses,
} from "@/modules/tenants/tenant-utils";

type ViewMode = "list" | "cards";
type StatusFilter = "all" | AccountOperationRecord["status"];
type TenantTypeFilter = "all" | "company" | "individual" | "mixed";
type RoleFilter = "all" | "owner" | "admin" | "member";
type AccountsPageCopy = {
  eyebrow: string;
  title: string;
  description: string;
  summaryAriaLabel: string;
  toolbarAriaLabel: string;
  directoryAriaLabel: string;
  searchPlaceholder: string;
  searchAriaLabel: string;
  statusAriaLabel: string;
  tenantTypeAriaLabel: string;
  roleAriaLabel: string;
  createActionLabel: string;
  loadingTitle: string;
  loadingDescription: string;
  emptyTitle: string;
  emptyDescription: string;
};

type AccountStatusIndicatorTone =
  | "normal"
  | "progress"
  | "attention"
  | "closed";

const defaultAccountsPageCopy: AccountsPageCopy = {
  eyebrow: "租户账号",
  title: "账号体系",
  description:
    "平台运营侧跨租户检索账号、识别安全状态、处理账号启停与登录问题。",
  summaryAriaLabel: "账号运营统计",
  toolbarAriaLabel: "账号筛选",
  directoryAriaLabel: "账号清单",
  searchPlaceholder: "搜索账号、邮箱、租户、权限",
  searchAriaLabel: "搜索账号",
  statusAriaLabel: "账号状态",
  tenantTypeAriaLabel: "租户类型",
  roleAriaLabel: "权限类型",
  createActionLabel: "新建账号",
  loadingTitle: "正在加载账号",
  loadingDescription: "正在读取平台账号运营数据。",
  emptyTitle: "没有匹配的账号",
  emptyDescription: "清空筛选条件后可查看全部账号。",
};

function roleGroup(role: string): Exclude<RoleFilter, "all"> {
  const normalized = role.toLowerCase();
  if (normalized.includes("owner")) return "owner";
  if (normalized.includes("admin")) return "admin";
  return "member";
}

function accountRoleGroup(
  account: AccountOperationRecord,
): Exclude<RoleFilter, "all"> {
  const groups = account.tenantBindings.map((tenant) => roleGroup(tenant.role));
  if (groups.includes("owner")) return "owner";
  if (groups.includes("admin")) return "admin";
  return roleGroup(account.role);
}

function accountHighestRole(account: AccountOperationRecord) {
  const owner = account.tenantBindings.find(
    (tenant) => roleGroup(tenant.role) === "owner",
  );
  if (owner) return owner.role;

  const admin = account.tenantBindings.find(
    (tenant) => roleGroup(tenant.role) === "admin",
  );
  if (admin) return admin.role;

  return account.role;
}

function accountHighestRoleLabel(account: AccountOperationRecord) {
  const role = accountHighestRole(account);
  const normalized = role.toLowerCase();
  if (normalized.includes("owner")) return "owner";
  if (normalized.includes("admin")) return "admin";
  return role;
}

function accountTenantSummary(account: AccountOperationRecord) {
  const personalCount = account.tenantBindings.filter(
    (tenant) => tenant.tenantType === "individual",
  ).length;
  const companyCount = account.tenantBindings.filter(
    (tenant) => tenant.tenantType === "company",
  ).length;
  const tags = [
    personalCount > 0 ? "个人" : null,
    companyCount === 1
      ? "组织"
      : companyCount > 1
        ? `组织 ${formatNumber(companyCount)}`
        : null,
  ].filter(Boolean) as string[];
  const primary =
    account.tenantBindings.find((tenant) => tenant.isPrimaryOwner) ??
    account.tenantBindings[0];

  return {
    tags: tags.length ? tags : ["未归属"],
    primaryName: primary?.tenantName ?? account.primaryTenantName,
    personalCount,
    companyCount,
  };
}

function accountMatchesTenantType(
  account: AccountOperationRecord,
  filter: TenantTypeFilter,
) {
  if (filter === "all") return true;
  const summary = accountTenantSummary(account);
  if (filter === "mixed")
    return summary.personalCount > 0 && summary.companyCount > 0;
  return account.tenantBindings.some((tenant) => tenant.tenantType === filter);
}

function accountStatusLabel(status: AccountOperationRecord["status"]) {
  if (status === "active") return "正常";
  if (status === "invited") return "待激活";
  if (status === "locked") return "已锁定";
  return "已停用";
}

function accountStatusPillClass(status: AccountOperationRecord["status"]) {
  return `vx-tenant-pill vx-tenant-pill--${status} vx-account-status-pill--${status}`;
}

function accountStatusIndicator(account: AccountOperationRecord): {
  tone: AccountStatusIndicatorTone;
  label: string;
  icon: IconName;
} {
  if (account.status === "disabled") {
    return { tone: "closed", label: "已停用", icon: "x" };
  }

  if (account.status === "locked") {
    return { tone: "attention", label: "已锁定", icon: "warning" };
  }

  if (account.status === "invited") {
    return { tone: "progress", label: "待激活", icon: "clock" };
  }

  return { tone: "normal", label: "正常", icon: "check" };
}

function accountSearchText(account: AccountOperationRecord) {
  return [
    account.id,
    account.accountCode,
    account.displayName,
    account.email,
    account.phone,
    account.status,
    account.role,
    account.primaryTenantCode,
    account.primaryTenantName,
    account.lastActiveLocation,
    ...account.tenantBindings.map(
      (tenant) => `${tenant.tenantCode} ${tenant.tenantName} ${tenant.role}`,
    ),
  ]
    .join(" ")
    .toLowerCase();
}

function AccountSummaryItem({
  icon,
  label,
  value,
  tags,
  tone = "blue",
}: {
  icon: IconName;
  label: string;
  value: string;
  tags?: string[];
  tone?: "blue" | "green" | "amber" | "rose";
}) {
  return (
    <article
      className={joinClasses(
        `vx-tenant-summary__item vx-tenant-tone--${tone}`,
        icon === "user" || icon === "role"
          ? "vx-tenant-summary__item--identity-icon"
          : "",
      )}
    >
      <Icon name={icon} size="lg" fallback="placeholder" />
      <div>
        <span>{label}</span>
        <p>
          <strong>{value}</strong>
          {tags?.map((tag) => (
            <em key={tag}>{tag}</em>
          ))}
        </p>
      </div>
    </article>
  );
}

function AccountActionsMenu({
  account,
  busy,
  onToggleStatus,
  onForceLogout,
}: {
  account: AccountOperationRecord;
  busy: boolean;
  onToggleStatus: (account: AccountOperationRecord) => void;
  onForceLogout: (account: AccountOperationRecord) => void;
}) {
  const isDisabled = account.status === "disabled";
  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${account.displayName} 操作`}
        triggerClassName="vx-tenant-actions__trigger"
        triggerProps={{ title: "操作", disabled: busy }}
        items={[
          {
            id: "details",
            label: "查看详情",
            icon: <Icon name="arrow-right" size="xs" fallback="placeholder" />,
            disabled: true,
          },
          {
            id: "reset-password",
            label: "重置密码",
            icon: <Icon name="key" size="xs" fallback="placeholder" />,
            // 凭据重置对 C 端用户（可能社交-only/无验证邮箱）需专用设计，C12 延后。
            disabled: true,
          },
          {
            id: "force-logout",
            label: "强制下线",
            icon: <Icon name="sign-out" size="xs" fallback="placeholder" />,
            disabled: busy || isDisabled,
            onSelect: () => onForceLogout(account),
          },
          {
            id: "toggle-status",
            label: isDisabled ? "恢复账号" : "停用账号",
            icon: (
              <Icon
                name={isDisabled ? "success" : "warning"}
                size="xs"
                fallback="placeholder"
              />
            ),
            disabled: busy,
            onSelect: () => onToggleStatus(account),
          },
        ]}
      />
    </div>
  );
}

interface AccountRowActions {
  actionBusy: boolean;
  onToggleStatus: (account: AccountOperationRecord) => void;
  onForceLogout: (account: AccountOperationRecord) => void;
}

function AccountListRows({
  accounts,
  startIndex,
  selectedAccountIds,
  isPageSelected,
  showTenantContext,
  onToggleAccount,
  onTogglePage,
  actions,
}: {
  accounts: AccountOperationRecord[];
  startIndex: number;
  selectedAccountIds: Set<string>;
  isPageSelected: boolean;
  showTenantContext: boolean;
  onToggleAccount: (accountId: string, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
  actions: AccountRowActions;
}) {
  const selectedOnPage = accounts.filter((account) =>
    selectedAccountIds.has(account.id),
  ).length;
  const isPagePartiallySelected =
    selectedOnPage > 0 && selectedOnPage < accounts.length;

  return (
    <div
      className={joinClasses(
        "vx-tenant-directory-list vx-account-directory-list",
        !showTenantContext ? "vx-account-directory-list--platform" : "",
      )}
      role="region"
      aria-label="账号清单"
    >
      <div className="vx-tenant-directory-list__header">
        <span>
          <Checkbox
            className="vx-model-select-checkbox"
            checked={
              isPageSelected
                ? true
                : isPagePartiallySelected
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(value) => onTogglePage(value === true)}
            aria-label="选择当前页账号"
          />
        </span>
        <span>序号</span>
        <span>账号</span>
        {showTenantContext ? <span>租户</span> : null}
        <span>状态</span>
        <span>权限</span>
        <span>登录</span>
        <span>操作</span>
      </div>
      {accounts.map((account, index) => {
        const indicator = accountStatusIndicator(account);
        const tenantSummary = accountTenantSummary(account);

        return (
          <div
            key={account.id}
            className={joinClasses(
              "vx-tenant-directory-row",
              "vx-account-operation-row",
              selectedAccountIds.has(account.id)
                ? "vx-account-operation-row--selected"
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
              onToggleAccount(account.id, !selectedAccountIds.has(account.id));
            }}
          >
            <span className="vx-account-operation-row__select">
              <Checkbox
                className="vx-model-select-checkbox"
                checked={selectedAccountIds.has(account.id)}
                onClick={(event) => event.stopPropagation()}
                onCheckedChange={(value) =>
                  onToggleAccount(account.id, value === true)
                }
                aria-label={`选择 ${account.displayName}`}
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
                    {account.displayName}
                  </Button>
                </span>
                <small>
                  {account.accountCode} · {account.email}
                </small>
              </span>
            </span>
            {showTenantContext ? (
              <span className="vx-tenant-directory-row__subscription">
                <span className="vx-tenant-directory-row__tag-line">
                  {tenantSummary.tags.map((tag) => (
                    <Badge
                      key={tag}
                      className="vx-tenant-pill vx-account-muted-pill"
                    >
                      {tag}
                    </Badge>
                  ))}
                </span>
                <small>{tenantSummary.primaryName}</small>
              </span>
            ) : null}
            <span className="vx-tenant-directory-row__status">
              <span className="vx-tenant-directory-row__status-line">
                <span
                  className={`vx-tenant-status-dot vx-tenant-status-dot--${indicator.tone}`}
                  role="img"
                  aria-label={indicator.label}
                  title={indicator.label}
                >
                  <Icon
                    name={indicator.icon}
                    size="xs"
                    fallback="placeholder"
                  />
                </span>
                <span className="vx-tenant-directory-row__badges">
                  <Badge className={accountStatusPillClass(account.status)}>
                    {accountStatusLabel(account.status)}
                  </Badge>
                </span>
              </span>
            </span>
            <span className="vx-tenant-directory-row__subscription">
              <span className="vx-tenant-directory-row__tag-line">
                <Badge className="vx-tenant-pill vx-account-muted-pill vx-tenant-pill--permission">
                  {accountHighestRoleLabel(account)}
                </Badge>
              </span>
              <small>
                {showTenantContext
                  ? `${formatNumber(account.tenantCount)} 个租户`
                  : "平台角色"}
              </small>
            </span>
            <span className="vx-tenant-directory-row__service">
              <span className="vx-tenant-directory-row__tag-line">
                <Badge className="vx-tenant-pill vx-account-muted-pill vx-tenant-pill--product">
                  {account.lastActiveLocation}
                </Badge>
              </span>
              <small>
                {formatDate(account.lastActiveAt)} ·{" "}
                {formatNumber(account.loginCount30d)} 次
              </small>
            </span>
            <AccountActionsMenu
              account={account}
              busy={actions.actionBusy}
              onToggleStatus={actions.onToggleStatus}
              onForceLogout={actions.onForceLogout}
            />
          </div>
        );
      })}
    </div>
  );
}

function AccountCards({
  accounts,
  showTenantContext,
  actions,
}: {
  accounts: AccountOperationRecord[];
  showTenantContext: boolean;
  actions: AccountRowActions;
}) {
  return (
    <div className="vx-tenant-directory-cards" aria-label="账号卡片">
      {accounts.map((account) => (
        <article key={account.id} className="vx-tenant-directory-card">
          <header>
            <Icon name="user" size="lg" fallback="placeholder" />
            <div>
              <strong>{account.displayName}</strong>
              <span>
                {account.accountCode} · {account.email}
              </span>
            </div>
            <AccountActionsMenu
              account={account}
              busy={actions.actionBusy}
              onToggleStatus={actions.onToggleStatus}
              onForceLogout={actions.onForceLogout}
            />
          </header>
          <div className="vx-tenant-directory-card__badges">
            <Badge className={accountStatusPillClass(account.status)}>
              {accountStatusLabel(account.status)}
            </Badge>
            {showTenantContext
              ? accountTenantSummary(account).tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="vx-tenant-pill vx-account-muted-pill"
                  >
                    {tag}
                  </Badge>
                ))
              : null}
            <Badge className="vx-tenant-pill vx-account-muted-pill vx-tenant-pill--permission">
              {accountHighestRoleLabel(account)}
            </Badge>
          </div>
          <div className="vx-tenant-directory-card__metrics">
            {showTenantContext ? (
              <span>
                <b>{formatNumber(account.tenantCount)}</b>
                <small>租户</small>
              </span>
            ) : (
              <span>
                <b>{accountHighestRoleLabel(account)}</b>
                <small>平台角色</small>
              </span>
            )}
            <span>
              <b>{formatNumber(account.loginCount30d)}</b>
              <small>30日登录</small>
            </span>
            <span>
              <b>{account.lastActiveLocation}</b>
              <small>地址</small>
            </span>
          </div>
          <footer>
            <span>
              {showTenantContext
                ? accountTenantSummary(account).primaryName
                : "平台用户"}
            </span>
            <strong>{formatDate(account.lastActiveAt)}</strong>
          </footer>
        </article>
      ))}
    </div>
  );
}

function AccountPagination({
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

export function AccountsPage({
  copy = defaultAccountsPageCopy,
  loadAccounts = fetchAccountOperations,
  showTenantContext = true,
}: {
  copy?: Partial<AccountsPageCopy>;
  loadAccounts?: () => Promise<AccountOperationRecord[]>;
  showTenantContext?: boolean;
} = {}) {
  const pageCopy = { ...defaultAccountsPageCopy, ...copy };
  const [accounts, setAccounts] = useState<AccountOperationRecord[]>([]);
  const [accountsTruncated, setAccountsTruncated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tenantTypeFilter, setTenantTypeFilter] =
    useState<TenantTypeFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();
  const [actionBusy, setActionBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    account: AccountOperationRecord;
    kind: "disable" | "enable" | "force-logout";
  } | null>(null);
  const [actionReason, setActionReason] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    loadAccounts()
      .then((records) => {
        if (active) {
          setAccounts(records);
          setAccountsTruncated(isListTruncated(records));
        }
      })
      .catch((error) => {
        if (active) {
          setAccounts([]);
          setAccountsTruncated(false);
          setLoadError(
            error instanceof Error ? error.message : "账号数据读取失败",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadAccounts]);

  function requestToggleStatus(account: AccountOperationRecord) {
    setActionReason("");
    setPendingAction({
      account,
      kind: account.status === "disabled" ? "enable" : "disable",
    });
  }
  function requestForceLogout(account: AccountOperationRecord) {
    setActionReason("");
    setPendingAction({ account, kind: "force-logout" });
  }
  function closePending() {
    if (!actionBusy) {
      setPendingAction(null);
      setActionReason("");
    }
  }
  async function confirmPending(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingAction) return;
    const { account, kind } = pendingAction;
    const reason = actionReason.trim() || undefined;
    setActionBusy(true);
    try {
      if (kind === "disable") {
        await disableAccount(account.id, reason);
        toast({ tone: "success", title: "已停用账号" });
      } else if (kind === "enable") {
        await enableAccount(account.id, reason);
        toast({ tone: "success", title: "已恢复账号" });
      } else {
        const result = await forceLogoutAccount(account.id, reason);
        toast({
          tone: "success",
          title: "已强制下线",
          description: `已吊销 ${result.revoked} 个会话。`,
        });
      }
      const refreshed = await loadAccounts();
      setAccounts(refreshed);
      setAccountsTruncated(isListTruncated(refreshed));
      setPendingAction(null);
      setActionReason("");
    } catch (error) {
      toast({
        tone: "error",
        title: "操作失败",
        ...(error instanceof Error && error.message
          ? { description: error.message }
          : {}),
      });
    } finally {
      setActionBusy(false);
    }
  }
  const accountActions: AccountRowActions = {
    actionBusy,
    onToggleStatus: requestToggleStatus,
    onForceLogout: requestForceLogout,
  };

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return accounts.filter((account) => {
      if (statusFilter !== "all" && account.status !== statusFilter)
        return false;
      if (
        showTenantContext &&
        !accountMatchesTenantType(account, tenantTypeFilter)
      )
        return false;
      if (roleFilter !== "all" && accountRoleGroup(account) !== roleFilter)
        return false;
      if (
        normalizedQuery &&
        !accountSearchText(account).includes(normalizedQuery)
      )
        return false;
      return true;
    });
  }, [
    accounts,
    query,
    roleFilter,
    showTenantContext,
    statusFilter,
    tenantTypeFilter,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const visibleAccounts = filteredAccounts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const visibleAccountIds = visibleAccounts.map((account) => account.id);
  const selectedVisibleAccountCount = visibleAccountIds.filter((accountId) =>
    selectedAccountIds.has(accountId),
  ).length;
  const isAccountPageSelected =
    visibleAccountIds.length > 0 &&
    selectedVisibleAccountCount === visibleAccountIds.length;
  const activeAccounts = accounts.filter(
    (account) => account.status === "active",
  ).length;
  const invitedAccounts = accounts.filter(
    (account) => account.status === "invited",
  ).length;
  const lockedAccounts = accounts.filter(
    (account) => account.status === "locked",
  ).length;
  const disabledAccounts = accounts.filter(
    (account) => account.status === "disabled",
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, query, roleFilter, statusFilter, tenantTypeFilter, viewMode]);

  function handleReset() {
    setQuery("");
    setStatusFilter("all");
    setTenantTypeFilter("all");
    setRoleFilter("all");
  }

  function toggleAccountSelection(accountId: string, checked: boolean) {
    setSelectedAccountIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(accountId);
      } else {
        next.delete(accountId);
      }
      return next;
    });
  }

  function toggleAccountPageSelection(checked: boolean) {
    setSelectedAccountIds((current) => {
      const next = new Set(current);
      for (const accountId of visibleAccountIds) {
        if (checked) {
          next.add(accountId);
        } else {
          next.delete(accountId);
        }
      }
      return next;
    });
  }

  return (
    <div className="vx-page-stack vx-tenant-management-page vx-account-management-page">
      <PageHeader
        icon="user"
        eyebrow={pageCopy.eyebrow}
        title={pageCopy.title}
        description={pageCopy.description}
      />

      <section
        className="vx-tenant-summary"
        aria-label={pageCopy.summaryAriaLabel}
      >
        <AccountSummaryItem
          icon="user"
          label="账号总数"
          value={formatNumber(accounts.length)}
          tags={[`活跃 ${formatNumber(activeAccounts)}`]}
        />
        <AccountSummaryItem
          icon="clock"
          label="待激活"
          value={formatNumber(invitedAccounts)}
          tags={["邀请中"]}
          tone="amber"
        />
        <AccountSummaryItem
          icon="warning"
          label="已锁定"
          value={formatNumber(lockedAccounts)}
          tags={["临时锁定"]}
          tone={lockedAccounts ? "amber" : "green"}
        />
        <AccountSummaryItem
          icon="x"
          label="已停用"
          value={formatNumber(disabledAccounts)}
          tags={["长期未用"]}
          tone={disabledAccounts ? "rose" : "green"}
        />
      </section>

      {accountsTruncated ? (
        <Banner
          tone="warning"
          title="当前账号列表可能未展示全部数据"
          description="本次加载已达到单次读取上限（500 条），如未看到目标账号，请尝试缩小筛选范围（如按状态、权限等）重新查询。"
        />
      ) : null}

      <div className="vx-tenant-list-shell">
        <section
          className="vx-tenant-toolbar"
          aria-label={pageCopy.toolbarAriaLabel}
        >
          <ViewModeSwitch
            value={viewMode}
            onChange={setViewMode}
            ariaLabel={`${pageCopy.title}展示方式`}
          />
          <span className="vx-tenant-view-count">
            {formatNumber(filteredAccounts.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={pageCopy.searchPlaceholder}
            className="vx-tenant-search"
            aria-label={pageCopy.searchAriaLabel}
          />
          <Button variant="outline" onClick={handleReset}>
            重置
          </Button>
          <div className="vx-tenant-filters">
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              aria-label={pageCopy.statusAriaLabel}
            >
              <option value="all">全部状态</option>
              <option value="active">正常</option>
              <option value="invited">待激活</option>
              <option value="locked">已锁定</option>
              <option value="disabled">已停用</option>
            </NativeSelect>
            {showTenantContext ? (
              <NativeSelect
                className="vx-input vx-tenant-select"
                value={tenantTypeFilter}
                onChange={(event) =>
                  setTenantTypeFilter(event.target.value as TenantTypeFilter)
                }
                aria-label={pageCopy.tenantTypeAriaLabel}
              >
                <option value="all">全部租户</option>
                <option value="individual">个人</option>
                <option value="company">组织</option>
                <option value="mixed">个人+组织</option>
              </NativeSelect>
            ) : null}
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as RoleFilter)
              }
              aria-label={pageCopy.roleAriaLabel}
            >
              <option value="all">全部权限</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </NativeSelect>
          </div>
          <ActionButton variant="outline" icon="plus" disabled>
            {pageCopy.createActionLabel}
          </ActionButton>
        </section>

        <section
          className="vx-tenant-directory"
          aria-label={pageCopy.directoryAriaLabel}
        >
          {loading ? (
            <header className="vx-tenant-directory__header">
              <span>读取中</span>
            </header>
          ) : null}

          {visibleAccounts.length ? (
            viewMode === "list" ? (
              <AccountListRows
                accounts={visibleAccounts}
                startIndex={(Math.min(currentPage, pageCount) - 1) * pageSize}
                selectedAccountIds={selectedAccountIds}
                isPageSelected={isAccountPageSelected}
                showTenantContext={showTenantContext}
                onToggleAccount={toggleAccountSelection}
                onTogglePage={toggleAccountPageSelection}
                actions={accountActions}
              />
            ) : (
              <AccountCards
                accounts={visibleAccounts}
                showTenantContext={showTenantContext}
                actions={accountActions}
              />
            )
          ) : (
            <section className="vx-tenant-empty">
              <EmptyState
                title={
                  loading
                    ? pageCopy.loadingTitle
                    : loadError
                      ? "账号数据读取失败"
                      : pageCopy.emptyTitle
                }
                description={
                  loading
                    ? pageCopy.loadingDescription
                    : (loadError ?? pageCopy.emptyDescription)
                }
                action={
                  <ActionButton
                    variant="outline"
                    icon="x"
                    onClick={handleReset}
                  >
                    清空筛选
                  </ActionButton>
                }
              />
            </section>
          )}

          <AccountPagination
            currentPage={Math.min(currentPage, pageCount)}
            pageCount={pageCount}
            total={filteredAccounts.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onPageChange={(page) =>
              setCurrentPage(Math.min(Math.max(page, 1), pageCount))
            }
          />
        </section>
      </div>
      {pendingAction ? (
        <DialogForm
          open
          title={
            pendingAction.kind === "disable"
              ? "停用账号"
              : pendingAction.kind === "enable"
                ? "恢复账号"
                : "强制下线"
          }
          description={
            pendingAction.kind === "disable"
              ? `将停用 ${pendingAction.account.displayName}（${pendingAction.account.email}）：封禁全部登录路径并吊销其所有会话，可稍后恢复。`
              : pendingAction.kind === "enable"
                ? `将恢复 ${pendingAction.account.displayName} 的账号为正常状态。`
                : `将吊销 ${pendingAction.account.displayName} 的全部活跃会话，该用户需重新登录。`
          }
          submitLabel={
            pendingAction.kind === "disable"
              ? "确认停用"
              : pendingAction.kind === "enable"
                ? "确认恢复"
                : "确认下线"
          }
          submitVariant={
            pendingAction.kind === "disable" ? "destructive" : "default"
          }
          submitting={actionBusy}
          onOpenChange={(open) => {
            if (!open) closePending();
          }}
          onSubmit={(event) => void confirmPending(event)}
        >
          <Label>
            备注（可选）
            <Textarea
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              rows={3}
              placeholder="记录处置原因，将写入审计日志"
              maxLength={512}
            />
          </Label>
        </DialogForm>
      ) : null}
    </div>
  );
}
