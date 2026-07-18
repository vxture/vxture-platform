"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banner,
  Icon,
  ActionMenu,
  Badge,
  BulkActionBar,
  Button,
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
  confirmOrderOfflinePayment,
  fetchOrderOperations,
} from "@/api/admin-bff";
import type {
  OrderOperationRecord,
  OrderOperationStatus,
  OrderPaymentStatus,
  OrderPaySource,
} from "@/entities/console";
import {
  canConfirmOrderOfflinePayment,
  confirmOfflinePaymentDisabledReason,
  OrderOfflinePaymentDialog,
} from "@/modules/orders/OrderOfflinePaymentDialog";
import { PageHeader } from "@/modules/shared/PageHeader";
import {
  PageSizePicker as AdminPageSizePicker,
  type PageSize,
} from "@/modules/shared/PageSizePicker";
import {
  formatDate,
  formatNumber,
  joinClasses,
  typeLabel,
} from "@/modules/tenants/tenant-utils";

type ViewMode = "list" | "cards";
type OrderStatusFilter = "all" | OrderOperationStatus;
type PaymentStatusFilter = "all" | OrderPaymentStatus;
type PaySourceFilter = "all" | OrderPaySource;
type TierFilter = "all" | "free" | "pro" | "enterprise" | "other";

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: currency || "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

function cycleLabel(cycle: OrderOperationRecord["cycleType"]) {
  if (cycle === "yearly") return "年付";
  if (cycle === "once") return "一次性";
  return "月付";
}

function orderStatusLabel(status: OrderOperationStatus) {
  if (status === "pending") return "待付款";
  if (status === "pending_verify") return "待复核";
  if (status === "confirmed") return "已确认";
  if (status === "overdue") return "逾期";
  if (status === "closed") return "已关闭";
  if (status === "paid_unprovisioned") return "已付未开通";
  if (status === "partial_pending") return "部分收款·挂账";
  return "异常";
}

function orderStatusIcon(status: OrderOperationStatus): IconName {
  if (status === "confirmed") return "check";
  if (status === "pending" || status === "pending_verify") return "clock";
  if (status === "closed") return "x";
  return "warning";
}

// 关注态置顶（product_321 §4.2）：钱在途/钱到了没开通/收了一半的单排最前，
// 运营一眼看到需要动手的行；同层内按创建时间倒序（保持既有习惯）。
const ATTENTION_RANK: Partial<Record<OrderOperationStatus, number>> = {
  pending_verify: 0,
  paid_unprovisioned: 1,
  partial_pending: 2,
};

function attentionRank(status: OrderOperationStatus): number {
  return ATTENTION_RANK[status] ?? 9;
}

function paymentStatusLabel(status: OrderPaymentStatus) {
  if (status === "not_required") return "无需支付";
  if (status === "unpaid") return "未支付";
  if (status === "pending") return "支付中";
  if (status === "pending_verify") return "线下待核";
  if (status === "paid") return "已支付";
  if (status === "partial") return "部分支付";
  if (status === "failed") return "支付失败";
  if (status === "closed") return "已关闭";
  return "退款中";
}

function paySourceLabel(source: OrderPaySource) {
  if (source === "online") return "线上";
  if (source === "offline") return "线下";
  return "无";
}

function tierFilterValue(record: OrderOperationRecord): TierFilter {
  const tierName = record.tierName.toLowerCase();
  if (tierName === "free" || record.servicePlanCode === "starter")
    return "free";
  if (tierName === "pro" || record.servicePlanCode === "growth") return "pro";
  if (tierName === "enterprise" || record.servicePlanCode === "enterprise")
    return "enterprise";
  return "other";
}

const ORDER_CSV_COLUMNS: readonly CsvColumn<OrderOperationRecord>[] = [
  { label: "订单号", value: (o) => o.orderNo },
  { label: "账单号", value: (o) => o.billNo ?? "" },
  { label: "租户编码", value: (o) => o.tenantCode },
  { label: "租户名称", value: (o) => o.tenantName },
  { label: "业务方案", value: (o) => o.solutionName },
  { label: "套餐", value: (o) => o.servicePlanName },
  { label: "版本", value: (o) => o.tierName },
  { label: "计费周期", value: (o) => cycleLabel(o.cycleType) },
  { label: "订单金额", value: (o) => o.amount },
  { label: "已收金额", value: (o) => o.paidAmount },
  { label: "币种", value: (o) => o.currency },
  { label: "订单状态", value: (o) => orderStatusLabel(o.orderStatus) },
  { label: "支付状态", value: (o) => paymentStatusLabel(o.paymentStatus) },
  { label: "支付来源", value: (o) => paySourceLabel(o.paySource) },
  { label: "创建时间", value: (o) => o.createdAt },
];

function orderSearchText(record: OrderOperationRecord) {
  return [
    record.id,
    record.orderNo,
    record.billNo,
    record.paymentNo,
    record.tenantCode,
    record.tenantName,
    record.region,
    record.industry,
    record.solutionName,
    record.servicePlanName,
    record.tierName,
    record.operatorName,
    record.operationHint,
    record.orderStatus,
    record.paymentStatus,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

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

function OrderActionsMenu({
  order,
  onConfirmPayment,
}: {
  order: OrderOperationRecord;
  onConfirmPayment: (order: OrderOperationRecord) => void;
}) {
  const router = useRouter();

  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${order.orderNo} 订单操作`}
        triggerClassName="vx-tenant-actions__trigger"
        triggerProps={{ title: "操作" }}
        items={[
          {
            id: "details",
            label: "订单详情",
            icon: <Icon name="arrow-right" size="xs" fallback="placeholder" />,
            onSelect: () =>
              router.push(`/orders/${encodeURIComponent(order.id)}`),
          },
          {
            id: "tenant",
            label: "查看租户",
            icon: <Icon name="buildings" size="xs" fallback="placeholder" />,
            onSelect: () =>
              router.push(`/tenants/${encodeURIComponent(order.tenantId)}`),
          },
          {
            id: "confirm-payment",
            label: "确认收款",
            icon: <Icon name="check" size="xs" fallback="placeholder" />,
            disabled: !canConfirmOrderOfflinePayment(order),
            title: confirmOfflinePaymentDisabledReason(order) ?? undefined,
            onSelect: () => onConfirmPayment(order),
          },
          {
            id: "subscription",
            label: "查看订阅",
            icon: <Icon name="star" size="xs" fallback="placeholder" />,
            onSelect: () =>
              router.push(
                `/subscriptions/${encodeURIComponent(order.subscriptionId)}`,
              ),
          },
        ]}
      />
    </div>
  );
}

function OrderListRows({
  orders,
  startIndex,
  onConfirmPayment,
  selectedOrderIds,
  isPageSelected,
  onToggleOrder,
  onTogglePage,
}: {
  orders: OrderOperationRecord[];
  startIndex: number;
  onConfirmPayment: (order: OrderOperationRecord) => void;
  selectedOrderIds: Set<string>;
  isPageSelected: boolean;
  onToggleOrder: (id: string, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
}) {
  const router = useRouter();
  const selectedOnPage = orders.filter((order) =>
    selectedOrderIds.has(order.id),
  ).length;
  const isPagePartiallySelected =
    selectedOnPage > 0 && selectedOnPage < orders.length;

  return (
    <div
      className="vx-tenant-directory-list vx-order-directory-list"
      role="region"
      aria-label="订单管理清单"
    >
      <div className="vx-tenant-directory-list__header">
        <span>
          <Checkbox
            className="vx-model-select-checkbox"
            checked={isPagePartiallySelected ? "indeterminate" : isPageSelected}
            onCheckedChange={(checked) => onTogglePage(checked === true)}
            aria-label="选择当前页订单"
          />
        </span>
        <span>序号</span>
        <span>订单</span>
        <span>租户</span>
        <span>业务方案</span>
        <span>套餐</span>
        <span>金额</span>
        <span>状态</span>
        <span>操作</span>
      </div>
      {orders.map((order, index) => {
        const selected = selectedOrderIds.has(order.id);

        return (
          <div
            key={order.id}
            className={joinClasses(
              "vx-tenant-directory-row",
              "vx-order-operation-row",
              `vx-order-row--${order.orderStatus}`,
              selected ? "vx-order-operation-row--selected" : undefined,
            )}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (
                target.closest(
                  'button, input, select, textarea, a, [role="button"], [role="menu"], [role="menuitem"]',
                )
              )
                return;
              onToggleOrder(order.id, !selected);
            }}
          >
            <span className="vx-order-operation-row__select">
              <Checkbox
                className="vx-model-select-checkbox"
                checked={selected}
                onCheckedChange={(checked) =>
                  onToggleOrder(order.id, checked === true)
                }
                aria-label={`选择订单 ${order.orderNo}`}
              />
            </span>
            <span className="vx-tenant-directory-row__index">
              {formatNumber(startIndex + index + 1)}
            </span>
            <span className="vx-order-row__order">
              <span className="vx-tenant-directory-row__title-line">
                <Button
                  variant="link"
                  className="vx-model-name-button"
                  onClick={() =>
                    router.push(`/orders/${encodeURIComponent(order.id)}`)
                  }
                >
                  {order.orderNo}
                </Button>
              </span>
              <small>
                {order.billNo ?? "未生成账单"} · {formatDate(order.createdAt)}
              </small>
            </span>
            <span className="vx-order-row__tenant">
              <Icon
                name={order.tenantType === "company" ? "buildings" : "user"}
                size="sm"
                fallback="placeholder"
              />
              <span>
                <strong>{order.tenantName}</strong>
                <small>
                  {order.tenantCode} · {typeLabel(order.tenantType)}
                </small>
              </span>
            </span>
            <span className="vx-order-row__solution">
              <strong>{order.solutionName}</strong>
              <small>
                {order.industry} · {order.region}
              </small>
            </span>
            <span className="vx-order-row__plan">
              <span className="vx-tenant-directory-row__tag-line">
                <Badge
                  className={`vx-tenant-pill vx-order-pill--tier-${tierFilterValue(order)}`}
                >
                  {order.tierName}
                </Badge>
                <Badge className="vx-tenant-pill vx-order-pill--source">
                  {cycleLabel(order.cycleType)}
                </Badge>
              </span>
              <small>{order.servicePlanName}</small>
            </span>
            <span className="vx-order-row__amount">
              <strong>{formatCurrency(order.amount, order.currency)}</strong>
              <small>
                已收 {formatCurrency(order.paidAmount, order.currency)}
              </small>
            </span>
            <span className="vx-order-row__status">
              <span className="vx-order-status-line">
                <span
                  className={`vx-order-status-dot vx-order-status-dot--${order.orderStatus}`}
                  role="img"
                  aria-label={orderStatusLabel(order.orderStatus)}
                >
                  <Icon
                    name={orderStatusIcon(order.orderStatus)}
                    size="xs"
                    fallback="placeholder"
                  />
                </span>
                <Badge
                  className={`vx-tenant-pill vx-order-pill--${order.orderStatus}`}
                >
                  {orderStatusLabel(order.orderStatus)}
                </Badge>
              </span>
              <small>
                {paymentStatusLabel(order.paymentStatus)} ·{" "}
                {paySourceLabel(order.paySource)}
              </small>
            </span>
            <OrderActionsMenu
              order={order}
              onConfirmPayment={onConfirmPayment}
            />
          </div>
        );
      })}
    </div>
  );
}

function OrderCards({
  orders,
  onConfirmPayment,
}: {
  orders: OrderOperationRecord[];
  onConfirmPayment: (order: OrderOperationRecord) => void;
}) {
  const router = useRouter();

  return (
    <div
      className="vx-tenant-directory-cards vx-order-cards"
      aria-label="订单管理卡片"
    >
      {orders.map((order) => (
        <article
          key={order.id}
          className={joinClasses(
            "vx-tenant-directory-card",
            `vx-order-card--${order.orderStatus}`,
          )}
          role="button"
          tabIndex={0}
          onClick={() => router.push(`/orders/${encodeURIComponent(order.id)}`)}
          onKeyDown={(event) => {
            if (event.key === "Enter")
              router.push(`/orders/${encodeURIComponent(order.id)}`);
          }}
        >
          <header>
            <Icon name="table" size="lg" fallback="placeholder" />
            <div>
              <strong>{order.orderNo}</strong>
              <span>
                {order.tenantName} · {order.tierName}
              </span>
            </div>
            <OrderActionsMenu
              order={order}
              onConfirmPayment={onConfirmPayment}
            />
          </header>
          <div className="vx-tenant-directory-card__badges">
            <Badge
              className={`vx-tenant-pill vx-order-pill--${order.orderStatus}`}
            >
              {orderStatusLabel(order.orderStatus)}
            </Badge>
            <Badge
              className={`vx-tenant-pill vx-order-pill--payment-${order.paymentStatus}`}
            >
              {paymentStatusLabel(order.paymentStatus)}
            </Badge>
            <Badge className="vx-tenant-pill vx-order-pill--source">
              {paySourceLabel(order.paySource)}
            </Badge>
          </div>
          <p className="vx-order-card__solution">
            {order.solutionName} · {order.servicePlanName}
          </p>
          <div className="vx-tenant-directory-card__metrics">
            <span>
              <b>{formatCurrency(order.amount, order.currency)}</b>
              <small>订单金额</small>
            </span>
            <span>
              <b>{formatCurrency(order.paidAmount, order.currency)}</b>
              <small>已收金额</small>
            </span>
            <span>
              <b>{cycleLabel(order.cycleType)}</b>
              <small>计费周期</small>
            </span>
          </div>
          <footer>
            <span>{order.operationHint}</span>
            <strong>{formatDate(order.confirmedAt ?? order.updatedAt)}</strong>
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
        共 {formatNumber(total)} 条订单记录
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

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderOperationRecord[]>([]);
  const [ordersTruncated, setOrdersTruncated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [paymentFilter, setPaymentFilter] =
    useState<PaymentStatusFilter>("all");
  const [paySourceFilter, setPaySourceFilter] =
    useState<PaySourceFilter>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] =
    useState<OrderOperationRecord | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationFeedback, setOperationFeedback] = useState<string | null>(
    null,
  );
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    fetchOrderOperations()
      .then((records) => {
        if (active) {
          setOrders(records);
          setOrdersTruncated(isListTruncated(records));
        }
      })
      .catch((error) => {
        if (active) {
          setOrders([]);
          setOrdersTruncated(false);
          setLoadError(
            error instanceof Error ? error.message : "订单数据读取失败",
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

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return orders
      .filter((order) => {
        if (statusFilter !== "all" && order.orderStatus !== statusFilter)
          return false;
        if (paymentFilter !== "all" && order.paymentStatus !== paymentFilter)
          return false;
        if (paySourceFilter !== "all" && order.paySource !== paySourceFilter)
          return false;
        if (tierFilter !== "all" && tierFilterValue(order) !== tierFilter)
          return false;
        if (
          normalizedQuery &&
          !orderSearchText(order).includes(normalizedQuery)
        )
          return false;
        return true;
      })
      .sort(
        (a, b) => attentionRank(a.orderStatus) - attentionRank(b.orderStatus),
      );
  }, [orders, paymentFilter, paySourceFilter, query, statusFilter, tierFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const activePage = Math.min(currentPage, pageCount);
  const visibleOrders = filteredOrders.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );
  const visibleOrderIds = useMemo(
    () => visibleOrders.map((order) => order.id),
    [visibleOrders],
  );
  const selectedVisibleOrderCount = visibleOrderIds.filter((id) =>
    selectedOrderIds.has(id),
  ).length;
  const isOrderPageSelected =
    visibleOrderIds.length > 0 &&
    selectedVisibleOrderCount === visibleOrderIds.length;
  const pendingCount = orders.filter(
    (item) =>
      item.orderStatus === "pending" || item.orderStatus === "pending_verify",
  ).length;
  const confirmedAmount = orders
    .filter((item) => item.orderStatus === "confirmed")
    .reduce((sum, item) => sum + item.paidAmount, 0);
  const overdueCount = orders.filter(
    (item) => item.orderStatus === "overdue",
  ).length;
  const abnormalCount = orders.filter(
    (item) => item.orderStatus === "abnormal",
  ).length;
  const attentionCount = orders.filter(
    (item) =>
      item.orderStatus === "paid_unprovisioned" ||
      item.orderStatus === "partial_pending",
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    pageSize,
    paymentFilter,
    paySourceFilter,
    query,
    statusFilter,
    tierFilter,
    viewMode,
  ]);

  function handleReset() {
    setQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setPaySourceFilter("all");
    setTierFilter("all");
  }

  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedOrderIds.has(order.id)),
    [orders, selectedOrderIds],
  );

  function clearOrderSelection() {
    setSelectedOrderIds(new Set());
  }

  function toggleOrderSelection(id: string, checked: boolean) {
    setSelectedOrderIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleOrderPageSelection(checked: boolean) {
    setSelectedOrderIds((current) => {
      const next = new Set(current);
      visibleOrderIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }

  function requestConfirmPayment(order: OrderOperationRecord) {
    setOperationError(null);
    setOperationFeedback(null);
    setPaymentTarget(order);
  }

  async function handleConfirmOfflinePayment(
    payload: Parameters<typeof confirmOrderOfflinePayment>[1],
  ) {
    if (!paymentTarget) return;

    setSubmittingPayment(true);
    setOperationError(null);

    try {
      await confirmOrderOfflinePayment(paymentTarget.id, payload);
      const records = await fetchOrderOperations();
      setOrders(records);
      setOrdersTruncated(isListTruncated(records));
      setOperationFeedback("线下收款已确认。");
      setPaymentTarget(null);
    } catch (error) {
      setOperationError(
        error instanceof Error
          ? error.message
          : "确认线下收款失败，请稍后重试。",
      );
    } finally {
      setSubmittingPayment(false);
    }
  }

  return (
    <div className="vx-page-stack vx-tenant-management-page vx-orders-page">
      <PageHeader
        icon="table"
        eyebrow="订阅交易"
        title="订单管理"
        description="运营侧查看租户订阅订单、账单和收款状态，支撑续期确认、异常处理和财务对账。"
      />

      <section className="vx-tenant-summary" aria-label="订单管理统计">
        <SummaryItem
          icon="table"
          label="订单总数"
          value={formatNumber(orders.length)}
          tags={[`筛选 ${formatNumber(filteredOrders.length)}`]}
        />
        <SummaryItem
          icon="clock"
          label="待处理"
          value={formatNumber(pendingCount)}
          tags={[
            `待复核 ${formatNumber(orders.filter((item) => item.orderStatus === "pending_verify").length)}`,
          ]}
          tone={pendingCount ? "amber" : "green"}
        />
        <SummaryItem
          icon="chart-bar"
          label="已确认金额"
          value={formatCurrency(confirmedAmount, "CNY")}
          tags={["运营口径"]}
          tone="green"
        />
        <SummaryItem
          icon="warning"
          label="异常逾期"
          value={formatNumber(overdueCount + abnormalCount + attentionCount)}
          tags={[
            `异常 ${formatNumber(abnormalCount)}`,
            `付未开通/挂账 ${formatNumber(attentionCount)}`,
          ]}
          tone={
            overdueCount || abnormalCount || attentionCount ? "rose" : "green"
          }
        />
      </section>

      {operationFeedback ? (
        <div className="vx-subscription-operation-feedback">
          {operationFeedback}
        </div>
      ) : null}

      {ordersTruncated ? (
        <Banner
          tone="warning"
          title="当前订单列表可能未展示全部数据"
          description="本次加载已达到单次读取上限（500 条），如未看到目标订单，请尝试缩小筛选范围（如按状态、支付方式等）重新查询。"
        />
      ) : null}

      <div className="vx-tenant-list-shell">
        <section className="vx-tenant-toolbar" aria-label="订单筛选">
          <ViewModeSwitch
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="订单展示方式"
          />
          <span className="vx-tenant-view-count">
            {formatNumber(filteredOrders.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索订单、租户、方案、账单"
            className="vx-tenant-search vx-order-search"
            aria-label="搜索订单"
          />
          <Button variant="outline" onClick={handleReset}>
            重置
          </Button>
          <div className="vx-tenant-filters">
            <NativeSelect
              className="vx-tenant-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as OrderStatusFilter)
              }
              aria-label="订单状态"
            >
              <option value="all">全部订单</option>
              <option value="pending">待付款</option>
              <option value="pending_verify">待复核</option>
              <option value="confirmed">已确认</option>
              <option value="overdue">逾期</option>
              <option value="closed">已关闭</option>
              <option value="abnormal">异常</option>
            </NativeSelect>
            <NativeSelect
              className="vx-tenant-select"
              value={paymentFilter}
              onChange={(event) =>
                setPaymentFilter(event.target.value as PaymentStatusFilter)
              }
              aria-label="支付状态"
            >
              <option value="all">全部支付</option>
              <option value="not_required">无需支付</option>
              <option value="unpaid">未支付</option>
              <option value="pending">支付中</option>
              <option value="pending_verify">线下待核</option>
              <option value="paid">已支付</option>
              <option value="partial">部分支付</option>
              <option value="failed">支付失败</option>
              <option value="closed">已关闭</option>
              <option value="refunding">退款中</option>
            </NativeSelect>
            <NativeSelect
              className="vx-tenant-select"
              value={paySourceFilter}
              onChange={(event) =>
                setPaySourceFilter(event.target.value as PaySourceFilter)
              }
              aria-label="支付来源"
            >
              <option value="all">全部来源</option>
              <option value="online">线上</option>
              <option value="offline">线下</option>
              <option value="none">无</option>
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
          </div>
          <ActionButton
            variant="outline"
            icon="arrow-down"
            onClick={() =>
              exportRowsToCsv(
                "orders-export",
                ORDER_CSV_COLUMNS,
                filteredOrders,
              )
            }
            disabled={filteredOrders.length === 0}
          >
            导出全部
          </ActionButton>
          <ActionButton variant="outline" icon="plus" disabled>
            补录订单
          </ActionButton>
        </section>

        {selectedOrderIds.size > 0 ? (
          <BulkActionBar
            selectedLabel={<>已选 {formatNumber(selectedOrderIds.size)} 项</>}
            selectionActions={
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    exportRowsToCsv(
                      "orders-export",
                      ORDER_CSV_COLUMNS,
                      selectedOrders,
                    )
                  }
                >
                  导出所选
                </Button>
                <Button variant="ghost" onClick={clearOrderSelection}>
                  清除
                </Button>
              </>
            }
          />
        ) : null}

        <section className="vx-tenant-directory" aria-label="订单清单">
          {loading ? (
            <header className="vx-tenant-directory__header">
              <span>读取中</span>
            </header>
          ) : null}

          {visibleOrders.length ? (
            viewMode === "list" ? (
              <OrderListRows
                orders={visibleOrders}
                startIndex={(activePage - 1) * pageSize}
                onConfirmPayment={requestConfirmPayment}
                selectedOrderIds={selectedOrderIds}
                isPageSelected={isOrderPageSelected}
                onToggleOrder={toggleOrderSelection}
                onTogglePage={toggleOrderPageSelection}
              />
            ) : (
              <OrderCards
                orders={visibleOrders}
                onConfirmPayment={requestConfirmPayment}
              />
            )
          ) : (
            <section className="vx-tenant-empty">
              <EmptyState
                title={
                  loading
                    ? "正在加载订单"
                    : loadError
                      ? "订单数据读取失败"
                      : "没有匹配的订单"
                }
                description={
                  loading
                    ? "正在读取订单、账单和支付状态。"
                    : (loadError ?? "清空筛选条件后可查看全部订单记录。")
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
            total={filteredOrders.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onPageChange={(page) =>
              setCurrentPage(Math.min(Math.max(page, 1), pageCount))
            }
          />
        </section>
      </div>

      {paymentTarget ? (
        <OrderOfflinePaymentDialog
          order={paymentTarget}
          busy={submittingPayment}
          error={operationError}
          onCancel={() => {
            if (!submittingPayment) setPaymentTarget(null);
          }}
          onSubmit={handleConfirmOfflinePayment}
        />
      ) : null}
    </div>
  );
}
