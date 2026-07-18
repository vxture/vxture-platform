"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ActionMenu,
  Badge,
  Banner,
  BulkActionBar,
  Button,
  Checkbox,
  DialogForm,
  Icon,
  Input,
  Label,
  NativeSelect,
  Pagination as DsPagination,
  Textarea,
  ActionButton,
  EmptyState,
  ViewModeSwitch,
} from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import { exportRowsToCsv, type CsvColumn } from "@/lib/exportCsv";
import { isListTruncated } from "@/lib/list-truncation";
import {
  AdminBffError,
  fetchPaymentOperations,
  rejectPayment,
  verifyPayment,
} from "@/api/admin-bff";
import type {
  OrderOfflinePaymentType,
  OrderPaymentStatus,
  OrderPaySource,
  PaymentOperationRecord,
  PaymentReconciliationStatus,
} from "@/entities/console";
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
import { useStepUp, isStepUpCancelled } from "@/providers/StepUpProvider";

type ViewMode = "list" | "cards";
type PaymentStatusFilter = "all" | OrderPaymentStatus;
type PaySourceFilter = "all" | OrderPaySource;
type ReconciliationFilter = "all" | "attention" | PaymentReconciliationStatus;
type OfflineTypeFilter = "all" | OrderOfflinePaymentType | "online" | "none";

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

function paymentStatusLabel(status: OrderPaymentStatus) {
  if (status === "not_required") return "无需支付";
  if (status === "unpaid") return "未支付";
  if (status === "pending") return "支付中";
  if (status === "pending_verify") return "线下待核";
  if (status === "paid") return "已收款";
  if (status === "partial") return "部分收款";
  if (status === "failed") return "支付失败";
  if (status === "closed") return "已关闭";
  return "退款中";
}

function paySourceLabel(source: OrderPaySource) {
  if (source === "online") return "线上";
  if (source === "offline") return "线下";
  return "无";
}

function offlineTypeLabel(type: OrderOfflinePaymentType | null) {
  if (type === "bank_transfer") return "银行转账";
  if (type === "cash") return "现金";
  if (type === "other") return "其他线下";
  return "未设置";
}

function billStatusLabel(status: PaymentOperationRecord["billStatus"]) {
  if (status === "paid") return "已结清";
  if (status === "partial") return "部分收款";
  if (status === "paying") return "支付中";
  if (status === "cancelled") return "已作废";
  if (status === "overdue") return "逾期";
  if (status === "unpaid") return "待收款";
  return "未关联";
}

function reconciliationLabel(status: PaymentReconciliationStatus) {
  if (status === "pending_verify") return "待复核";
  if (status === "partial") return "部分收款";
  if (status === "overpaid") return "超额收款";
  if (status === "bill_cancelled") return "账单作废";
  if (status === "failed") return "支付异常";
  if (status === "unlinked") return "未关联";
  return "已对账";
}

function reconciliationIcon(status: PaymentReconciliationStatus): IconName {
  if (status === "normal") return "check";
  if (status === "pending_verify" || status === "partial") return "clock";
  if (status === "unlinked") return "info";
  return "warning";
}

function paymentStatusIcon(status: OrderPaymentStatus): IconName {
  if (status === "paid") return "check";
  if (status === "failed" || status === "refunding") return "warning";
  if (status === "closed") return "x";
  return "clock";
}

const PAYMENT_CSV_COLUMNS: readonly CsvColumn<PaymentOperationRecord>[] = [
  { label: "收款流水", value: (p) => p.paymentNo },
  { label: "交易号", value: (p) => p.transactionId ?? "" },
  { label: "关联订单", value: (p) => p.orderNo ?? "" },
  { label: "关联账单", value: (p) => p.billNo ?? "" },
  { label: "租户编码", value: (p) => p.tenantCode },
  { label: "租户名称", value: (p) => p.tenantName },
  { label: "收款金额", value: (p) => p.paidAmount },
  {
    label: "账单应收",
    value: (p) => p.billPayableAmount || p.totalAmount,
  },
  { label: "币种", value: (p) => p.currency },
  { label: "收款状态", value: (p) => paymentStatusLabel(p.paymentStatus) },
  { label: "支付来源", value: (p) => paySourceLabel(p.paySource) },
  {
    label: "收款方式",
    value: (p) =>
      p.paySource === "offline"
        ? offlineTypeLabel(p.offlinePayType)
        : (p.payMethod ?? ""),
  },
  {
    label: "对账状态",
    value: (p) => reconciliationLabel(p.reconciliationStatus),
  },
  { label: "操作人", value: (p) => p.operatorName },
  { label: "收款时间", value: (p) => p.paidAt ?? p.createdAt },
];

function paymentSearchText(payment: PaymentOperationRecord) {
  return [
    payment.id,
    payment.paymentNo,
    payment.transactionId,
    payment.channelOrderNo,
    payment.channelTransactionNo,
    payment.offlinePayerName,
    payment.billNo,
    payment.orderNo,
    payment.tenantCode,
    payment.tenantName,
    payment.region,
    payment.industry,
    payment.servicePlanName,
    payment.tierName,
    payment.operatorName,
    payment.statusMessage,
    payment.remark,
    paymentStatusLabel(payment.paymentStatus),
    paySourceLabel(payment.paySource),
    offlineTypeLabel(payment.offlinePayType),
    reconciliationLabel(payment.reconciliationStatus),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesReconciliationFilter(
  payment: PaymentOperationRecord,
  filter: ReconciliationFilter,
) {
  if (filter === "all") return true;
  if (filter === "attention") return payment.reconciliationStatus !== "normal";
  return payment.reconciliationStatus === filter;
}

function matchesOfflineTypeFilter(
  payment: PaymentOperationRecord,
  filter: OfflineTypeFilter,
) {
  if (filter === "all") return true;
  if (filter === "online" || filter === "none")
    return payment.paySource === filter;
  return payment.offlinePayType === filter;
}

function paymentTargetHref(payment: PaymentOperationRecord) {
  if (payment.billId) return `/billing/${encodeURIComponent(payment.billId)}`;
  return `/tenants/${encodeURIComponent(payment.tenantId)}`;
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

function PaymentRemarkDialog({
  title,
  payment,
  remark,
  loading,
  error,
  onRemarkChange,
  onConfirm,
  onCancel,
}: {
  title: string;
  payment: PaymentOperationRecord;
  remark: string;
  loading: boolean;
  error: string | null;
  onRemarkChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <DialogForm
      open
      title={title}
      description={
        <>
          流水号：<strong>{payment.paymentNo}</strong>
          {payment.tenantName ? `  ·  ${payment.tenantName}` : ""}
        </>
      }
      submitLabel="确认"
      cancelLabel="取消"
      submitting={loading}
      submitDisabled={remark.trim().length < 4}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm();
      }}
    >
      <Label htmlFor="vx-payment-remark">
        操作备注 <small>（必填，最少 4 字）</small>
      </Label>
      <Textarea
        id="vx-payment-remark"
        value={remark}
        onChange={(e) => onRemarkChange(e.target.value)}
        rows={3}
        placeholder="请输入操作备注…"
        autoFocus
      />
      {error ? <p className="text-sm text-vx-danger">{error}</p> : null}
    </DialogForm>
  );
}

function PaymentActionsMenu({
  payment,
  onVerify,
  onReject,
}: {
  payment: PaymentOperationRecord;
  onVerify: (payment: PaymentOperationRecord) => void;
  onReject: (payment: PaymentOperationRecord) => void;
}) {
  const router = useRouter();
  const isPendingVerify = payment.paymentStatus === "pending_verify";

  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${payment.paymentNo} 收款操作`}
        triggerClassName="vx-tenant-actions__trigger"
        triggerProps={{ title: "操作" }}
        items={[
          ...(isPendingVerify
            ? [
                {
                  id: "verify",
                  label: "核销确认",
                  icon: <Icon name="check" size="xs" fallback="placeholder" />,
                  onSelect: () => onVerify(payment),
                },
                {
                  id: "reject",
                  label: "驳回退回",
                  icon: <Icon name="x" size="xs" fallback="placeholder" />,
                  onSelect: () => onReject(payment),
                },
              ]
            : []),
          {
            id: "bill",
            label: "账单详情",
            icon: <Icon name="arrow-right" size="xs" fallback="placeholder" />,
            disabled: !payment.billId,
            onSelect: () => {
              if (!payment.billId) return;
              router.push(`/billing/${encodeURIComponent(payment.billId)}`);
            },
          },
          {
            id: "order",
            label: "订单详情",
            icon: <Icon name="table" size="xs" fallback="placeholder" />,
            disabled: !payment.subscriptionId,
            onSelect: () => {
              if (!payment.subscriptionId) return;
              router.push(
                `/orders/${encodeURIComponent(payment.subscriptionId)}`,
              );
            },
          },
          {
            id: "tenant",
            label: "查看租户",
            icon: <Icon name="buildings" size="xs" fallback="placeholder" />,
            onSelect: () =>
              router.push(`/tenants/${encodeURIComponent(payment.tenantId)}`),
          },
          {
            id: "evidence",
            label: "查看凭证",
            icon: <Icon name="key" size="xs" fallback="placeholder" />,
            disabled: !payment.offlineEvidenceUrl,
            onSelect: () => {
              if (!payment.offlineEvidenceUrl) return;
              globalThis.open(
                payment.offlineEvidenceUrl,
                "_blank",
                "noopener,noreferrer",
              );
            },
          },
        ]}
      />
    </div>
  );
}

function PaymentListRows({
  payments,
  startIndex,
  selectedPaymentIds,
  isPageSelected,
  onTogglePayment,
  onTogglePage,
  onVerify,
  onReject,
}: {
  payments: PaymentOperationRecord[];
  startIndex: number;
  selectedPaymentIds: Set<string>;
  isPageSelected: boolean;
  onTogglePayment: (id: string, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
  onVerify: (payment: PaymentOperationRecord) => void;
  onReject: (payment: PaymentOperationRecord) => void;
}) {
  const router = useRouter();
  const selectedOnPage = payments.filter((payment) =>
    selectedPaymentIds.has(payment.id),
  ).length;
  const isPagePartiallySelected =
    selectedOnPage > 0 && selectedOnPage < payments.length;

  return (
    <div
      className="vx-tenant-directory-list vx-payment-directory-list"
      role="region"
      aria-label="收款管理清单"
    >
      <div className="vx-tenant-directory-list__header">
        <span>
          <Checkbox
            className="vx-model-select-checkbox"
            checked={isPagePartiallySelected ? "indeterminate" : isPageSelected}
            onCheckedChange={(checked) => onTogglePage(checked === true)}
            aria-label="选择当前页收款"
          />
        </span>
        <span>序号</span>
        <span>收款流水</span>
        <span>租户</span>
        <span>关联账单</span>
        <span>金额</span>
        <span>收款状态</span>
        <span>对账</span>
        <span>操作</span>
      </div>
      {payments.map((payment, index) => {
        const selected = selectedPaymentIds.has(payment.id);

        return (
          <div
            key={payment.id}
            className={joinClasses(
              "vx-tenant-directory-row",
              "vx-payment-operation-row",
              `vx-payment-row--${payment.reconciliationStatus}`,
              selected ? "vx-payment-operation-row--selected" : undefined,
            )}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (
                target.closest(
                  'button, input, select, textarea, a, [role="button"], [role="menu"], [role="menuitem"]',
                )
              )
                return;
              onTogglePayment(payment.id, !selected);
            }}
          >
            <span className="vx-payment-operation-row__select">
              <Checkbox
                className="vx-model-select-checkbox"
                checked={selected}
                onCheckedChange={(checked) =>
                  onTogglePayment(payment.id, checked === true)
                }
                aria-label={`选择收款 ${payment.paymentNo}`}
              />
            </span>
            <span className="vx-tenant-directory-row__index">
              {formatNumber(startIndex + index + 1)}
            </span>
            <span className="vx-payment-row__payment">
              <span className="vx-tenant-directory-row__title-line">
                <Button
                  variant="link"
                  className="vx-model-name-button"
                  onClick={() => router.push(paymentTargetHref(payment))}
                >
                  {payment.paymentNo}
                </Button>
              </span>
              <small>
                {paySourceLabel(payment.paySource)} ·{" "}
                {payment.paySource === "offline"
                  ? offlineTypeLabel(payment.offlinePayType)
                  : (payment.payMethod ?? "未设置")}
              </small>
            </span>
            <span className="vx-payment-row__tenant">
              <Icon
                name={payment.tenantType === "company" ? "buildings" : "user"}
                size="sm"
                fallback="placeholder"
              />
              <span>
                <strong>{payment.tenantName}</strong>
                <small>
                  {payment.tenantCode} · {typeLabel(payment.tenantType)}
                </small>
              </span>
            </span>
            <span className="vx-payment-row__bill">
              <span className="vx-tenant-directory-row__tag-line">
                <Badge
                  className={`vx-tenant-pill vx-payment-pill--bill-${payment.billStatus ?? "none"}`}
                >
                  {billStatusLabel(payment.billStatus)}
                </Badge>
                <Badge className="vx-tenant-pill vx-payment-pill--source">
                  {payment.orderNo ?? "未关联订单"}
                </Badge>
              </span>
              <small>{payment.billNo ?? "未关联账单"}</small>
            </span>
            <span className="vx-payment-row__amount">
              <strong>
                {formatCurrency(payment.paidAmount, payment.currency)}
              </strong>
              <small>
                应收{" "}
                {formatCurrency(
                  payment.billPayableAmount || payment.totalAmount,
                  payment.currency,
                )}
              </small>
            </span>
            <span className="vx-payment-row__status">
              <span className="vx-payment-status-line">
                <span
                  className={`vx-payment-status-dot vx-payment-status-dot--${payment.paymentStatus}`}
                  role="img"
                  aria-label={paymentStatusLabel(payment.paymentStatus)}
                >
                  <Icon
                    name={paymentStatusIcon(payment.paymentStatus)}
                    size="xs"
                    fallback="placeholder"
                  />
                </span>
                <Badge
                  className={`vx-tenant-pill vx-payment-pill--${payment.paymentStatus}`}
                >
                  {paymentStatusLabel(payment.paymentStatus)}
                </Badge>
              </span>
              <small>{formatDate(payment.paidAt ?? payment.createdAt)}</small>
            </span>
            <span className="vx-payment-row__reconcile">
              <span className="vx-payment-status-line">
                <span
                  className={`vx-payment-status-dot vx-payment-status-dot--reconcile-${payment.reconciliationStatus}`}
                  role="img"
                  aria-label={reconciliationLabel(payment.reconciliationStatus)}
                >
                  <Icon
                    name={reconciliationIcon(payment.reconciliationStatus)}
                    size="xs"
                    fallback="placeholder"
                  />
                </span>
                <Badge
                  className={`vx-tenant-pill vx-payment-pill--reconcile-${payment.reconciliationStatus}`}
                >
                  {reconciliationLabel(payment.reconciliationStatus)}
                </Badge>
              </span>
              <small>{payment.remark ?? payment.operatorName}</small>
            </span>
            <PaymentActionsMenu
              payment={payment}
              onVerify={onVerify}
              onReject={onReject}
            />
          </div>
        );
      })}
    </div>
  );
}

function PaymentCards({
  payments,
  onVerify,
  onReject,
}: {
  payments: PaymentOperationRecord[];
  onVerify: (payment: PaymentOperationRecord) => void;
  onReject: (payment: PaymentOperationRecord) => void;
}) {
  const router = useRouter();

  return (
    <div
      className="vx-tenant-directory-cards vx-payment-cards"
      aria-label="收款管理卡片"
    >
      {payments.map((payment) => (
        <article
          key={payment.id}
          className={joinClasses(
            "vx-tenant-directory-card",
            `vx-payment-card--${payment.reconciliationStatus}`,
          )}
          role="button"
          tabIndex={0}
          onClick={() => router.push(paymentTargetHref(payment))}
          onKeyDown={(event) => {
            if (event.key === "Enter") router.push(paymentTargetHref(payment));
          }}
        >
          <header>
            <Icon name="check" size="lg" fallback="placeholder" />
            <div>
              <strong>{payment.paymentNo}</strong>
              <span>
                {payment.tenantName} ·{" "}
                {payment.orderNo ?? payment.billNo ?? "未关联订单"}
              </span>
            </div>
            <PaymentActionsMenu
              payment={payment}
              onVerify={onVerify}
              onReject={onReject}
            />
          </header>
          <div className="vx-tenant-directory-card__badges">
            <Badge
              className={`vx-tenant-pill vx-payment-pill--${payment.paymentStatus}`}
            >
              {paymentStatusLabel(payment.paymentStatus)}
            </Badge>
            <Badge
              className={`vx-tenant-pill vx-payment-pill--reconcile-${payment.reconciliationStatus}`}
            >
              {reconciliationLabel(payment.reconciliationStatus)}
            </Badge>
            <Badge className="vx-tenant-pill vx-payment-pill--source">
              {paySourceLabel(payment.paySource)}
            </Badge>
          </div>
          <p className="vx-payment-card__bill">
            {payment.billNo ?? "未关联账单"} ·{" "}
            {payment.servicePlanName ?? "未关联套餐"}
          </p>
          <div className="vx-tenant-directory-card__metrics">
            <span>
              <b>{formatCurrency(payment.paidAmount, payment.currency)}</b>
              <small>收款金额</small>
            </span>
            <span>
              <b>
                {formatCurrency(
                  payment.billPayableAmount || payment.totalAmount,
                  payment.currency,
                )}
              </b>
              <small>账单应收</small>
            </span>
            <span>
              <b>{paySourceLabel(payment.paySource)}</b>
              <small>
                {payment.paySource === "offline"
                  ? offlineTypeLabel(payment.offlinePayType)
                  : (payment.payMethod ?? "支付方式")}
              </small>
            </span>
          </div>
          <footer>
            <span>{payment.operatorName}</span>
            <strong>{formatDate(payment.paidAt ?? payment.updatedAt)}</strong>
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
        共 {formatNumber(total)} 条收款记录
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

export function PaymentsPage() {
  const { runWithStepUp } = useStepUp();
  const [payments, setPayments] = useState<PaymentOperationRecord[]>([]);
  const [paymentsTruncated, setPaymentsTruncated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] =
    useState<PaymentStatusFilter>("all");
  const [paySourceFilter, setPaySourceFilter] =
    useState<PaySourceFilter>("all");
  const [reconciliationFilter, setReconciliationFilter] =
    useState<ReconciliationFilter>("all");
  const [offlineTypeFilter, setOfflineTypeFilter] =
    useState<OfflineTypeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [verifyTarget, setVerifyTarget] =
    useState<PaymentOperationRecord | null>(null);
  const [rejectTarget, setRejectTarget] =
    useState<PaymentOperationRecord | null>(null);
  const [remarkInput, setRemarkInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    fetchPaymentOperations()
      .then((records) => {
        if (active) {
          setPayments(records);
          setPaymentsTruncated(isListTruncated(records));
        }
      })
      .catch((error) => {
        if (active) {
          setPayments([]);
          setPaymentsTruncated(false);
          setLoadError(
            error instanceof Error ? error.message : "收款记录读取失败",
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

  const filteredPayments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return payments.filter((payment) => {
      if (
        paymentStatusFilter !== "all" &&
        payment.paymentStatus !== paymentStatusFilter
      )
        return false;
      if (paySourceFilter !== "all" && payment.paySource !== paySourceFilter)
        return false;
      if (!matchesReconciliationFilter(payment, reconciliationFilter))
        return false;
      if (!matchesOfflineTypeFilter(payment, offlineTypeFilter)) return false;
      if (
        normalizedQuery &&
        !paymentSearchText(payment).includes(normalizedQuery)
      )
        return false;
      return true;
    });
  }, [
    offlineTypeFilter,
    paymentStatusFilter,
    payments,
    paySourceFilter,
    query,
    reconciliationFilter,
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const activePage = Math.min(currentPage, pageCount);
  const visiblePayments = filteredPayments.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );
  const visiblePaymentIds = useMemo(
    () => visiblePayments.map((payment) => payment.id),
    [visiblePayments],
  );
  const selectedVisiblePaymentCount = visiblePaymentIds.filter((id) =>
    selectedPaymentIds.has(id),
  ).length;
  const isPaymentPageSelected =
    visiblePaymentIds.length > 0 &&
    selectedVisiblePaymentCount === visiblePaymentIds.length;
  const paidPayments = payments.filter((item) => item.paymentStatus === "paid");
  const paidAmount = paidPayments.reduce(
    (sum, item) => sum + item.paidAmount,
    0,
  );
  const offlineAmount = paidPayments
    .filter((item) => item.paySource === "offline")
    .reduce((sum, item) => sum + item.paidAmount, 0);
  const pendingVerifyCount = payments.filter(
    (item) => item.paymentStatus === "pending_verify",
  ).length;
  const partialCount = payments.filter(
    (item) => item.reconciliationStatus === "partial",
  ).length;
  const attentionCount = payments.filter(
    (item) => item.reconciliationStatus !== "normal",
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    offlineTypeFilter,
    pageSize,
    paymentStatusFilter,
    paySourceFilter,
    query,
    reconciliationFilter,
    viewMode,
  ]);

  function handleReset() {
    setQuery("");
    setPaymentStatusFilter("all");
    setPaySourceFilter("all");
    setReconciliationFilter("all");
    setOfflineTypeFilter("all");
  }

  function handleOpenVerify(payment: PaymentOperationRecord) {
    setVerifyTarget(payment);
    setRejectTarget(null);
    setRemarkInput("");
    setActionError(null);
  }

  function handleOpenReject(payment: PaymentOperationRecord) {
    setRejectTarget(payment);
    setVerifyTarget(null);
    setRemarkInput("");
    setActionError(null);
  }

  function handleCloseDialog() {
    setVerifyTarget(null);
    setRejectTarget(null);
    setRemarkInput("");
    setActionError(null);
  }

  async function handleConfirmAction() {
    const target = verifyTarget ?? rejectTarget;
    if (!target || remarkInput.trim().length < 4) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const submit = verifyTarget ? verifyPayment : rejectPayment;
      // verify (核销) is 危 payment.settle → runWithStepUp drives the ceremony;
      // reject is routine and passes through unchanged.
      const updated = await runWithStepUp(() =>
        submit(target.id, remarkInput.trim()),
      );
      setPayments((current) =>
        current.map((p) => (p.id === updated.id ? updated : p)),
      );
      handleCloseDialog();
    } catch (err) {
      if (isStepUpCancelled(err)) return;
      setActionError(
        err instanceof AdminBffError ? err.message : "操作失败，请重试",
      );
    } finally {
      setActionLoading(false);
    }
  }

  const selectedPayments = useMemo(
    () => payments.filter((payment) => selectedPaymentIds.has(payment.id)),
    [payments, selectedPaymentIds],
  );

  function clearPaymentSelection() {
    setSelectedPaymentIds(new Set());
  }

  function togglePaymentSelection(id: string, checked: boolean) {
    setSelectedPaymentIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function togglePaymentPageSelection(checked: boolean) {
    setSelectedPaymentIds((current) => {
      const next = new Set(current);
      visiblePaymentIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }

  return (
    <div className="vx-page-stack vx-tenant-management-page vx-payments-page">
      <PageHeader
        icon="check"
        eyebrow="财务结算"
        title="收款管理"
        description="运营侧收款台账 MVP：集中查看线下/线上收款记录、账单关联和对账状态；确认收款仍从订单侧进入。"
        action={
          <Button asChild variant="outline">
            <Link href="/orders">
              <Icon name="table" size="xs" fallback="placeholder" />
              订单收款入口
            </Link>
          </Button>
        }
      />

      <section className="vx-tenant-summary" aria-label="收款统计">
        <SummaryItem
          icon="check"
          label="收款记录"
          value={formatNumber(payments.length)}
          tags={[`筛选 ${formatNumber(filteredPayments.length)}`]}
        />
        <SummaryItem
          icon="chart-bar"
          label="已收金额"
          value={formatCurrency(paidAmount, "CNY")}
          tags={[`线下 ${formatCurrency(offlineAmount, "CNY")}`]}
          tone="green"
        />
        <SummaryItem
          icon="clock"
          label="待复核"
          value={formatNumber(pendingVerifyCount)}
          tags={[`部分 ${formatNumber(partialCount)}`]}
          tone={pendingVerifyCount || partialCount ? "amber" : "green"}
        />
        <SummaryItem
          icon="warning"
          label="需关注"
          value={formatNumber(attentionCount)}
          tags={["对账异常"]}
          tone={attentionCount ? "rose" : "green"}
        />
      </section>

      {paymentsTruncated ? (
        <Banner
          tone="warning"
          title="当前收款列表可能未展示全部数据"
          description="本次加载已达到单次读取上限（500 条），如未看到目标收款记录，请尝试缩小筛选范围（如按状态、来源等）重新查询。"
        />
      ) : null}

      <div className="vx-tenant-list-shell">
        <section className="vx-tenant-toolbar" aria-label="收款筛选">
          <ViewModeSwitch
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="收款展示方式"
          />
          <span className="vx-tenant-view-count">
            {formatNumber(filteredPayments.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索流水、租户、账单、付款方"
            className="vx-tenant-search vx-payment-search"
            aria-label="搜索收款"
          />
          <Button variant="outline" onClick={handleReset}>
            重置
          </Button>
          <div className="vx-tenant-filters">
            <NativeSelect
              className="vx-tenant-select"
              value={paymentStatusFilter}
              onChange={(event) =>
                setPaymentStatusFilter(
                  event.target.value as PaymentStatusFilter,
                )
              }
              aria-label="收款状态"
            >
              <option value="all">全部收款</option>
              <option value="pending">支付中</option>
              <option value="pending_verify">线下待核</option>
              <option value="paid">已收款</option>
              <option value="partial">部分收款</option>
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
              aria-label="收款来源"
            >
              <option value="all">全部来源</option>
              <option value="offline">线下</option>
              <option value="online">线上</option>
              <option value="none">无</option>
            </NativeSelect>
            <NativeSelect
              className="vx-tenant-select"
              value={reconciliationFilter}
              onChange={(event) =>
                setReconciliationFilter(
                  event.target.value as ReconciliationFilter,
                )
              }
              aria-label="对账状态"
            >
              <option value="all">全部对账</option>
              <option value="attention">需关注</option>
              <option value="normal">已对账</option>
              <option value="pending_verify">待复核</option>
              <option value="partial">部分收款</option>
              <option value="overpaid">超额收款</option>
              <option value="bill_cancelled">账单作废</option>
              <option value="failed">支付异常</option>
              <option value="unlinked">未关联</option>
            </NativeSelect>
            <NativeSelect
              className="vx-tenant-select"
              value={offlineTypeFilter}
              onChange={(event) =>
                setOfflineTypeFilter(event.target.value as OfflineTypeFilter)
              }
              aria-label="收款方式"
            >
              <option value="all">全部方式</option>
              <option value="bank_transfer">银行转账</option>
              <option value="cash">现金</option>
              <option value="other">其他线下</option>
              <option value="online">线上</option>
              <option value="none">无</option>
            </NativeSelect>
          </div>
          <ActionButton
            variant="outline"
            icon="arrow-down"
            onClick={() =>
              exportRowsToCsv(
                "payments-export",
                PAYMENT_CSV_COLUMNS,
                filteredPayments,
              )
            }
            disabled={filteredPayments.length === 0}
          >
            导出全部
          </ActionButton>
        </section>

        {selectedPaymentIds.size > 0 ? (
          <BulkActionBar
            selectedLabel={<>已选 {formatNumber(selectedPaymentIds.size)} 项</>}
            selectionActions={
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    exportRowsToCsv(
                      "payments-export",
                      PAYMENT_CSV_COLUMNS,
                      selectedPayments,
                    )
                  }
                >
                  导出所选
                </Button>
                <Button variant="ghost" onClick={clearPaymentSelection}>
                  清除
                </Button>
              </>
            }
          />
        ) : null}

        <section className="vx-tenant-directory" aria-label="收款清单">
          {loading ? (
            <header className="vx-tenant-directory__header">
              <span>读取中</span>
            </header>
          ) : null}

          {visiblePayments.length ? (
            viewMode === "list" ? (
              <PaymentListRows
                payments={visiblePayments}
                startIndex={(activePage - 1) * pageSize}
                selectedPaymentIds={selectedPaymentIds}
                isPageSelected={isPaymentPageSelected}
                onTogglePayment={togglePaymentSelection}
                onTogglePage={togglePaymentPageSelection}
                onVerify={handleOpenVerify}
                onReject={handleOpenReject}
              />
            ) : (
              <PaymentCards
                payments={visiblePayments}
                onVerify={handleOpenVerify}
                onReject={handleOpenReject}
              />
            )
          ) : (
            <section className="vx-tenant-empty">
              <EmptyState
                title={
                  loading
                    ? "正在加载收款记录"
                    : loadError
                      ? "收款记录读取失败"
                      : "没有匹配的收款记录"
                }
                description={
                  loading
                    ? "正在读取收款台账和账单关联。"
                    : (loadError ?? "清空筛选条件后可查看全部收款记录。")
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
            total={filteredPayments.length}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            onPageChange={(page) =>
              setCurrentPage(Math.min(Math.max(page, 1), pageCount))
            }
          />
        </section>
      </div>

      {(verifyTarget ?? rejectTarget) ? (
        <PaymentRemarkDialog
          title={verifyTarget ? "核销线下收款" : "驳回线下收款"}
          payment={(verifyTarget ?? rejectTarget)!}
          remark={remarkInput}
          loading={actionLoading}
          error={actionError}
          onRemarkChange={setRemarkInput}
          onConfirm={handleConfirmAction}
          onCancel={handleCloseDialog}
        />
      ) : null}
    </div>
  );
}
