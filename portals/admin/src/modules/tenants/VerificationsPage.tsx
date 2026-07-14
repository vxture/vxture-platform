"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Banner,
  Icon,
  ActionMenu,
  Badge,
  Button,
  Checkbox,
  DialogForm,
  Input,
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
  approveTenantVerification,
  fetchTenantVerifications,
  rejectTenantVerification,
} from "@/api/admin-bff";
import type {
  TenantOperationRecord,
  TenantOperationType,
  TenantVerificationRecord,
  TenantVerificationStatus,
} from "@/entities/console";
import { isListTruncated } from "@/lib/list-truncation";
import { PageHeader } from "@/modules/shared/PageHeader";
import {
  PageSizePicker as AdminPageSizePicker,
  type PageSize,
} from "@/modules/shared/PageSizePicker";
import {
  formatDate,
  formatMoney,
  formatNumber,
  joinClasses,
  normalizeTenantRiskLevel,
  riskLabel,
  tenantRiskOptions,
  verifiedLabel,
} from "./tenant-utils";

type ViewMode = "list" | "cards";
type VerificationFilter = "all" | TenantVerificationStatus;
type RiskFilter = "all" | TenantOperationRecord["riskLevel"];
type RegionFilter = "all" | string;
type VerificationStatusTone = "normal" | "progress" | "attention" | "closed";

const verificationSortWeight: Record<TenantVerificationStatus, number> = {
  pending: 0,
  rejected: 1,
  unverified: 2,
  verified: 3,
};

// 复用既有 TenantOperationRecord 版式：把实名审核记录投影到列表所需字段，
// 承载 verificationId 供审批/驳回端点调用；本读路径不覆盖的运营字段按零值占位。
type VerificationRow = TenantOperationRecord & { verificationId: string };

const verificationTenantType: Record<string, TenantOperationType> = {
  organization: "company",
  personal: "individual",
};

function mapVerificationToRow(
  record: TenantVerificationRecord,
): VerificationRow {
  const contactName = record.legalPersonName ?? record.tenantName;
  return {
    verificationId: record.id,
    id: record.tenantId,
    tenantCode: record.tenantNo,
    tenantName: record.tenantName,
    displayName: record.tenantName,
    tenantType: verificationTenantType[record.tenantType] ?? "company",
    status: record.tenantStatus === "suspended" ? "suspended" : "active",
    verifiedStatus: record.status,
    verificationSubmittedAt: record.createdAt,
    verifiedAt: record.reviewedAt,
    riskLevel: "normal",
    region: "",
    industry:
      record.verificationType === "enterprise" ? "企业认证" : "个人认证",
    scale: record.businessLicenseNo ?? "—",
    ownerName: record.legalPersonName ?? "",
    ownerEmail: "",
    contactName,
    contactPhone: "",
    createdAt: record.createdAt,
    lastActiveAt: record.updatedAt,
    memberCount: 0,
    activeMemberCount: 0,
    adminCount: 0,
    subscriptionCount: 0,
    productCount: 0,
    monthlyRevenue: 0,
    monthlyCost: 0,
    grossMarginRate: 0,
    tokenUsed: 0,
    tokenQuota: 0,
    ticketOpenCount: 0,
    satisfaction: 0,
    sla: "",
    tags: [],
    notes: record.rejectReason ?? "",
    members: [],
    subscriptions: [],
    usage: [],
    modelPolicies: [],
    auditEvents: [],
    tickets: [],
  };
}

function daysSince(value: string | null | undefined) {
  if (!value) return 0;
  const started = new Date(value).getTime();
  if (Number.isNaN(started)) return 0;
  return Math.max(0, Math.floor((Date.now() - started) / 86_400_000));
}

function verificationStatusIndicator(status: TenantVerificationStatus): {
  tone: VerificationStatusTone;
  label: string;
  icon: IconName;
} {
  if (status === "verified")
    return { tone: "normal", label: "已认证", icon: "check" };
  if (status === "pending")
    return { tone: "progress", label: "待审核", icon: "clock" };
  if (status === "rejected")
    return { tone: "attention", label: "已驳回", icon: "warning" };
  return { tone: "closed", label: "未认证", icon: "info" };
}

function verificationSearchText(tenant: TenantOperationRecord) {
  return [
    tenant.id,
    tenant.tenantCode,
    tenant.tenantName,
    tenant.displayName,
    tenant.verifiedStatus,
    tenant.riskLevel,
    tenant.region,
    tenant.industry,
    tenant.scale,
    tenant.contactName,
    tenant.contactPhone,
    tenant.ownerName,
    tenant.ownerEmail,
    tenant.notes,
  ]
    .join(" ")
    .toLowerCase();
}

function verificationTimeText(tenant: TenantOperationRecord) {
  if (tenant.verifiedStatus === "verified")
    return tenant.verifiedAt
      ? `通过 ${formatDate(tenant.verifiedAt)}`
      : "已通过";
  if (tenant.verifiedStatus === "pending")
    return `等待 ${formatNumber(daysSince(tenant.verificationSubmittedAt))} 天`;
  if (tenant.verifiedStatus === "rejected") return "需补充材料";
  return "未提交材料";
}

function VerificationSummaryItem({
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

function VerificationActionsMenu({
  tenant,
  busy,
  onApprove,
  onReject,
}: {
  tenant: VerificationRow;
  busy: boolean;
  onApprove: (row: VerificationRow) => void;
  onReject: (row: VerificationRow) => void;
}) {
  const router = useRouter();
  const isPending = tenant.verifiedStatus === "pending";

  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${tenant.displayName} 认证操作`}
        triggerClassName="vx-tenant-actions__trigger"
        triggerProps={{ title: "操作" }}
        items={[
          {
            id: "review",
            label: isPending ? "进入审核" : "查看详情",
            icon: (
              <Icon
                name={isPending ? "medal" : "arrow-right"}
                size="xs"
                fallback="placeholder"
              />
            ),
            onSelect: () =>
              router.push(`/tenants/${encodeURIComponent(tenant.id)}`),
          },
          {
            id: "approve",
            label: "通过认证",
            icon: <Icon name="check" size="xs" fallback="placeholder" />,
            disabled: !isPending || busy,
            onSelect: () => onApprove(tenant),
          },
          {
            id: "reject",
            label: "驳回材料",
            icon: <Icon name="x" size="xs" fallback="placeholder" />,
            disabled: !isPending || busy,
            onSelect: () => onReject(tenant),
          },
          {
            id: "history",
            label: "审核记录",
            icon: <Icon name="info" size="xs" fallback="placeholder" />,
            disabled: true,
          },
        ]}
      />
    </div>
  );
}

function VerificationListRows({
  tenants,
  startIndex,
  selectedTenantIds,
  isPageSelected,
  actionBusy,
  onToggleTenant,
  onTogglePage,
  onApprove,
  onReject,
}: {
  tenants: VerificationRow[];
  startIndex: number;
  selectedTenantIds: Set<string>;
  isPageSelected: boolean;
  actionBusy: boolean;
  onToggleTenant: (tenantId: string, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
  onApprove: (row: VerificationRow) => void;
  onReject: (row: VerificationRow) => void;
}) {
  const router = useRouter();
  const selectedOnPage = tenants.filter((tenant) =>
    selectedTenantIds.has(tenant.id),
  ).length;
  const isPagePartiallySelected =
    selectedOnPage > 0 && selectedOnPage < tenants.length;

  return (
    <div
      className="vx-tenant-directory-list vx-verification-directory-list"
      role="region"
      aria-label="实名认证清单"
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
            aria-label="选择当前页实名认证"
          />
        </span>
        <span>序号</span>
        <span>组织</span>
        <span>认证状态</span>
        <span>主体信息</span>
        <span>运营联系</span>
        <span>时间</span>
        <span>操作</span>
      </div>
      {tenants.map((tenant, index) => {
        const riskLevel = normalizeTenantRiskLevel(tenant.riskLevel);
        const indicator = verificationStatusIndicator(tenant.verifiedStatus);

        return (
          <div
            key={tenant.id}
            className={joinClasses(
              "vx-tenant-directory-row",
              "vx-verification-operation-row",
              `vx-tenant-directory-row--${riskLevel}`,
              selectedTenantIds.has(tenant.id)
                ? "vx-verification-operation-row--selected"
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
            <span className="vx-verification-operation-row__select">
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
              <Icon name="buildings" size="sm" fallback="placeholder" />
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
            <span className="vx-verification-row__status">
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
                <Badge
                  className={`vx-tenant-pill vx-verification-pill--${tenant.verifiedStatus}`}
                >
                  {verifiedLabel(tenant.verifiedStatus)}
                </Badge>
              </span>
              <small>{riskLabel(riskLevel)}</small>
            </span>
            <span className="vx-verification-row__subject">
              <span className="vx-tenant-directory-row__tag-line">
                <Badge className="vx-tenant-pill vx-tenant-pill--company">
                  {tenant.industry}
                </Badge>
                <Badge className="vx-tenant-pill vx-verification-muted-pill">
                  {tenant.scale}
                </Badge>
              </span>
              <small>{tenant.tenantName}</small>
            </span>
            <span className="vx-verification-row__contact">
              <strong>{tenant.contactName}</strong>
              <small>{tenant.contactPhone || tenant.ownerEmail}</small>
            </span>
            <span className="vx-verification-row__time">
              <strong>
                {tenant.verificationSubmittedAt
                  ? formatDate(tenant.verificationSubmittedAt)
                  : "未提交"}
              </strong>
              <small>{verificationTimeText(tenant)}</small>
            </span>
            <VerificationActionsMenu
              tenant={tenant}
              busy={actionBusy}
              onApprove={onApprove}
              onReject={onReject}
            />
          </div>
        );
      })}
    </div>
  );
}

function VerificationCards({
  tenants,
  actionBusy,
  onApprove,
  onReject,
}: {
  tenants: VerificationRow[];
  actionBusy: boolean;
  onApprove: (row: VerificationRow) => void;
  onReject: (row: VerificationRow) => void;
}) {
  const router = useRouter();

  return (
    <div
      className="vx-tenant-directory-cards vx-verification-cards"
      aria-label="实名认证卡片"
    >
      {tenants.map((tenant) => {
        const riskLevel = normalizeTenantRiskLevel(tenant.riskLevel);

        return (
          <article
            key={tenant.id}
            className={joinClasses(
              "vx-tenant-directory-card",
              `vx-tenant-directory-card--${riskLevel}`,
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
              <Icon name="buildings" size="lg" fallback="placeholder" />
              <div>
                <strong>{tenant.displayName}</strong>
                <span>
                  {tenant.tenantCode} · {tenant.region}
                </span>
              </div>
              <VerificationActionsMenu
                tenant={tenant}
                busy={actionBusy}
                onApprove={onApprove}
                onReject={onReject}
              />
            </header>
            <div className="vx-tenant-directory-card__badges">
              <Badge
                className={`vx-tenant-pill vx-verification-pill--${tenant.verifiedStatus}`}
              >
                {verifiedLabel(tenant.verifiedStatus)}
              </Badge>
              <Badge
                className={`vx-tenant-pill vx-tenant-pill--risk-${riskLevel}`}
              >
                {riskLabel(riskLevel)}
              </Badge>
            </div>
            <div className="vx-tenant-directory-card__metrics">
              <span>
                <b>{formatNumber(daysSince(tenant.verificationSubmittedAt))}</b>
                <small>等待天数</small>
              </span>
              <span>
                <b>{formatNumber(tenant.memberCount)}</b>
                <small>成员</small>
              </span>
              <span>
                <b>{formatMoney(tenant.monthlyRevenue)}</b>
                <small>本月收入</small>
              </span>
            </div>
            <footer>
              <span>
                {tenant.industry} · {tenant.scale}
              </span>
              <strong>{verificationTimeText(tenant)}</strong>
            </footer>
          </article>
        );
      })}
    </div>
  );
}

function VerificationPagination({
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

export function VerificationsPage() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<VerificationRow[]>([]);
  const [verificationsTruncated, setVerificationsTruncated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTenantIds, setSelectedTenantIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [query, setQuery] = useState("");
  const [verificationFilter, setVerificationFilter] =
    useState<VerificationFilter>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<VerificationRow | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  useEffect(() => {
    const tenantId = new URLSearchParams(window.location.search).get(
      "tenantId",
    );
    if (tenantId) setQuery(tenantId);
  }, []);

  const loadVerifications = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const records = await fetchTenantVerifications();
        setTenants(records.map(mapVerificationToRow));
        setVerificationsTruncated(isListTruncated(records));
      } catch (error) {
        setVerificationsTruncated(false);
        toast({
          tone: "error",
          title: "加载失败",
          description:
            error instanceof Error
              ? error.message
              : "无法加载实名认证列表，请稍后重试。",
        });
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadVerifications();
  }, [loadVerifications]);

  const organizationTenants = useMemo(
    () =>
      tenants
        .filter((tenant) => tenant.tenantType === "company")
        .sort((left, right) => {
          const statusOrder =
            verificationSortWeight[left.verifiedStatus] -
            verificationSortWeight[right.verifiedStatus];
          if (statusOrder !== 0) return statusOrder;
          return (
            new Date(
              right.verificationSubmittedAt ?? right.createdAt,
            ).getTime() -
            new Date(left.verificationSubmittedAt ?? left.createdAt).getTime()
          );
        }),
    [tenants],
  );

  const regionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          organizationTenants
            .map((tenant) => tenant.region.split("/")[0]?.trim())
            .filter(Boolean),
        ),
      ).sort(),
    [organizationTenants],
  );

  const filteredTenants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return organizationTenants.filter((tenant) => {
      const primaryRegion =
        tenant.region.split("/")[0]?.trim() || tenant.region;
      if (
        verificationFilter !== "all" &&
        tenant.verifiedStatus !== verificationFilter
      )
        return false;
      if (riskFilter !== "all" && tenant.riskLevel !== riskFilter) return false;
      if (regionFilter !== "all" && primaryRegion !== regionFilter)
        return false;
      if (
        normalizedQuery &&
        !verificationSearchText(tenant).includes(normalizedQuery)
      )
        return false;
      return true;
    });
  }, [
    organizationTenants,
    query,
    regionFilter,
    riskFilter,
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
  const pendingCount = organizationTenants.filter(
    (tenant) => tenant.verifiedStatus === "pending",
  ).length;
  const overdueCount = organizationTenants.filter(
    (tenant) =>
      tenant.verifiedStatus === "pending" &&
      daysSince(tenant.verificationSubmittedAt) >= 3,
  ).length;
  const verifiedCount = organizationTenants.filter(
    (tenant) => tenant.verifiedStatus === "verified",
  ).length;
  const rejectedCount = organizationTenants.filter(
    (tenant) => tenant.verifiedStatus === "rejected",
  ).length;
  const unverifiedCount = organizationTenants.filter(
    (tenant) => tenant.verifiedStatus === "unverified",
  ).length;
  const passRate = organizationTenants.length
    ? Math.round((verifiedCount / organizationTenants.length) * 100)
    : 0;

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, query, regionFilter, riskFilter, verificationFilter, viewMode]);

  function handleReset() {
    setQuery("");
    setVerificationFilter("all");
    setRiskFilter("all");
    setRegionFilter("all");
  }

  async function handleApprove(row: VerificationRow) {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await approveTenantVerification(row.verificationId);
      await loadVerifications(true);
      toast({
        tone: "success",
        title: "已通过认证",
        description: `${row.displayName} 的实名认证已通过。`,
      });
    } catch (error) {
      toast({
        tone: "error",
        title: "操作失败",
        description:
          error instanceof Error ? error.message : "无法通过认证，请稍后重试。",
      });
    } finally {
      setActionBusy(false);
    }
  }

  function openReject(row: VerificationRow) {
    setRejectTarget(row);
    setRejectReason("");
    setRejectError(null);
  }

  function closeReject() {
    if (actionBusy) return;
    setRejectTarget(null);
    setRejectReason("");
    setRejectError(null);
  }

  async function submitReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejectTarget || actionBusy) return;

    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError("请填写驳回原因。");
      return;
    }

    setActionBusy(true);
    setRejectError(null);
    try {
      await rejectTenantVerification(rejectTarget.verificationId, reason);
      await loadVerifications(true);
      toast({
        tone: "success",
        title: "已驳回材料",
        description: `${rejectTarget.displayName} 的实名认证已驳回。`,
      });
      setRejectTarget(null);
      setRejectReason("");
    } catch (error) {
      setRejectError(
        error instanceof Error ? error.message : "驳回失败，请稍后重试。",
      );
    } finally {
      setActionBusy(false);
    }
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
    <div className="vx-page-stack vx-tenant-management-page vx-verification-page">
      <PageHeader
        icon="medal"
        title="实名认证"
        description="集中处理组织租户提交的企业资质认证，按待审、通过、驳回和未提交状态推进审核流转。"
      />

      <section className="vx-tenant-summary" aria-label="实名认证统计">
        <VerificationSummaryItem
          icon="buildings"
          label="组织总数"
          value={formatNumber(organizationTenants.length)}
          tags={[`待审 ${formatNumber(pendingCount)}`]}
        />
        <VerificationSummaryItem
          icon="clock"
          label="待审核"
          value={formatNumber(pendingCount)}
          tags={[`超 3 天 ${formatNumber(overdueCount)}`]}
          tone="amber"
        />
        <VerificationSummaryItem
          icon="check"
          label="已认证"
          value={formatNumber(verifiedCount)}
          tags={[`通过率 ${formatNumber(passRate)}%`]}
          tone="green"
        />
        <VerificationSummaryItem
          icon="warning"
          label="需补充"
          value={formatNumber(rejectedCount + unverifiedCount)}
          tags={[
            `驳回 ${formatNumber(rejectedCount)}`,
            `未提交 ${formatNumber(unverifiedCount)}`,
          ]}
          tone={rejectedCount ? "rose" : "green"}
        />
      </section>

      {verificationsTruncated ? (
        <Banner
          tone="warning"
          title="当前实名认证列表可能未展示全部数据"
          description="本次加载已达到单次读取上限（500 条），如未看到目标记录，请尝试缩小筛选范围（如按认证状态、地区等）重新查询。"
        />
      ) : null}

      <div className="vx-tenant-list-shell">
        <section className="vx-tenant-toolbar" aria-label="实名认证筛选">
          <ViewModeSwitch
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="实名认证展示方式"
          />
          <span className="vx-tenant-view-count">
            {formatNumber(filteredTenants.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索组织、编码、联系人、地区"
            className="vx-tenant-search vx-verification-search"
            aria-label="搜索实名认证"
          />
          <Button variant="outline" onClick={handleReset}>
            重置
          </Button>
          <div className="vx-tenant-filters">
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={verificationFilter}
              onChange={(event) =>
                setVerificationFilter(event.target.value as VerificationFilter)
              }
              aria-label="认证状态"
            >
              <option value="all">全部认证</option>
              <option value="pending">待审核</option>
              <option value="verified">已认证</option>
              <option value="rejected">已驳回</option>
              <option value="unverified">未认证</option>
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
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={regionFilter}
              onChange={(event) => setRegionFilter(event.target.value)}
              aria-label="所属区域"
            >
              <option value="all">全部区域</option>
              {regionOptions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </NativeSelect>
          </div>
          <ActionButton variant="outline" icon="medal" disabled>
            批量审核
          </ActionButton>
        </section>

        <section className="vx-tenant-directory" aria-label="实名认证清单">
          {loading ? (
            <header className="vx-tenant-directory__header">
              <span>读取中</span>
            </header>
          ) : null}

          {visibleTenants.length ? (
            viewMode === "list" ? (
              <VerificationListRows
                tenants={visibleTenants}
                startIndex={(Math.min(currentPage, pageCount) - 1) * pageSize}
                selectedTenantIds={selectedTenantIds}
                isPageSelected={isTenantPageSelected}
                actionBusy={actionBusy}
                onToggleTenant={toggleTenantSelection}
                onTogglePage={toggleTenantPageSelection}
                onApprove={handleApprove}
                onReject={openReject}
              />
            ) : (
              <VerificationCards
                tenants={visibleTenants}
                actionBusy={actionBusy}
                onApprove={handleApprove}
                onReject={openReject}
              />
            )
          ) : (
            <section className="vx-tenant-empty">
              <EmptyState
                title={loading ? "正在加载实名认证" : "没有匹配的实名认证"}
                description={
                  loading
                    ? "正在读取租户认证数据。"
                    : "清空筛选条件后可查看全部实名认证记录。"
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

          <VerificationPagination
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

      {rejectTarget ? (
        <DialogForm
          open
          title="驳回实名认证"
          description={`将驳回 ${rejectTarget.displayName}（${rejectTarget.tenantCode}）提交的实名材料，请填写驳回原因，租户可据此补充后重新提交。`}
          submitLabel="确认驳回"
          submitVariant="destructive"
          cancelLabel="放弃"
          submitting={actionBusy}
          submitDisabled={!rejectReason.trim()}
          onOpenChange={(open) => {
            if (!open) closeReject();
          }}
          onSubmit={(event) => void submitReject(event)}
        >
          <label className="vx-verification-reject-field">
            <span>驳回原因</span>
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="例如：营业执照照片模糊无法识别，请重新上传清晰彩色扫描件。"
              maxLength={255}
              rows={4}
              autoFocus
            />
          </label>
          {rejectError ? (
            <p className="vx-verification-reject-error" role="alert">
              {rejectError}
            </p>
          ) : null}
        </DialogForm>
      ) : null}
    </div>
  );
}
