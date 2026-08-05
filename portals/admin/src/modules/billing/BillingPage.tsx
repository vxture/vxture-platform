"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionButton,
  ActionMenu,
  Badge,
  Banner,
  BulkActionBar,
  Checkbox,
  EmptyState,
  FilterBar,
  Icon,
  Input,
  ListCardGrid,
  ListPageTemplate,
  MetricGrid,
  MetricListCard,
  NativeSelect,
  TableTitleCell,
} from "@vxture/design-system";
import { resolveStatusTone } from "@vxture/shared";
import { BILL_STATUS_TONE } from "@/modules/shared/status-tone";
import { ListPagination } from "@/modules/shared/ListPagination";
import type { IconName } from "@vxture/design-system";
import { exportRowsToCsv, type CsvColumn } from "@/lib/exportCsv";
import { isListTruncated } from "@/lib/list-truncation";
import { fetchBillingRecords, syncOfflineInvoice } from "@/api/admin-bff";
import type {
  BillingBillStatus,
  BillingBillType,
  BillingInvoiceStatus,
  BillingRecord,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { type PageSize } from "@/modules/shared/PageSizePicker";
import {
  canSyncOfflineInvoice,
  offlineInvoiceDisabledReason,
  OfflineInvoiceDialog,
} from "@/modules/billing/OfflineInvoiceDialog";
import {
  formatDate,
  formatNumber,
  joinClasses,
  typeLabel,
} from "@/modules/tenants/tenant-utils";

type ViewMode = "list" | "cards";
type BillStatusFilter = "all" | BillingBillStatus;
type InvoiceStatusFilter = "all" | BillingInvoiceStatus;
type BillTypeFilter = "all" | BillingBillType;
type TierFilter = "all" | "free" | "pro" | "enterprise" | "other";
type BillingExceptionFilter =
  | "all"
  | "attention"
  | "overdue_followup"
  | "discounted"
  | "adjust"
  | "supplement"
  | "cancelled"
  | "invoice_exception";

function formatCurrency(
  value: number,
  currency: string,
  maximumFractionDigits = 2,
) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: currency || "CNY",
    minimumFractionDigits: Math.min(2, maximumFractionDigits),
    maximumFractionDigits,
  }).format(value);
}

function billStatusLabel(status: BillingBillStatus) {
  if (status === "paying") return "支付中";
  if (status === "paid") return "已结清";
  if (status === "partial") return "部分收款";
  if (status === "cancelled") return "已作废";
  if (status === "overdue") return "逾期";
  return "待收款";
}

function billStatusIcon(status: BillingBillStatus): IconName {
  if (status === "paid") return "check";
  if (status === "cancelled") return "x";
  if (status === "overdue") return "warning";
  return "clock";
}

function billTypeLabel(type: BillingBillType) {
  if (type === "adjust") return "调整单";
  if (type === "supplement") return "补录单";
  if (type === "prepaid") return "预付费";
  return "正常账单";
}

function invoiceStatusLabel(status: BillingInvoiceStatus) {
  if (status === "applying") return "申请中";
  if (status === "auditing") return "审核中";
  if (status === "issued") return "已开票";
  if (status === "sending") return "寄送中";
  if (status === "finished") return "已完成";
  if (status === "rejected") return "已驳回";
  if (status === "red") return "已红冲";
  return "未开票";
}

function billingExceptionTags(bill: BillingRecord) {
  const tags: Array<{
    key: string;
    label: string;
    tone: string;
    title?: string;
  }> = [];

  if (bill.billType === "adjust") {
    const title = bill.operationRemark ?? undefined;
    tags.push({
      key: "adjust",
      label: "调整单",
      tone: "adjust",
      ...(title ? { title } : {}),
    });
  }
  if (bill.billType === "supplement") {
    const title = bill.operationRemark ?? undefined;
    tags.push({
      key: "supplement",
      label: "补录单",
      tone: "supplement",
      ...(title ? { title } : {}),
    });
  }
  if (bill.discountAmount > 0) {
    tags.push({
      key: "discounted",
      label: "已减免",
      tone: "discount",
      title: `减免 ${formatCurrency(bill.discountAmount, bill.currency)}`,
    });
  }
  if (bill.billStatus === "overdue") {
    tags.push({
      key: "overdue_followup",
      label: bill.operationRemark ? "逾期跟进" : "逾期待跟进",
      tone: "overdue",
      title: bill.operationRemark ?? "当前账单已逾期，尚未登记跟进原因。",
    });
  }
  if (bill.billStatus === "cancelled") {
    const title = bill.operationRemark ?? undefined;
    tags.push({
      key: "cancelled",
      label: "已作废",
      tone: "cancelled",
      ...(title ? { title } : {}),
    });
  }
  if (bill.invoiceStatus === "red" || bill.invoiceStatus === "rejected") {
    const title = bill.invoiceNo ?? undefined;
    tags.push({
      key: "invoice_exception",
      label: bill.invoiceStatus === "red" ? "发票红冲" : "发票驳回",
      tone: "invoice",
      ...(title ? { title } : {}),
    });
  }

  return tags;
}

function hasBillingException(bill: BillingRecord) {
  return billingExceptionTags(bill).length > 0;
}

function matchesBillingExceptionFilter(
  bill: BillingRecord,
  filter: BillingExceptionFilter,
) {
  if (filter === "all") return true;
  if (filter === "attention") return hasBillingException(bill);
  if (filter === "overdue_followup") return bill.billStatus === "overdue";
  if (filter === "discounted") return bill.discountAmount > 0;
  if (filter === "adjust") return bill.billType === "adjust";
  if (filter === "supplement") return bill.billType === "supplement";
  if (filter === "cancelled") return bill.billStatus === "cancelled";
  return bill.invoiceStatus === "red" || bill.invoiceStatus === "rejected";
}

function cycleLabel(cycle: string) {
  if (cycle === "yearly") return "年度";
  if (cycle === "monthly") return "月度";
  if (cycle === "once") return "一次性";
  return cycle || "未设置";
}

function tierFilterValue(record: BillingRecord): TierFilter {
  const tierName = (record.tierName ?? "").toLowerCase();
  if (tierName === "free" || record.tierName === "Free") return "free";
  if (tierName === "pro" || record.tierName === "Pro") return "pro";
  if (tierName === "enterprise" || record.tierName === "Enterprise")
    return "enterprise";
  return record.tierName ? "other" : "other";
}

function billingSearchText(record: BillingRecord) {
  return [
    record.id,
    record.billNo,
    record.orderNo,
    record.invoiceNo,
    record.tenantCode,
    record.tenantName,
    record.region,
    record.industry,
    record.servicePlanName,
    record.tierName,
    record.operatorName,
    record.operationRemark,
    billTypeLabel(record.billType),
    billStatusLabel(record.billStatus),
    invoiceStatusLabel(record.invoiceStatus),
    record.billStatus,
    record.invoiceStatus,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const billingCsvColumns: CsvColumn<BillingRecord>[] = [
  { label: "账单编号", value: (b) => b.billNo },
  { label: "订单编号", value: (b) => b.orderNo },
  { label: "租户编码", value: (b) => b.tenantCode },
  { label: "租户名称", value: (b) => b.tenantName },
  { label: "套餐", value: (b) => b.tierName ?? "" },
  { label: "账单类型", value: (b) => billTypeLabel(b.billType) },
  { label: "计费周期", value: (b) => cycleLabel(b.billCycle) },
  { label: "周期起", value: (b) => formatDate(b.cycleStartDate) },
  { label: "周期止", value: (b) => formatDate(b.cycleEndDate) },
  { label: "币种", value: (b) => b.currency },
  { label: "应收金额", value: (b) => b.payableAmount },
  { label: "原价金额", value: (b) => b.totalAmount },
  { label: "减免金额", value: (b) => b.discountAmount },
  { label: "已收金额", value: (b) => b.paidAmount },
  { label: "已开票金额", value: (b) => b.invoicedAmount },
  { label: "收款状态", value: (b) => billStatusLabel(b.billStatus) },
  { label: "发票状态", value: (b) => invoiceStatusLabel(b.invoiceStatus) },
  { label: "发票号", value: (b) => b.invoiceNo ?? "" },
  { label: "经办人", value: (b) => b.operatorName },
];

function BillingActionsMenu({
  bill,
  onSyncInvoice,
}: {
  bill: BillingRecord;
  onSyncInvoice: (bill: BillingRecord) => void;
}) {
  const router = useRouter();
  const invoiceDisabledReason = offlineInvoiceDisabledReason(bill) ?? undefined;

  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${bill.billNo} 账单操作`}
        items={[
          {
            id: "details",
            label: "账单详情",
            icon: "arrow-right",
            onSelect: () =>
              router.push(`/billing/${encodeURIComponent(bill.id)}`),
          },
          {
            id: "tenant",
            label: "查看租户",
            icon: "buildings",
            onSelect: () =>
              router.push(`/tenants/${encodeURIComponent(bill.tenantId)}`),
          },
          {
            id: "subscription",
            label: "查看订阅",
            icon: "star",
            disabled: !bill.subscriptionId,
            onSelect: () => {
              if (!bill.subscriptionId) return;
              router.push(
                `/subscriptions/${encodeURIComponent(bill.subscriptionId)}`,
              );
            },
          },
          {
            id: "order",
            label: "查看订单",
            icon: "table",
            disabled: !bill.subscriptionId,
            onSelect: () => {
              if (!bill.subscriptionId) return;
              router.push(`/orders/${encodeURIComponent(bill.subscriptionId)}`);
            },
          },
          {
            id: "invoice",
            label: "登记发票",
            icon: "key",
            disabled: !canSyncOfflineInvoice(bill),
            ...(invoiceDisabledReason ? { title: invoiceDisabledReason } : {}),
            onSelect: () => onSyncInvoice(bill),
          },
        ]}
      />
    </div>
  );
}

function BillingListRows({
  bills,
  startIndex,
  onSyncInvoice,
  selectedBillIds,
  isPageSelected,
  onToggleBill,
  onTogglePage,
}: {
  bills: BillingRecord[];
  startIndex: number;
  onSyncInvoice: (bill: BillingRecord) => void;
  selectedBillIds: Set<string>;
  isPageSelected: boolean;
  onToggleBill: (id: string, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
}) {
  const router = useRouter();
  const selectedOnPage = bills.filter((bill) =>
    selectedBillIds.has(bill.id),
  ).length;
  const isPagePartiallySelected =
    selectedOnPage > 0 && selectedOnPage < bills.length;

  return (
    <div
      className="vx-tenant-directory-list vx-billing-directory-list"
      role="region"
      aria-label="账单中心清单"
    >
      <div className="vx-tenant-directory-list__header">
        <span>
          <Checkbox
            className="vx-model-select-checkbox"
            checked={isPagePartiallySelected ? "indeterminate" : isPageSelected}
            onCheckedChange={(checked) => onTogglePage(checked === true)}
            aria-label="选择当前页账单"
          />
        </span>
        <span>#</span>
        <span>账单</span>
        <span>租户</span>
        <span>订阅套餐</span>
        <span>金额</span>
        <span>处理</span>
        <span>收款</span>
        <span>发票</span>
        <span>操作</span>
      </div>
      {bills.map((bill, index) => {
        const selected = selectedBillIds.has(bill.id);

        return (
          <div
            key={bill.id}
            className={joinClasses(
              "vx-tenant-directory-row",
              "vx-billing-operation-row",
              `vx-billing-row--${bill.billStatus}`,
              selected ? "vx-billing-operation-row--selected" : undefined,
            )}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (
                target.closest(
                  'button, input, select, textarea, a, [role="button"], [role="menu"], [role="menuitem"]',
                )
              )
                return;
              onToggleBill(bill.id, !selected);
            }}
          >
            <span className="vx-billing-operation-row__select">
              <Checkbox
                className="vx-model-select-checkbox"
                checked={selected}
                onCheckedChange={(checked) =>
                  onToggleBill(bill.id, checked === true)
                }
                aria-label={`选择账单 ${bill.billNo}`}
              />
            </span>
            <span className="vx-tenant-directory-row__index">
              {formatNumber(startIndex + index + 1)}
            </span>
            <TableTitleCell
              className="vx-billing-row__bill"
              title={bill.billNo}
              description={`${cycleLabel(bill.billCycle)} · ${formatDate(bill.cycleStartDate)} - ${formatDate(bill.cycleEndDate)}`}
              onTitleClick={() =>
                router.push(`/billing/${encodeURIComponent(bill.id)}`)
              }
            />
            <span className="vx-billing-row__tenant">
              <Icon
                name={bill.tenantType === "company" ? "buildings" : "user"}
                size="sm"
                fallback="placeholder"
              />
              <span>
                <strong>{bill.tenantName}</strong>
                <small>
                  {bill.tenantCode} · {typeLabel(bill.tenantType)}
                </small>
              </span>
            </span>
            <span className="vx-billing-row__plan">
              <span className="vx-tenant-directory-row__tag-line">
                <Badge
                  className={`vx-tenant-pill vx-billing-pill--tier-${tierFilterValue(bill)}`}
                >
                  {bill.tierName ?? "未关联"}
                </Badge>
              </span>
              <small>
                {bill.servicePlanName ?? bill.orderNo ?? "未关联订阅"}
              </small>
            </span>
            <span className="vx-billing-row__amount">
              <strong>
                {formatCurrency(bill.payableAmount, bill.currency)}
              </strong>
              <small>
                {bill.discountAmount > 0
                  ? `原价 ${formatCurrency(bill.totalAmount, bill.currency)} · 减免 ${formatCurrency(bill.discountAmount, bill.currency)}`
                  : `原价 ${formatCurrency(bill.totalAmount, bill.currency)}`}
              </small>
            </span>
            <span className="vx-billing-row__exception">
              {billingExceptionTags(bill).length ? (
                <span className="vx-billing-exception-tags">
                  {billingExceptionTags(bill).map((tag) => (
                    <Badge
                      key={tag.key}
                      className={`vx-tenant-pill vx-billing-exception-pill vx-billing-exception-pill--${tag.tone}`}
                      title={tag.title}
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </span>
              ) : (
                <small className="vx-billing-exception-empty">-</small>
              )}
              {bill.operationRemark ? (
                <small title={bill.operationRemark}>
                  {bill.operationRemark}
                </small>
              ) : null}
            </span>
            <span className="vx-billing-row__payment">
              <span className="vx-billing-status-line">
                <span
                  className={`vx-billing-status-dot vx-billing-status-dot--${bill.billStatus}`}
                  role="img"
                  aria-label={billStatusLabel(bill.billStatus)}
                >
                  <Icon
                    name={billStatusIcon(bill.billStatus)}
                    size="xs"
                    fallback="placeholder"
                  />
                </span>
                <Badge
                  className={`vx-tenant-pill vx-billing-pill--${bill.billStatus}`}
                >
                  {billStatusLabel(bill.billStatus)}
                </Badge>
              </span>
              <small>
                已收 {formatCurrency(bill.paidAmount, bill.currency)}
              </small>
            </span>
            <span className="vx-billing-row__invoice">
              <Badge
                className={`vx-tenant-pill vx-billing-pill--invoice-${bill.invoiceStatus}`}
              >
                {invoiceStatusLabel(bill.invoiceStatus)}
              </Badge>
              <small>
                {bill.invoiceNo ??
                  `已登记 ${formatCurrency(bill.invoicedAmount, bill.currency)}`}
              </small>
            </span>
            <BillingActionsMenu bill={bill} onSyncInvoice={onSyncInvoice} />
          </div>
        );
      })}
    </div>
  );
}

function BillingCards({
  bills,
  onSyncInvoice,
}: {
  bills: BillingRecord[];
  onSyncInvoice: (bill: BillingRecord) => void;
}) {
  const router = useRouter();

  return (
    <ListCardGrid aria-label="账单中心卡片">
      {bills.map((bill) => (
        <MetricListCard
          key={bill.id}
          icon="key"
          title={bill.billNo}
          description={`${bill.tenantName} · ${bill.tierName ?? "未关联套餐"}`}
          tone={resolveStatusTone(BILL_STATUS_TONE, bill.billStatus)}
          onClick={() => router.push(`/billing/${encodeURIComponent(bill.id)}`)}
          actions={
            <BillingActionsMenu bill={bill} onSyncInvoice={onSyncInvoice} />
          }
          badges={
            <>
              <Badge
                className={`vx-tenant-pill vx-billing-pill--${bill.billStatus}`}
              >
                {billStatusLabel(bill.billStatus)}
              </Badge>
              <Badge
                className={`vx-tenant-pill vx-billing-pill--invoice-${bill.invoiceStatus}`}
              >
                {invoiceStatusLabel(bill.invoiceStatus)}
              </Badge>
              {billingExceptionTags(bill).map((tag) => (
                <Badge
                  key={tag.key}
                  className={`vx-tenant-pill vx-billing-exception-pill vx-billing-exception-pill--${tag.tone}`}
                  title={tag.title}
                >
                  {tag.label}
                </Badge>
              ))}
            </>
          }
          note={bill.servicePlanName ?? bill.orderNo ?? "未关联订阅"}
          metrics={[
            {
              key: "payable",
              value: formatCurrency(bill.payableAmount, bill.currency),
              label: "账单应收",
            },
            {
              key: "paid",
              value: formatCurrency(bill.paidAmount, bill.currency),
              label: "已收金额",
            },
            {
              key: "invoiced",
              value: formatCurrency(bill.invoicedAmount, bill.currency),
              label: "已开票",
            },
          ]}
          footer={
            <>
              <span className="truncate">
                {formatDate(bill.cycleStartDate)} -{" "}
                {formatDate(bill.cycleEndDate)}
              </span>
              <span className="shrink-0">{bill.operatorName}</span>
            </>
          }
        />
      ))}
    </ListCardGrid>
  );
}

export function BillingPage() {
  const [bills, setBills] = useState<BillingRecord[]>([]);
  const [billsTruncated, setBillsTruncated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [billStatusFilter, setBillStatusFilter] =
    useState<BillStatusFilter>("all");
  const [invoiceStatusFilter, setInvoiceStatusFilter] =
    useState<InvoiceStatusFilter>("all");
  const [billTypeFilter, setBillTypeFilter] = useState<BillTypeFilter>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [exceptionFilter, setExceptionFilter] =
    useState<BillingExceptionFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<BillingRecord | null>(
    null,
  );
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationFeedback, setOperationFeedback] = useState<string | null>(
    null,
  );
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    fetchBillingRecords()
      .then((records) => {
        if (active) {
          setBills(records);
          setBillsTruncated(isListTruncated(records));
        }
      })
      .catch((error) => {
        if (active) {
          setBills([]);
          setBillsTruncated(false);
          setLoadError(
            error instanceof Error ? error.message : "账单数据读取失败",
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

  const filteredBills = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return bills.filter((bill) => {
      if (billStatusFilter !== "all" && bill.billStatus !== billStatusFilter)
        return false;
      if (
        invoiceStatusFilter !== "all" &&
        bill.invoiceStatus !== invoiceStatusFilter
      )
        return false;
      if (billTypeFilter !== "all" && bill.billType !== billTypeFilter)
        return false;
      if (tierFilter !== "all" && tierFilterValue(bill) !== tierFilter)
        return false;
      if (!matchesBillingExceptionFilter(bill, exceptionFilter)) return false;
      if (normalizedQuery && !billingSearchText(bill).includes(normalizedQuery))
        return false;
      return true;
    });
  }, [
    billStatusFilter,
    billTypeFilter,
    bills,
    exceptionFilter,
    invoiceStatusFilter,
    query,
    tierFilter,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredBills.length / pageSize));
  const activePage = Math.min(currentPage, pageCount);
  const visibleBills = filteredBills.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );
  const visibleBillIds = useMemo(
    () => visibleBills.map((bill) => bill.id),
    [visibleBills],
  );
  const selectedVisibleBillCount = visibleBillIds.filter((id) =>
    selectedBillIds.has(id),
  ).length;
  const isBillPageSelected =
    visibleBillIds.length > 0 &&
    selectedVisibleBillCount === visibleBillIds.length;
  const receivableAmount = bills.reduce(
    (sum, item) => sum + item.payableAmount,
    0,
  );
  const paidAmount = bills.reduce((sum, item) => sum + item.paidAmount, 0);
  const pendingCount = bills.filter(
    (item) =>
      item.billStatus === "unpaid" ||
      item.billStatus === "paying" ||
      item.billStatus === "partial" ||
      item.billStatus === "overdue",
  ).length;
  const invoicePendingCount = bills.filter(
    (item) =>
      item.invoiceStatus === "none" ||
      item.invoiceStatus === "applying" ||
      item.invoiceStatus === "auditing",
  ).length;
  const invoicedAmount = bills.reduce(
    (sum, item) => sum + item.invoicedAmount,
    0,
  );
  const exceptionCount = bills.filter(hasBillingException).length;
  const discountedAmount = bills.reduce(
    (sum, item) => sum + item.discountAmount,
    0,
  );
  const exceptionBillCount = bills.filter(
    (item) => item.billType === "adjust" || item.billType === "supplement",
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    billStatusFilter,
    billTypeFilter,
    exceptionFilter,
    invoiceStatusFilter,
    pageSize,
    query,
    tierFilter,
    viewMode,
  ]);

  function handleReset() {
    setQuery("");
    setBillStatusFilter("all");
    setInvoiceStatusFilter("all");
    setBillTypeFilter("all");
    setTierFilter("all");
    setExceptionFilter("all");
  }

  function toggleBillSelection(id: string, checked: boolean) {
    setSelectedBillIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleBillPageSelection(checked: boolean) {
    setSelectedBillIds((current) => {
      const next = new Set(current);
      visibleBillIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }

  function handleExportSelected() {
    const rows = filteredBills.filter((bill) => selectedBillIds.has(bill.id));
    exportRowsToCsv("billing-selected-export", billingCsvColumns, rows);
  }

  function clearBillSelection() {
    setSelectedBillIds(new Set());
  }

  function requestInvoiceSync(bill: BillingRecord) {
    setOperationError(null);
    setOperationFeedback(null);
    setInvoiceTarget(bill);
  }

  async function handleSyncOfflineInvoice(
    payload: Parameters<typeof syncOfflineInvoice>[1],
  ) {
    if (!invoiceTarget) return;

    setSubmittingInvoice(true);
    setOperationError(null);

    try {
      await syncOfflineInvoice(invoiceTarget.id, payload);
      const records = await fetchBillingRecords();
      setBills(records);
      setBillsTruncated(isListTruncated(records));
      setOperationFeedback("线下发票已完成同步登记。");
      setInvoiceTarget(null);
    } catch (error) {
      setOperationError(
        error instanceof Error
          ? error.message
          : "线下发票登记失败，请稍后重试。",
      );
    } finally {
      setSubmittingInvoice(false);
    }
  }

  return (
    <>
      <ListPageTemplate
        className="vx-tenant-management-page vx-billing-page"
        header={
          <PageHeader
            icon="key"
            eyebrow="财务结算"
            title="账单中心"
            description="运营侧查看租户账单、收款进度和线下发票处理结果；当前仅支持人工同步登记，不调用在线开票接口。"
          />
        }
        summary={
          <>
            {" "}
            <MetricGrid
              aria-label="账单中心统计"
              items={[
                {
                  id: "total",
                  icon: "key",
                  label: "账单总数",
                  value: formatNumber(bills.length),
                  tags: [
                    `筛选 ${formatNumber(filteredBills.length)}`,
                    `异常 ${formatNumber(exceptionCount)}`,
                  ],
                },
                {
                  id: "pending",
                  icon: "clock",
                  label: "待收款",
                  value: formatNumber(pendingCount),
                  tags: [
                    `逾期 ${formatNumber(bills.filter((item) => item.billStatus === "overdue").length)}`,
                  ],
                  tone: pendingCount ? "warning" : "success",
                },
                {
                  id: "receivable",
                  icon: "chart-bar",
                  label: "应收金额",
                  value: formatCurrency(receivableAmount, "CNY"),
                  tags: [
                    `已收 ${formatCurrency(paidAmount, "CNY")}`,
                    `减免 ${formatCurrency(discountedAmount, "CNY")}`,
                  ],
                  tone: "success",
                },
                {
                  id: "invoiced",
                  icon: "table",
                  label: "开票进度",
                  value: formatCurrency(invoicedAmount, "CNY"),
                  tags: [
                    `待处理 ${formatNumber(invoicePendingCount)}`,
                    `调整 ${formatNumber(exceptionBillCount)}`,
                  ],
                  tone: invoicePendingCount ? "warning" : "success",
                },
              ]}
            />
            {operationFeedback ? (
              <div className="vx-subscription-operation-feedback">
                {operationFeedback}
              </div>
            ) : null}
            {billsTruncated ? (
              <Banner
                tone="warning"
                title="当前账单列表可能未展示全部数据"
                description="本次加载已达到单次读取上限（500 条），如未看到目标账单，请尝试缩小筛选范围（如按状态、类型等）重新查询。"
              />
            ) : null}
          </>
        }
        filters={
          <FilterBar
            view={viewMode}
            onViewChange={setViewMode}
            count={formatNumber(filteredBills.length)}
            aria-label="账单筛选"
            search={
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索账单、租户、订单、发票"
                className="vx-tenant-search vx-billing-search"
                aria-label="搜索账单"
              />
            }
            onReset={handleReset}
            actions={
              <>
                <ActionButton
                  variant={selectedBillIds.size > 0 ? "default" : "outline"}
                  icon="arrow-down"
                  onClick={handleExportSelected}
                  disabled={selectedBillIds.size === 0}
                >
                  导出
                </ActionButton>
              </>
            }
          >
            <div className="vx-tenant-filters">
              <NativeSelect
                className="vx-tenant-select"
                value={billStatusFilter}
                onChange={(event) =>
                  setBillStatusFilter(event.target.value as BillStatusFilter)
                }
                aria-label="账单状态"
              >
                <option value="all">全部账单</option>
                <option value="unpaid">待收款</option>
                <option value="paying">支付中</option>
                <option value="partial">部分收款</option>
                <option value="paid">已结清</option>
                <option value="overdue">逾期</option>
                <option value="cancelled">已取消</option>
              </NativeSelect>
              <NativeSelect
                className="vx-tenant-select"
                value={invoiceStatusFilter}
                onChange={(event) =>
                  setInvoiceStatusFilter(
                    event.target.value as InvoiceStatusFilter,
                  )
                }
                aria-label="发票状态"
              >
                <option value="all">全部发票</option>
                <option value="none">未开票</option>
                <option value="applying">申请中</option>
                <option value="auditing">审核中</option>
                <option value="issued">已开票</option>
                <option value="sending">寄送中</option>
                <option value="finished">已完成</option>
                <option value="rejected">已驳回</option>
                <option value="red">已红冲</option>
              </NativeSelect>
              <NativeSelect
                className="vx-tenant-select"
                value={billTypeFilter}
                onChange={(event) =>
                  setBillTypeFilter(event.target.value as BillTypeFilter)
                }
                aria-label="账单类型"
              >
                <option value="all">全部类型</option>
                <option value="normal">正常账单</option>
                <option value="adjust">调整单</option>
                <option value="supplement">补录单</option>
                <option value="prepaid">预付费</option>
              </NativeSelect>
              <NativeSelect
                className="vx-tenant-select"
                value={exceptionFilter}
                onChange={(event) =>
                  setExceptionFilter(
                    event.target.value as BillingExceptionFilter,
                  )
                }
                aria-label="处理类型"
              >
                <option value="all">全部处理</option>
                <option value="attention">需关注</option>
                <option value="overdue_followup">逾期跟进</option>
                <option value="discounted">应收减免</option>
                <option value="adjust">调整单</option>
                <option value="supplement">补录单</option>
                <option value="cancelled">已作废</option>
                <option value="invoice_exception">发票异常</option>
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
          </FilterBar>
        }
        /* BulkActionBar 数据驱动：计数与"清除"由组件自己画，调用方只给动作清单。
         原先两者都要调用方手拼，于是每个列表页的计数文案与清除按钮各写一遍。 */
        bulkBar={
          selectedBillIds.size > 0 ? (
            <BulkActionBar
              count={selectedBillIds.size}
              actions={[
                {
                  id: "export",
                  label: "导出所选",
                  icon: "table",
                  onSelect: handleExportSelected,
                },
              ]}
              onClear={clearBillSelection}
            />
          ) : null
        }
        table={
          <section className="vx-tenant-directory" aria-label="账单清单">
            {loading ? (
              <header className="vx-tenant-directory__header">
                <span>读取中</span>
              </header>
            ) : null}

            {visibleBills.length ? (
              viewMode === "list" ? (
                <BillingListRows
                  bills={visibleBills}
                  startIndex={(activePage - 1) * pageSize}
                  onSyncInvoice={requestInvoiceSync}
                  selectedBillIds={selectedBillIds}
                  isPageSelected={isBillPageSelected}
                  onToggleBill={toggleBillSelection}
                  onTogglePage={toggleBillPageSelection}
                />
              ) : (
                <BillingCards
                  bills={visibleBills}
                  onSyncInvoice={requestInvoiceSync}
                />
              )
            ) : (
              <section className="vx-tenant-empty">
                <EmptyState
                  title={
                    loading
                      ? "正在加载账单"
                      : loadError
                        ? "账单数据读取失败"
                        : "没有匹配的账单"
                  }
                  description={
                    loading
                      ? "正在读取账单、收款和发票登记数据。"
                      : (loadError ?? "清空筛选条件后可查看全部账单记录。")
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
          </section>
        }
        footer={
          <ListPagination
            currentPage={activePage}
            pageCount={pageCount}
            total={filteredBills.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onPageChange={(page) =>
              setCurrentPage(Math.min(Math.max(page, 1), pageCount))
            }
          />
        }
      />

      {invoiceTarget ? (
        <OfflineInvoiceDialog
          bill={invoiceTarget}
          busy={submittingInvoice}
          error={operationError}
          onCancel={() => {
            if (!submittingInvoice) setInvoiceTarget(null);
          }}
          onSubmit={handleSyncOfflineInvoice}
        />
      ) : null}
    </>
  );
}
