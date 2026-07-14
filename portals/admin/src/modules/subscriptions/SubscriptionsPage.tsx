"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banner,
  Icon,
  ActionMenu,
  Badge,
  Button,
  BulkActionBar,
  Checkbox,
  Input,
  NativeSelect,
  Pagination as DsPagination,
  ActionButton,
  EmptyState,
  ViewModeSwitch,
} from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import { exportRowsToCsv, type CsvColumn } from "@/lib/exportCsv";
import { isListTruncated } from "@/lib/list-truncation";
import {
  fetchSubscriptionOperations,
  submitSubscriptionOperation,
} from "@/api/admin-bff";
import type {
  SubscriptionOperationAction,
  SubscriptionOperationQuotaRisk,
  SubscriptionOperationRecord,
  SubscriptionOperationStatus,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import {
  PageSizePicker as AdminPageSizePicker,
  type PageSize,
} from "@/modules/shared/PageSizePicker";
import {
  canRunSubscriptionAction,
  SubscriptionOperationDialog,
  subscriptionActionDisabledReason,
  subscriptionActionIcon,
  subscriptionActionLabel,
  subscriptionToggleAction,
} from "@/modules/subscriptions/SubscriptionOperationDialog";
import {
  formatDate,
  formatMoney,
  formatNumber,
  joinClasses,
  typeLabel,
} from "@/modules/tenants/tenant-utils";

type ViewMode = "list" | "cards";
type StatusFilter = "all" | SubscriptionOperationStatus;
type TierFilter = "all" | "free" | "pro" | "enterprise" | "other";
type RiskFilter = "all" | SubscriptionOperationQuotaRisk;
type RenewFilter = "all" | "auto" | "manual";

function subscriptionStatusLabel(status: SubscriptionOperationStatus) {
  if (status === "trial") return "试用";
  if (status === "active") return "已生效";
  if (status === "expiring") return "即将到期";
  if (status === "overdue") return "逾期";
  if (status === "suspended") return "暂停";
  return "已取消";
}

function subscriptionStatusIcon(status: SubscriptionOperationStatus): IconName {
  if (status === "active") return "check";
  if (status === "trial" || status === "expiring") return "clock";
  if (status === "cancelled") return "x";
  return "warning";
}

function cycleLabel(cycle: SubscriptionOperationRecord["cycleType"]) {
  if (cycle === "yearly") return "年付";
  if (cycle === "once") return "一次性";
  return "月付";
}

function quotaRiskLabel(risk: SubscriptionOperationQuotaRisk) {
  if (risk === "danger") return "高风险";
  if (risk === "warning") return "需关注";
  return "正常";
}

function tierFilterValue(record: SubscriptionOperationRecord): TierFilter {
  const tierName = record.tierName.toLowerCase();
  if (tierName === "free" || record.servicePlanCode === "starter")
    return "free";
  if (tierName === "pro" || record.servicePlanCode === "growth") return "pro";
  if (tierName === "enterprise" || record.servicePlanCode === "enterprise")
    return "enterprise";
  return "other";
}

function subscriptionSearchText(record: SubscriptionOperationRecord) {
  return [
    record.id,
    record.subscriptionCode,
    record.orderNo,
    record.tenantCode,
    record.tenantName,
    record.region,
    record.industry,
    record.solutionName,
    record.servicePlanCode,
    record.servicePlanName,
    record.tierName,
    record.operatorName,
    record.operationHint,
    record.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const SUBSCRIPTION_CSV_COLUMNS: CsvColumn<SubscriptionOperationRecord>[] = [
  { label: "订阅编号", value: (record) => record.subscriptionCode },
  { label: "订单号", value: (record) => record.orderNo ?? "" },
  { label: "租户编号", value: (record) => record.tenantCode },
  { label: "租户名称", value: (record) => record.tenantName },
  { label: "业务方案", value: (record) => record.solutionName },
  { label: "套餐", value: (record) => record.tierName },
  { label: "套餐编码", value: (record) => record.servicePlanCode },
  { label: "周期", value: (record) => cycleLabel(record.cycleType) },
  { label: "状态", value: (record) => subscriptionStatusLabel(record.status) },
  { label: "自动续期", value: (record) => (record.autoRenew ? "是" : "否") },
  { label: "配额使用率", value: (record) => record.quota.usageRate },
  {
    label: "配额风险",
    value: (record) => quotaRiskLabel(record.quota.risk),
  },
  { label: "席位", value: (record) => record.quota.maxUsers },
  { label: "货币", value: (record) => record.currency },
  { label: "支付金额", value: (record) => record.payAmount },
  { label: "月收入", value: (record) => record.monthlyRevenue },
  { label: "开始时间", value: (record) => record.startAt },
  { label: "结束时间", value: (record) => record.endAt ?? "" },
];

function SummaryItem({
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

function SubscriptionActionsMenu({
  subscription,
  onAction,
}: {
  subscription: SubscriptionOperationRecord;
  onAction: (
    subscription: SubscriptionOperationRecord,
    action: SubscriptionOperationAction,
  ) => void;
}) {
  const router = useRouter();
  const toggleAction = subscriptionToggleAction(subscription.status);

  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${subscription.tenantName} 订阅操作`}
        triggerClassName="vx-tenant-actions__trigger"
        triggerProps={{ title: "操作" }}
        items={[
          {
            id: "details",
            label: "查看详情",
            icon: <Icon name="arrow-right" size="xs" fallback="placeholder" />,
            onSelect: () =>
              router.push(
                `/subscriptions/${encodeURIComponent(subscription.id)}`,
              ),
          },
          {
            id: "tenant",
            label: "查看租户",
            icon: <Icon name="buildings" size="xs" fallback="placeholder" />,
            onSelect: () =>
              router.push(
                `/tenants/${encodeURIComponent(subscription.tenantId)}`,
              ),
          },
          {
            id: "plan",
            label: "调整套餐",
            icon: <Icon name="star" size="xs" fallback="placeholder" />,
            disabled: true,
          },
          {
            id: "renew",
            label: subscriptionActionLabel("renew"),
            icon: (
              <Icon
                name={subscriptionActionIcon("renew")}
                size="xs"
                fallback="placeholder"
              />
            ),
            disabled: !canRunSubscriptionAction("renew", subscription),
            title:
              subscriptionActionDisabledReason("renew", subscription) ??
              undefined,
            onSelect: () => onAction(subscription, "renew"),
          },
          {
            id: toggleAction,
            label: subscriptionActionLabel(toggleAction),
            icon: (
              <Icon
                name={subscriptionActionIcon(toggleAction)}
                size="xs"
                fallback="placeholder"
              />
            ),
            disabled: !canRunSubscriptionAction(toggleAction, subscription),
            title:
              subscriptionActionDisabledReason(toggleAction, subscription) ??
              undefined,
            onSelect: () => onAction(subscription, toggleAction),
          },
          {
            id: "cancel",
            label: subscriptionActionLabel("cancel"),
            icon: (
              <Icon
                name={subscriptionActionIcon("cancel")}
                size="xs"
                fallback="placeholder"
              />
            ),
            disabled: !canRunSubscriptionAction("cancel", subscription),
            title:
              subscriptionActionDisabledReason("cancel", subscription) ??
              undefined,
            danger: true,
            onSelect: () => onAction(subscription, "cancel"),
          },
        ]}
      />
    </div>
  );
}

function SubscriptionListRows({
  subscriptions,
  startIndex,
  selectedSubscriptionIds,
  isPageSelected,
  onAction,
  onToggleSubscription,
  onTogglePage,
}: {
  subscriptions: SubscriptionOperationRecord[];
  startIndex: number;
  selectedSubscriptionIds: Set<string>;
  isPageSelected: boolean;
  onAction: (
    subscription: SubscriptionOperationRecord,
    action: SubscriptionOperationAction,
  ) => void;
  onToggleSubscription: (id: string, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
}) {
  const router = useRouter();
  const selectedOnPage = subscriptions.filter((subscription) =>
    selectedSubscriptionIds.has(subscription.id),
  ).length;
  const isPagePartiallySelected =
    selectedOnPage > 0 && selectedOnPage < subscriptions.length;

  return (
    <div
      className="vx-tenant-directory-list vx-subscription-directory-list"
      role="region"
      aria-label="租户订阅运营清单"
    >
      <div className="vx-tenant-directory-list__header">
        <span>
          <Checkbox
            className="vx-model-select-checkbox"
            checked={isPagePartiallySelected ? "indeterminate" : isPageSelected}
            onCheckedChange={(checked) => onTogglePage(checked === true)}
            aria-label="选择当前页订阅"
          />
        </span>
        <span>序号</span>
        <span>租户</span>
        <span>业务方案</span>
        <span>套餐权益</span>
        <span>状态</span>
        <span>配额</span>
        <span>收入</span>
        <span>操作</span>
      </div>
      {subscriptions.map((subscription, index) => (
        <div
          key={subscription.id}
          className={joinClasses(
            "vx-tenant-directory-row",
            "vx-subscription-operation-row",
            `vx-subscription-row--${subscription.status}`,
            `vx-subscription-row--quota-${subscription.quota.risk}`,
            selectedSubscriptionIds.has(subscription.id)
              ? "vx-subscription-operation-row--selected"
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
            onToggleSubscription(
              subscription.id,
              !selectedSubscriptionIds.has(subscription.id),
            );
          }}
        >
          <span className="vx-subscription-operation-row__select">
            <Checkbox
              className="vx-model-select-checkbox"
              checked={selectedSubscriptionIds.has(subscription.id)}
              onClick={(event) => event.stopPropagation()}
              onCheckedChange={(checked) =>
                onToggleSubscription(subscription.id, checked === true)
              }
              aria-label={`选择 ${subscription.tenantName}`}
            />
          </span>
          <span className="vx-tenant-directory-row__index">
            {formatNumber(startIndex + index + 1)}
          </span>
          <span className="vx-subscription-row__tenant">
            <Icon
              name={
                subscription.tenantType === "company" ? "buildings" : "user"
              }
              size="sm"
              fallback="placeholder"
            />
            <span>
              <span className="vx-tenant-directory-row__title-line">
                <Button
                  variant="link"
                  className="vx-model-name-button"
                  onClick={() =>
                    router.push(
                      `/subscriptions/${encodeURIComponent(subscription.id)}`,
                    )
                  }
                >
                  {subscription.tenantName}
                </Button>
              </span>
              <small>
                {subscription.tenantCode} · {subscription.region}
              </small>
            </span>
          </span>
          <span className="vx-subscription-row__solution">
            <strong>{subscription.solutionName}</strong>
            <small>{subscription.industry}</small>
          </span>
          <span className="vx-subscription-row__plan">
            <span className="vx-tenant-directory-row__tag-line">
              <Badge
                className={`vx-tenant-pill vx-subscription-pill--tier-${tierFilterValue(subscription)}`}
              >
                {subscription.tierName}
              </Badge>
              <Badge className="vx-tenant-pill vx-subscription-pill--cycle">
                {cycleLabel(subscription.cycleType)}
              </Badge>
            </span>
            <small>
              {subscription.orderNo ?? subscription.subscriptionCode}
            </small>
          </span>
          <span className="vx-subscription-row__status">
            <span className="vx-subscription-status-line">
              <span
                className={`vx-subscription-status-dot vx-subscription-status-dot--${subscription.status}`}
                role="img"
                aria-label={subscriptionStatusLabel(subscription.status)}
              >
                <Icon
                  name={subscriptionStatusIcon(subscription.status)}
                  size="xs"
                  fallback="placeholder"
                />
              </span>
              <Badge
                className={`vx-tenant-pill vx-subscription-pill--${subscription.status}`}
              >
                {subscriptionStatusLabel(subscription.status)}
              </Badge>
            </span>
            <small>
              {formatDate(subscription.startAt)} -{" "}
              {formatDate(subscription.endAt)}
            </small>
          </span>
          <span className="vx-subscription-row__quota">
            <strong>{formatNumber(subscription.quota.usageRate)}%</strong>
            <small>
              {quotaRiskLabel(subscription.quota.risk)} ·{" "}
              {formatNumber(subscription.quota.maxUsers)} 席位
            </small>
          </span>
          <span className="vx-subscription-row__revenue">
            <strong>{formatMoney(subscription.monthlyRevenue)}</strong>
            <small>
              {subscription.autoRenew ? "自动续期" : subscription.operationHint}
            </small>
          </span>
          <SubscriptionActionsMenu
            subscription={subscription}
            onAction={onAction}
          />
        </div>
      ))}
    </div>
  );
}

function SubscriptionCards({
  subscriptions,
  onAction,
}: {
  subscriptions: SubscriptionOperationRecord[];
  onAction: (
    subscription: SubscriptionOperationRecord,
    action: SubscriptionOperationAction,
  ) => void;
}) {
  const router = useRouter();

  return (
    <div
      className="vx-tenant-directory-cards vx-subscription-cards"
      aria-label="租户订阅运营卡片"
    >
      {subscriptions.map((subscription) => (
        <article
          key={subscription.id}
          className={joinClasses(
            "vx-tenant-directory-card",
            `vx-subscription-card--${subscription.status}`,
          )}
          role="button"
          tabIndex={0}
          onClick={() =>
            router.push(`/subscriptions/${encodeURIComponent(subscription.id)}`)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter")
              router.push(
                `/subscriptions/${encodeURIComponent(subscription.id)}`,
              );
          }}
        >
          <header>
            <Icon
              name={
                subscription.tenantType === "company" ? "buildings" : "user"
              }
              size="lg"
              fallback="placeholder"
            />
            <div>
              <strong>{subscription.tenantName}</strong>
              <span>
                {subscription.tenantCode} · {typeLabel(subscription.tenantType)}
              </span>
            </div>
            <SubscriptionActionsMenu
              subscription={subscription}
              onAction={onAction}
            />
          </header>
          <div className="vx-tenant-directory-card__badges">
            <Badge
              className={`vx-tenant-pill vx-subscription-pill--${subscription.status}`}
            >
              {subscriptionStatusLabel(subscription.status)}
            </Badge>
            <Badge
              className={`vx-tenant-pill vx-subscription-pill--tier-${tierFilterValue(subscription)}`}
            >
              {subscription.tierName}
            </Badge>
            <Badge
              className={`vx-tenant-pill vx-subscription-pill--quota-${subscription.quota.risk}`}
            >
              {quotaRiskLabel(subscription.quota.risk)}
            </Badge>
          </div>
          <p className="vx-subscription-card__solution">
            {subscription.solutionName} · {subscription.servicePlanName}
          </p>
          <div className="vx-tenant-directory-card__metrics">
            <span>
              <b>{formatNumber(subscription.quota.usageRate)}%</b>
              <small>配额消耗</small>
            </span>
            <span>
              <b>{formatNumber(subscription.quota.maxUsers)}</b>
              <small>席位</small>
            </span>
            <span>
              <b>{formatMoney(subscription.monthlyRevenue)}</b>
              <small>月收入</small>
            </span>
          </div>
          <footer>
            <span>{subscription.operationHint}</span>
            <strong>
              {formatDate(subscription.startAt)} -{" "}
              {formatDate(subscription.endAt)}
            </strong>
          </footer>
        </article>
      ))}
    </div>
  );
}

function Pagination({
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
        共 {formatNumber(total)} 条订阅记录
      </span>
      <div className="vx-tenant-pagination__actions">
        <AdminPageSizePicker value={pageSize} onChange={onPageSizeChange} />
        <DsPagination
          className="vx-tenant-pagination__pager"
          page={currentPage}
          pageCount={pageCount}
          onPageChange={onPageChange}
        />
      </div>
    </footer>
  );
}

export function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<
    SubscriptionOperationRecord[]
  >([]);
  const [subscriptionsTruncated, setSubscriptionsTruncated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState<
    Set<string>
  >(() => new Set());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [renewFilter, setRenewFilter] = useState<RenewFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<{
    subscription: SubscriptionOperationRecord;
    action: SubscriptionOperationAction;
  } | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationFeedback, setOperationFeedback] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    fetchSubscriptionOperations()
      .then((records) => {
        if (active) {
          setSubscriptions(records);
          setSubscriptionsTruncated(isListTruncated(records));
        }
      })
      .catch((error) => {
        if (active) {
          setSubscriptions([]);
          setSubscriptionsTruncated(false);
          setLoadError(
            error instanceof Error ? error.message : "订阅数据读取失败",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredSubscriptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return subscriptions.filter((subscription) => {
      if (statusFilter !== "all" && subscription.status !== statusFilter)
        return false;
      if (tierFilter !== "all" && tierFilterValue(subscription) !== tierFilter)
        return false;
      if (riskFilter !== "all" && subscription.quota.risk !== riskFilter)
        return false;
      if (renewFilter === "auto" && !subscription.autoRenew) return false;
      if (renewFilter === "manual" && subscription.autoRenew) return false;
      if (
        normalizedQuery &&
        !subscriptionSearchText(subscription).includes(normalizedQuery)
      )
        return false;
      return true;
    });
  }, [query, renewFilter, riskFilter, statusFilter, subscriptions, tierFilter]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredSubscriptions.length / pageSize),
  );
  const activePage = Math.min(currentPage, pageCount);
  const visibleSubscriptions = filteredSubscriptions.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );
  const visibleSubscriptionIds = visibleSubscriptions.map(
    (subscription) => subscription.id,
  );
  const selectedVisibleSubscriptionCount = visibleSubscriptionIds.filter((id) =>
    selectedSubscriptionIds.has(id),
  ).length;
  const isSubscriptionPageSelected =
    visibleSubscriptionIds.length > 0 &&
    selectedVisibleSubscriptionCount === visibleSubscriptionIds.length;
  const effectiveCount = subscriptions.filter(
    (item) => item.status === "active" || item.status === "expiring",
  ).length;
  const followUpCount = subscriptions.filter(
    (item) =>
      item.status === "trial" ||
      item.status === "expiring" ||
      item.status === "overdue" ||
      item.quota.risk !== "normal",
  ).length;
  const dangerQuotaCount = subscriptions.filter(
    (item) => item.quota.risk === "danger",
  ).length;
  const warningQuotaCount = subscriptions.filter(
    (item) => item.quota.risk === "warning",
  ).length;
  const monthlyRevenue = subscriptions.reduce(
    (sum, item) => sum + item.monthlyRevenue,
    0,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    pageSize,
    query,
    renewFilter,
    riskFilter,
    statusFilter,
    tierFilter,
    viewMode,
  ]);

  function handleReset() {
    setQuery("");
    setStatusFilter("all");
    setTierFilter("all");
    setRiskFilter("all");
    setRenewFilter("all");
  }

  function requestSubscriptionAction(
    subscription: SubscriptionOperationRecord,
    action: SubscriptionOperationAction,
  ) {
    setOperationError(null);
    setOperationFeedback(null);
    setActionTarget({ subscription, action });
  }

  function toggleSubscriptionSelection(id: string, checked: boolean) {
    setSelectedSubscriptionIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function toggleSubscriptionPageSelection(checked: boolean) {
    setSelectedSubscriptionIds((current) => {
      const next = new Set(current);
      for (const id of visibleSubscriptionIds) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  }

  const selectedSubscriptions = subscriptions.filter((subscription) =>
    selectedSubscriptionIds.has(subscription.id),
  );

  function clearSubscriptionSelection() {
    setSelectedSubscriptionIds(new Set());
  }

  function handleExportSelectedSubscriptions() {
    exportRowsToCsv(
      "subscriptions-export",
      SUBSCRIPTION_CSV_COLUMNS,
      selectedSubscriptions,
    );
  }

  function handleExportAllSubscriptions() {
    exportRowsToCsv(
      "subscriptions-export",
      SUBSCRIPTION_CSV_COLUMNS,
      filteredSubscriptions,
    );
  }

  async function handleSubmitSubscriptionAction(reason: string) {
    if (!actionTarget) return;

    setSubmittingAction(true);
    setOperationError(null);

    try {
      await submitSubscriptionOperation(actionTarget.subscription.id, {
        action: actionTarget.action,
        reason,
      });
      const records = await fetchSubscriptionOperations();
      setSubscriptions(records);
      setSubscriptionsTruncated(isListTruncated(records));
      setOperationFeedback(
        `${subscriptionActionLabel(actionTarget.action)}已完成。`,
      );
      setActionTarget(null);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "订阅操作失败，请稍后重试。",
      );
    } finally {
      setSubmittingAction(false);
    }
  }

  return (
    <div className="vx-page-stack vx-tenant-management-page vx-subscriptions-page">
      <PageHeader
        icon="star"
        eyebrow="订阅交易"
        title="租户订阅运营"
        description="运营侧管理租户服务权益实例，跟进试用转正、续期、暂停、配额风险和收入状态。"
      />

      <section className="vx-tenant-summary" aria-label="租户订阅运营统计">
        <SummaryItem
          icon="star"
          label="订阅实例"
          value={formatNumber(subscriptions.length)}
          tags={[`有效 ${formatNumber(effectiveCount)}`]}
        />
        <SummaryItem
          icon="warning"
          label="待跟进"
          value={formatNumber(followUpCount)}
          tags={[
            `逾期 ${formatNumber(subscriptions.filter((item) => item.status === "overdue").length)}`,
          ]}
          tone={followUpCount ? "amber" : "green"}
        />
        <SummaryItem
          icon="chart-bar"
          label="月收入"
          value={formatMoney(monthlyRevenue)}
          tags={["运营口径"]}
          tone="green"
        />
        <SummaryItem
          icon="shield-check"
          label="配额风险"
          value={formatNumber(dangerQuotaCount + warningQuotaCount)}
          tags={[`高风险 ${formatNumber(dangerQuotaCount)}`]}
          tone={
            dangerQuotaCount ? "rose" : warningQuotaCount ? "amber" : "green"
          }
        />
      </section>

      {operationFeedback ? (
        <div className="vx-subscription-operation-feedback">
          {operationFeedback}
        </div>
      ) : null}

      {subscriptionsTruncated ? (
        <Banner
          tone="warning"
          title="当前订阅列表可能未展示全部数据"
          description="本次加载已达到单次读取上限（500 条），如未看到目标订阅，请尝试缩小筛选范围（如按状态、套餐等）重新查询。"
        />
      ) : null}

      <div className="vx-tenant-list-shell">
        <section className="vx-tenant-toolbar" aria-label="租户订阅筛选">
          <ViewModeSwitch
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="租户订阅展示方式"
          />
          <span className="vx-tenant-view-count">
            {formatNumber(filteredSubscriptions.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索租户、方案、套餐、订单"
            className="vx-tenant-search vx-subscription-search"
            aria-label="搜索租户订阅"
          />
          <Button variant="outline" onClick={handleReset}>
            重置
          </Button>
          <ActionButton
            variant="outline"
            icon="arrow-down"
            onClick={handleExportAllSubscriptions}
            disabled={!filteredSubscriptions.length}
          >
            导出全部
          </ActionButton>
          <div className="vx-tenant-filters">
            <NativeSelect
              className="vx-tenant-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              aria-label="订阅状态"
            >
              <option value="all">全部状态</option>
              <option value="trial">试用</option>
              <option value="active">已生效</option>
              <option value="expiring">即将到期</option>
              <option value="overdue">逾期</option>
              <option value="suspended">暂停</option>
              <option value="cancelled">已取消</option>
            </NativeSelect>
            <NativeSelect
              className="vx-tenant-select"
              value={tierFilter}
              onChange={(event) =>
                setTierFilter(event.target.value as TierFilter)
              }
              aria-label="套餐版本"
            >
              <option value="all">全部套餐</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
              <option value="other">其他</option>
            </NativeSelect>
            <NativeSelect
              className="vx-tenant-select"
              value={riskFilter}
              onChange={(event) =>
                setRiskFilter(event.target.value as RiskFilter)
              }
              aria-label="配额风险"
            >
              <option value="all">全部配额</option>
              <option value="normal">正常</option>
              <option value="warning">需关注</option>
              <option value="danger">高风险</option>
            </NativeSelect>
            <NativeSelect
              className="vx-tenant-select"
              value={renewFilter}
              onChange={(event) =>
                setRenewFilter(event.target.value as RenewFilter)
              }
              aria-label="续期方式"
            >
              <option value="all">全部续期</option>
              <option value="auto">自动续期</option>
              <option value="manual">人工跟进</option>
            </NativeSelect>
          </div>
          <ActionButton variant="outline" icon="plus" disabled>
            开通订阅
          </ActionButton>
        </section>

        {selectedSubscriptions.length ? (
          <BulkActionBar
            selectedLabel={
              <>已选 {formatNumber(selectedSubscriptions.length)} 项</>
            }
            selectionActions={
              <>
                <Button
                  variant="outline"
                  onClick={handleExportSelectedSubscriptions}
                >
                  导出所选
                </Button>
                <Button variant="ghost" onClick={clearSubscriptionSelection}>
                  清除
                </Button>
              </>
            }
          />
        ) : null}

        <section className="vx-tenant-directory" aria-label="租户订阅清单">
          {loading ? (
            <header className="vx-tenant-directory__header">
              <span>读取中</span>
            </header>
          ) : null}

          {visibleSubscriptions.length ? (
            viewMode === "list" ? (
              <SubscriptionListRows
                subscriptions={visibleSubscriptions}
                startIndex={(activePage - 1) * pageSize}
                selectedSubscriptionIds={selectedSubscriptionIds}
                isPageSelected={isSubscriptionPageSelected}
                onAction={requestSubscriptionAction}
                onToggleSubscription={toggleSubscriptionSelection}
                onTogglePage={toggleSubscriptionPageSelection}
              />
            ) : (
              <SubscriptionCards
                subscriptions={visibleSubscriptions}
                onAction={requestSubscriptionAction}
              />
            )
          ) : (
            <section className="vx-tenant-empty">
              <EmptyState
                title={
                  loading
                    ? "正在加载租户订阅"
                    : loadError
                      ? "订阅数据读取失败"
                      : "没有匹配的订阅"
                }
                description={
                  loading
                    ? "正在读取租户订阅运营数据。"
                    : (loadError ?? "清空筛选条件后可查看全部订阅实例。")
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

          <Pagination
            currentPage={activePage}
            pageCount={pageCount}
            total={filteredSubscriptions.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onPageChange={(page) =>
              setCurrentPage(Math.min(Math.max(page, 1), pageCount))
            }
          />
        </section>
      </div>

      {actionTarget ? (
        <SubscriptionOperationDialog
          action={actionTarget.action}
          subscriptionName={`${actionTarget.subscription.tenantName} / ${actionTarget.subscription.tierName}`}
          busy={submittingAction}
          error={operationError}
          onCancel={() => {
            if (!submittingAction) setActionTarget(null);
          }}
          onSubmit={handleSubmitSubscriptionAction}
        />
      ) : null}
    </div>
  );
}
