"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banner,
  Icon,
  ActionMenu,
  Badge,
  Button,
  Checkbox,
  Input,
  NativeSelect,
  Pagination,
  ActionButton,
  EmptyState,
  ViewModeSwitch,
  useToast,
} from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import {
  fetchTenantOperationsStrict,
  resumeTenant,
  suspendTenant,
} from "@/api/admin-bff";
import type { TenantOperationRecord } from "@/entities/console";
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
  normalizeTenantRiskLevel,
  riskLabel,
  statusLabel,
  tenantRiskOptions,
  tenantSearchText,
  typeLabel,
  verifiedLabel,
} from "./tenant-utils";
import { useStepUp, isStepUpCancelled } from "@/providers/StepUpProvider";

type ViewMode = "list" | "cards";
type StatusFilter = "all" | TenantOperationRecord["status"];
type TypeFilter = "all" | TenantOperationRecord["tenantType"];
type RiskFilter = "all" | TenantOperationRecord["riskLevel"];
type VerificationFilter = "all" | TenantOperationRecord["verifiedStatus"];

type TenantStatusIndicatorTone = "normal" | "progress" | "attention" | "closed";

function tenantStatusIndicator(tenant: TenantOperationRecord): {
  tone: TenantStatusIndicatorTone;
  label: string;
  icon: IconName;
} {
  if (tenant.status === "cancelled") {
    return { tone: "closed", label: "已结束", icon: "x" };
  }

  if (tenant.status === "suspended" || tenant.verifiedStatus === "rejected") {
    return { tone: "attention", label: "需关注", icon: "warning" };
  }

  if (
    tenant.status === "trial" ||
    tenant.verifiedStatus === "pending" ||
    tenant.verifiedStatus === "unverified"
  ) {
    return { tone: "progress", label: "进行中", icon: "clock" };
  }

  return { tone: "normal", label: "正常", icon: "check" };
}

function TenantSummaryItem({
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
    <article className={`vx-tenant-summary__item vx-tenant-tone--${tone}`}>
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

function TenantActionsMenu({
  tenant,
  busy,
  onToggleStatus,
}: {
  tenant: TenantOperationRecord;
  busy: boolean;
  onToggleStatus: (tenant: TenantOperationRecord) => void;
}) {
  const router = useRouter();
  const isSuspended = tenant.status === "suspended";

  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${tenant.displayName} 操作`}
        triggerClassName="vx-tenant-actions__trigger"
        triggerProps={{ title: "操作" }}
        items={[
          {
            id: "details",
            label: "查看详情",
            icon: <Icon name="arrow-right" size="xs" fallback="placeholder" />,
            onSelect: () =>
              router.push(`/tenants/${encodeURIComponent(tenant.id)}`),
          },
          {
            id: "edit",
            label: "编辑资料",
            icon: <Icon name="edit" size="xs" fallback="placeholder" />,
            disabled: true,
          },
          {
            id: "subscription",
            label: "订阅处理",
            icon: <Icon name="star" size="xs" fallback="placeholder" />,
            disabled: true,
          },
          {
            // 暂停 → suspendTenant / 已暂停恢复 → resumeTenant；已注销租户无切换语义，置灰。
            id: "toggle-status",
            label: isSuspended ? "恢复租户" : "暂停租户",
            icon: (
              <Icon
                name={isSuspended ? "success" : "warning"}
                size="xs"
                fallback="placeholder"
              />
            ),
            disabled: busy || tenant.status === "cancelled",
            onSelect: () => onToggleStatus(tenant),
          },
        ]}
      />
    </div>
  );
}

function TenantListRows({
  tenants,
  startIndex,
  selectedTenantIds,
  isPageSelected,
  actionBusy,
  onToggleTenant,
  onTogglePage,
  onToggleStatus,
}: {
  tenants: TenantOperationRecord[];
  startIndex: number;
  selectedTenantIds: Set<string>;
  isPageSelected: boolean;
  actionBusy: boolean;
  onToggleTenant: (tenantId: string, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
  onToggleStatus: (tenant: TenantOperationRecord) => void;
}) {
  const router = useRouter();
  const selectedOnPage = tenants.filter((tenant) =>
    selectedTenantIds.has(tenant.id),
  ).length;
  const isPagePartiallySelected =
    selectedOnPage > 0 && selectedOnPage < tenants.length;

  return (
    <div
      className="vx-tenant-directory-list vx-tenant-operation-directory-list"
      role="region"
      aria-label="租户清单"
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
            aria-label="选择当前页租户"
          />
        </span>
        <span>序号</span>
        <span>租户</span>
        <span>成员</span>
        <span>状态</span>
        <span>订阅</span>
        <span>服务</span>
        <span>操作</span>
      </div>
      {tenants.map((tenant, index) => {
        const riskLevel = normalizeTenantRiskLevel(tenant.riskLevel);
        const ticketTotal = Math.max(
          tenant.tickets.length,
          tenant.ticketOpenCount,
        );
        const subscribedProductCount =
          tenant.subscriptions.length || tenant.subscriptionCount;
        const statusIndicator = tenantStatusIndicator(tenant);

        return (
          <div
            key={tenant.id}
            className={joinClasses(
              "vx-tenant-directory-row",
              "vx-tenant-operation-row",
              `vx-tenant-directory-row--${riskLevel}`,
              selectedTenantIds.has(tenant.id)
                ? "vx-tenant-operation-row--selected"
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
              onToggleTenant(tenant.id, !selectedTenantIds.has(tenant.id));
            }}
          >
            <span className="vx-tenant-operation-row__select">
              <Checkbox
                className="vx-model-select-checkbox"
                checked={selectedTenantIds.has(tenant.id)}
                onClick={(event) => event.stopPropagation()}
                onCheckedChange={(value) =>
                  onToggleTenant(tenant.id, value === true)
                }
                aria-label={`选择 ${tenant.displayName}`}
              />
            </span>
            <span className="vx-tenant-directory-row__index">
              {formatNumber(startIndex + index + 1)}
            </span>
            <span className="vx-tenant-directory-row__tenant">
              <Icon
                name={tenant.tenantType === "company" ? "buildings" : "user"}
                size="sm"
                fallback="placeholder"
              />
              <span>
                <span className="vx-tenant-directory-row__title-line">
                  <Button
                    variant="link"
                    className="vx-model-name-button"
                    onClick={() =>
                      router.push(`/tenants/${encodeURIComponent(tenant.id)}`)
                    }
                  >
                    {tenant.displayName}
                  </Button>
                </span>
                <small>
                  {tenant.tenantCode} · {tenant.region}
                </small>
              </span>
            </span>
            <span className="vx-tenant-directory-row__member">
              <strong>{formatNumber(tenant.memberCount)}</strong>
            </span>
            <span className="vx-tenant-directory-row__status">
              <span className="vx-tenant-directory-row__status-line">
                <span
                  className={`vx-tenant-status-dot vx-tenant-status-dot--${statusIndicator.tone}`}
                  role="img"
                  aria-label={statusIndicator.label}
                  title={statusIndicator.label}
                >
                  <Icon
                    name={statusIndicator.icon}
                    size="xs"
                    fallback="placeholder"
                  />
                </span>
                <span className="vx-tenant-directory-row__badges">
                  <Badge
                    className={`vx-tenant-pill vx-tenant-pill--${tenant.status}`}
                  >
                    {statusLabel(tenant.status)}
                  </Badge>
                  <Badge
                    className={`vx-tenant-pill vx-tenant-pill--${tenant.verifiedStatus}`}
                  >
                    {verifiedLabel(tenant.verifiedStatus)}
                  </Badge>
                </span>
              </span>
            </span>
            <span className="vx-tenant-directory-row__subscription">
              <span className="vx-tenant-directory-row__tag-line">
                <Badge className="vx-tenant-pill vx-tenant-pill--product">
                  {formatNumber(subscribedProductCount)} 产品
                </Badge>
              </span>
              <small>本月：¥ {formatNumber(tenant.monthlyRevenue)} 元</small>
            </span>
            <span className="vx-tenant-directory-row__service">
              <span className="vx-tenant-directory-row__tag-line">
                <Badge
                  className={`vx-tenant-pill vx-tenant-pill--risk-${riskLevel}`}
                >
                  {riskLabel(riskLevel)}
                </Badge>
              </span>
              <small>
                总工单 {formatNumber(ticketTotal)} | 待处理{" "}
                {formatNumber(tenant.ticketOpenCount)}
              </small>
            </span>
            <TenantActionsMenu
              tenant={tenant}
              busy={actionBusy}
              onToggleStatus={onToggleStatus}
            />
          </div>
        );
      })}
    </div>
  );
}

function TenantCards({
  tenants,
  actionBusy,
  onToggleStatus,
}: {
  tenants: TenantOperationRecord[];
  actionBusy: boolean;
  onToggleStatus: (tenant: TenantOperationRecord) => void;
}) {
  const router = useRouter();

  return (
    <div className="vx-tenant-directory-cards" aria-label="租户卡片">
      {tenants.map((tenant) => (
        <article
          key={tenant.id}
          className={joinClasses(
            "vx-tenant-directory-card",
            `vx-tenant-directory-card--${tenant.riskLevel}`,
          )}
          role="button"
          tabIndex={0}
          onClick={() =>
            router.push(`/tenants/${encodeURIComponent(tenant.id)}`)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter")
              router.push(`/tenants/${encodeURIComponent(tenant.id)}`);
          }}
        >
          <header>
            <Icon
              name={tenant.tenantType === "company" ? "buildings" : "user"}
              size="lg"
              fallback="placeholder"
            />
            <div>
              <strong>{tenant.displayName}</strong>
              <span>
                {tenant.tenantCode} · {typeLabel(tenant.tenantType)}
              </span>
            </div>
            <TenantActionsMenu
              tenant={tenant}
              busy={actionBusy}
              onToggleStatus={onToggleStatus}
            />
          </header>
          <div className="vx-tenant-directory-card__badges">
            <Badge
              className={`vx-tenant-pill vx-tenant-pill--${tenant.status}`}
            >
              {statusLabel(tenant.status)}
            </Badge>
            <Badge
              className={`vx-tenant-pill vx-tenant-pill--${tenant.verifiedStatus}`}
            >
              {verifiedLabel(tenant.verifiedStatus)}
            </Badge>
            <Badge
              className={`vx-tenant-pill vx-tenant-pill--risk-${tenant.riskLevel}`}
            >
              {riskLabel(tenant.riskLevel)}
            </Badge>
          </div>
          <div className="vx-tenant-directory-card__metrics">
            <span>
              <b>{formatNumber(tenant.subscriptionCount)}</b>
              <small>订阅</small>
            </span>
            <span>
              <b>{formatNumber(tenant.memberCount)}</b>
              <small>用户</small>
            </span>
            <span>
              <b>{formatNumber(tenant.tokenUsed)}</b>
              <small>Token</small>
            </span>
          </div>
          <footer>
            <span>{tenant.industry}</span>
            <strong>
              {tenant.ticketOpenCount} 工单 · {formatDate(tenant.lastActiveAt)}
            </strong>
          </footer>
        </article>
      ))}
    </div>
  );
}

function TenantPagination({
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

export function TenantsPage() {
  const { toast } = useToast();
  const { runWithStepUp } = useStepUp();
  const [tenants, setTenants] = useState<TenantOperationRecord[]>([]);
  const [tenantsTruncated, setTenantsTruncated] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTenantIds, setSelectedTenantIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [verificationFilter, setVerificationFilter] =
    useState<VerificationFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTenants = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const records = await fetchTenantOperationsStrict();
      setTenants(records);
      setTenantsTruncated(isListTruncated(records));
      setLoadError(null);
    } catch (error) {
      setTenants([]);
      setTenantsTruncated(false);
      setLoadError(error instanceof Error ? error.message : "租户数据读取失败");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  async function handleToggleTenantStatus(tenant: TenantOperationRecord) {
    if (actionBusy) return;
    const resuming = tenant.status === "suspended";
    setActionBusy(true);
    try {
      await runWithStepUp(() =>
        resuming ? resumeTenant(tenant.id) : suspendTenant(tenant.id),
      );
      await loadTenants(true);
      toast({
        tone: "success",
        title: resuming ? "已恢复租户" : "已暂停租户",
        description: `${tenant.displayName} ${resuming ? "已恢复为正常状态。" : "已暂停。"}`,
      });
    } catch (error) {
      if (isStepUpCancelled(error)) return;
      toast({
        tone: "error",
        title: "操作失败",
        description:
          error instanceof Error
            ? error.message
            : "无法更新租户状态，请稍后重试。",
      });
    } finally {
      setActionBusy(false);
    }
  }

  const filteredTenants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tenants.filter((tenant) => {
      if (statusFilter !== "all" && tenant.status !== statusFilter)
        return false;
      if (typeFilter !== "all" && tenant.tenantType !== typeFilter)
        return false;
      if (riskFilter !== "all" && tenant.riskLevel !== riskFilter) return false;
      if (
        verificationFilter !== "all" &&
        tenant.verifiedStatus !== verificationFilter
      )
        return false;
      if (
        normalizedQuery &&
        !tenantSearchText(tenant).includes(normalizedQuery)
      )
        return false;
      return true;
    });
  }, [
    query,
    riskFilter,
    statusFilter,
    tenants,
    typeFilter,
    verificationFilter,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredTenants.length / pageSize));
  const visibleTenants = filteredTenants.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const visibleTenantIds = visibleTenants.map((tenant) => tenant.id);
  const selectedVisibleTenantCount = visibleTenantIds.filter((tenantId) =>
    selectedTenantIds.has(tenantId),
  ).length;
  const isTenantPageSelected =
    visibleTenantIds.length > 0 &&
    selectedVisibleTenantCount === visibleTenantIds.length;
  const individualTenants = tenants.filter(
    (tenant) => tenant.tenantType === "individual",
  ).length;
  const companyTenants = tenants.filter(
    (tenant) => tenant.tenantType === "company",
  ).length;
  const pendingVerifications = tenants.filter(
    (tenant) => tenant.verifiedStatus === "pending",
  ).length;
  const pendingIndividualVerifications = tenants.filter(
    (tenant) =>
      tenant.verifiedStatus === "pending" && tenant.tenantType === "individual",
  ).length;
  const pendingCompanyVerifications = tenants.filter(
    (tenant) =>
      tenant.verifiedStatus === "pending" && tenant.tenantType === "company",
  ).length;
  const trialProductTenants = tenants.filter(
    (tenant) => tenant.subscriptionCount > 0 && tenant.monthlyRevenue <= 0,
  ).length;
  const riskTenants = tenants.filter(
    (tenant) => normalizeTenantRiskLevel(tenant.riskLevel) !== "normal",
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    pageSize,
    query,
    riskFilter,
    statusFilter,
    typeFilter,
    verificationFilter,
    viewMode,
  ]);

  function handleReset() {
    setQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setRiskFilter("all");
    setVerificationFilter("all");
  }

  function toggleTenantSelection(tenantId: string, checked: boolean) {
    setSelectedTenantIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(tenantId);
      } else {
        next.delete(tenantId);
      }
      return next;
    });
  }

  function toggleTenantPageSelection(checked: boolean) {
    setSelectedTenantIds((current) => {
      const next = new Set(current);
      for (const tenantId of visibleTenantIds) {
        if (checked) {
          next.add(tenantId);
        } else {
          next.delete(tenantId);
        }
      }
      return next;
    });
  }

  return (
    <div className="vx-page-stack vx-tenant-management-page vx-tenant-operations-page">
      <PageHeader
        icon="buildings"
        eyebrow="租户账号"
        title="租户信息"
        description="平台运营侧统一检索租户、识别风险、处理订阅和进入单租户管理。"
      />

      <section className="vx-tenant-summary" aria-label="租户运营统计">
        <TenantSummaryItem
          icon="buildings"
          label="租户总数"
          value={formatNumber(tenants.length)}
          tags={[
            `个人 ${formatNumber(individualTenants)}`,
            `组织 ${formatNumber(companyTenants)}`,
          ]}
        />
        <TenantSummaryItem
          icon="medal"
          label="认证待审"
          value={formatNumber(pendingVerifications)}
          tags={[
            `个人 ${formatNumber(pendingIndividualVerifications)}`,
            `组织 ${formatNumber(pendingCompanyVerifications)}`,
          ]}
          tone="amber"
        />
        <TenantSummaryItem
          icon="star"
          label="试用租户"
          value={formatNumber(trialProductTenants)}
          tags={["未付费"]}
          tone="amber"
        />
        <TenantSummaryItem
          icon="warning"
          label="风险租户"
          value={formatNumber(riskTenants)}
          tags={["需跟进"]}
          tone={riskTenants ? "rose" : "green"}
        />
      </section>

      {tenantsTruncated ? (
        <Banner
          tone="warning"
          title="当前租户列表可能未展示全部数据"
          description="本次加载已达到单次读取上限（500 条），如未看到目标租户，请尝试缩小筛选范围（如按状态、认证情况等）重新查询。"
        />
      ) : null}

      <div className="vx-tenant-list-shell">
        <section className="vx-tenant-toolbar" aria-label="租户筛选">
          <ViewModeSwitch
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="租户展示方式"
          />
          <span className="vx-tenant-view-count">
            {formatNumber(filteredTenants.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索租户、编码、联系人、产品"
            className="vx-tenant-search"
            aria-label="搜索租户"
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
              aria-label="租户状态"
            >
              <option value="all">全部状态</option>
              <option value="active">正常</option>
              <option value="trial">试用</option>
              <option value="suspended">暂停</option>
              <option value="cancelled">注销</option>
            </NativeSelect>
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as TypeFilter)
              }
              aria-label="租户类型"
            >
              <option value="all">全部类型</option>
              <option value="company">企业租户</option>
              <option value="individual">个人租户</option>
            </NativeSelect>
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={verificationFilter}
              onChange={(event) =>
                setVerificationFilter(event.target.value as VerificationFilter)
              }
              aria-label="认证状态"
            >
              <option value="all">全部认证</option>
              <option value="verified">已认证</option>
              <option value="pending">待审核</option>
              <option value="unverified">未认证</option>
              <option value="rejected">已驳回</option>
            </NativeSelect>
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={riskFilter}
              onChange={(event) =>
                setRiskFilter(event.target.value as RiskFilter)
              }
              aria-label="风险等级"
            >
              <option value="all">全部风险</option>
              {tenantRiskOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <ActionButton variant="outline" icon="plus" disabled>
            新建租户
          </ActionButton>
        </section>

        <section className="vx-tenant-directory" aria-label="租户清单">
          {loading ? (
            <header className="vx-tenant-directory__header">
              <span>读取中</span>
            </header>
          ) : null}

          {visibleTenants.length ? (
            viewMode === "list" ? (
              <TenantListRows
                tenants={visibleTenants}
                startIndex={(Math.min(currentPage, pageCount) - 1) * pageSize}
                selectedTenantIds={selectedTenantIds}
                isPageSelected={isTenantPageSelected}
                actionBusy={actionBusy}
                onToggleTenant={toggleTenantSelection}
                onTogglePage={toggleTenantPageSelection}
                onToggleStatus={handleToggleTenantStatus}
              />
            ) : (
              <TenantCards
                tenants={visibleTenants}
                actionBusy={actionBusy}
                onToggleStatus={handleToggleTenantStatus}
              />
            )
          ) : (
            <section className="vx-tenant-empty">
              <EmptyState
                title={
                  loading
                    ? "正在加载租户"
                    : loadError
                      ? "租户数据读取失败"
                      : "没有匹配的租户"
                }
                description={
                  loading
                    ? "正在读取平台租户运营数据。"
                    : (loadError ?? "清空筛选条件后可查看全部租户。")
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

          <TenantPagination
            currentPage={Math.min(currentPage, pageCount)}
            pageCount={pageCount}
            total={filteredTenants.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onPageChange={(page) =>
              setCurrentPage(Math.min(Math.max(page, 1), pageCount))
            }
          />
        </section>
      </div>
    </div>
  );
}
