"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banner,
  Icon,
  ActionMenu,
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
import { fetchPromotionRedemptionRecords } from "@/api/admin-bff";
import { exportRowsToCsv, type CsvColumn } from "@/lib/exportCsv";
import { isListTruncated } from "@/lib/list-truncation";
import type {
  BillingBillStatus,
  PromotionRedemptionRecord,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import {
  formatDate,
  formatNumber,
  joinClasses,
  typeLabel,
} from "@/modules/tenants/tenant-utils";
import {
  formatCurrency,
  PageSizePicker,
  type PageSize,
  SummaryItem,
  Tag,
  type ViewMode,
} from "./CommercialUtils";

type BillStatusFilter = "all" | BillingBillStatus;

// C15: redemption status machine (applied/redeemed/reversed) removed — no status
// column on voucher_redemptions (a redemption row IS a completed redemption; the
// applied/reversed states never existed in schema). Every row is 已核销.

function billStatusLabel(status: BillingBillStatus) {
  if (status === "paying") return "支付中";
  if (status === "paid") return "已结清";
  if (status === "partial") return "部分收款";
  if (status === "cancelled") return "已作废";
  if (status === "overdue") return "逾期";
  return "待收款";
}

function billStatusTone(status: BillingBillStatus) {
  if (status === "paid") return "normal";
  if (status === "cancelled") return "muted";
  if (status === "overdue") return "danger";
  return "warning";
}

function redemptionSearchText(record: PromotionRedemptionRecord) {
  return [
    record.redemptionNo,
    record.promotionCode,
    record.promotionName,
    record.tenantCode,
    record.tenantName,
    record.orderNo,
    record.billNo,
    record.servicePlanName,
    record.operatorName,
    record.remark,
    billStatusLabel(record.billStatus),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const REDEMPTION_CSV_COLUMNS: CsvColumn<PromotionRedemptionRecord>[] = [
  { label: "核销编号", value: (record) => record.redemptionNo },
  { label: "优惠编号", value: (record) => record.promotionCode },
  { label: "优惠名称", value: (record) => record.promotionName },
  { label: "租户编号", value: (record) => record.tenantCode },
  { label: "租户名称", value: (record) => record.tenantName },
  { label: "租户类型", value: (record) => typeLabel(record.tenantType) },
  { label: "订单号", value: (record) => record.orderNo ?? "" },
  { label: "账单号", value: (record) => record.billNo },
  { label: "账单状态", value: (record) => billStatusLabel(record.billStatus) },
  { label: "套餐", value: (record) => record.servicePlanName ?? "" },
  { label: "货币", value: (record) => record.currency },
  { label: "订单金额", value: (record) => record.orderAmount },
  { label: "优惠金额", value: (record) => record.discountAmount },
  { label: "应付金额", value: (record) => record.payableAmount },
  { label: "操作人", value: (record) => record.operatorName },
  { label: "核销时间", value: (record) => formatDate(record.redeemedAt) },
  { label: "备注", value: (record) => record.remark ?? "" },
];

function RedemptionActionsMenu({
  record,
}: {
  record: PromotionRedemptionRecord;
}) {
  const router = useRouter();

  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${record.redemptionNo} 核销操作`}
        triggerClassName="vx-tenant-actions__trigger"
        triggerProps={{ title: "操作" }}
        items={[
          {
            id: "bill",
            label: "账单详情",
            icon: <Icon name="arrow-right" size="xs" fallback="placeholder" />,
            onSelect: () =>
              router.push(`/billing/${encodeURIComponent(record.billId)}`),
          },
          {
            id: "tenant",
            label: "查看租户",
            icon: <Icon name="buildings" size="xs" fallback="placeholder" />,
            onSelect: () =>
              router.push(`/tenants/${encodeURIComponent(record.tenantId)}`),
          },
          {
            id: "orders",
            label: "订单列表",
            icon: <Icon name="table" size="xs" fallback="placeholder" />,
            onSelect: () => router.push("/orders"),
          },
          {
            id: "promotions",
            label: "优惠活动",
            icon: <Icon name="sparkles" size="xs" fallback="placeholder" />,
            onSelect: () => router.push("/promotions"),
          },
        ]}
      />
    </div>
  );
}

function RedemptionRows({
  records,
  startIndex,
  selectedRecordIds,
  isPageSelected,
  onToggleRecord,
  onTogglePage,
}: {
  records: PromotionRedemptionRecord[];
  startIndex: number;
  selectedRecordIds: Set<string>;
  isPageSelected: boolean;
  onToggleRecord: (id: string, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
}) {
  const router = useRouter();
  const selectedOnPage = records.filter((record) =>
    selectedRecordIds.has(record.id),
  ).length;

  return (
    <div
      className="vx-tenant-directory-list vx-redemption-directory-list"
      role="region"
      aria-label="优惠核销清单"
    >
      <div className="vx-tenant-directory-list__header">
        <span>
          <Checkbox
            className="vx-model-select-checkbox"
            checked={
              isPageSelected
                ? true
                : selectedOnPage > 0
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(value) => onTogglePage(value === true)}
            aria-label="选择当前页核销记录"
          />
        </span>
        <span>序号</span>
        <span>核销记录</span>
        <span>租户</span>
        <span>账单</span>
        <span>优惠金额</span>
        <span>核销方</span>
        <span>时间</span>
        <span>操作</span>
      </div>
      {records.map((record, index) => {
        const selected = selectedRecordIds.has(record.id);

        return (
          <div
            key={record.id}
            className={joinClasses(
              "vx-tenant-directory-row",
              "vx-redemption-operation-row",
              "vx-commercial-row--normal",
              selected ? "vx-redemption-operation-row--selected" : undefined,
            )}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (
                target.closest(
                  'button, input, select, textarea, a, [role="button"], [role="menu"], [role="menuitem"]',
                )
              )
                return;
              onToggleRecord(record.id, !selected);
            }}
          >
            <span className="vx-redemption-operation-row__select">
              <Checkbox
                className="vx-model-select-checkbox"
                checked={selected}
                onCheckedChange={(value) =>
                  onToggleRecord(record.id, value === true)
                }
                aria-label={`选择核销记录 ${record.redemptionNo}`}
              />
            </span>
            <span className="vx-tenant-directory-row__index">
              {formatNumber(startIndex + index + 1)}
            </span>
            <span className="vx-commercial-row__main">
              <Button
                variant="link"
                className="vx-model-name-button"
                onClick={() =>
                  router.push(`/billing/${encodeURIComponent(record.billId)}`)
                }
              >
                {record.redemptionNo}
              </Button>
              <small>
                {record.promotionCode} · {record.promotionName}
              </small>
            </span>
            <span className="vx-commercial-row__tenant">
              <Icon
                name={record.tenantType === "company" ? "buildings" : "user"}
                size="sm"
                fallback="placeholder"
              />
              <span>
                <strong>{record.tenantName}</strong>
                <small>
                  {record.tenantCode} · {typeLabel(record.tenantType)}
                </small>
              </span>
            </span>
            <span className="vx-commercial-row__main">
              <span className="vx-tenant-directory-row__tag-line">
                <Tag tone={billStatusTone(record.billStatus)}>
                  {billStatusLabel(record.billStatus)}
                </Tag>
              </span>
              <small>
                {record.billNo} · {record.orderNo ?? "未关联订单"}
              </small>
            </span>
            <span className="vx-commercial-row__center">
              <strong>
                {formatCurrency(record.discountAmount, record.currency)}
              </strong>
              <small>
                应付 {formatCurrency(record.payableAmount, record.currency)} /
                原价 {formatCurrency(record.orderAmount, record.currency)}
              </small>
            </span>
            <span className="vx-commercial-row__center">
              <strong>{record.operatorName}</strong>
              <small>已核销</small>
            </span>
            <span className="vx-commercial-row__center">
              <strong>{formatDate(record.redeemedAt)}</strong>
              <small>{record.remark ?? "系统记录"}</small>
            </span>
            <RedemptionActionsMenu record={record} />
          </div>
        );
      })}
    </div>
  );
}

function RedemptionCards({
  records,
}: {
  records: PromotionRedemptionRecord[];
}) {
  const router = useRouter();

  return (
    <div
      className="vx-tenant-directory-cards vx-commercial-cards"
      aria-label="优惠核销卡片"
    >
      {records.map((record) => (
        <article
          key={record.id}
          className={joinClasses(
            "vx-tenant-directory-card",
            "vx-commercial-card--normal",
          )}
          role="button"
          tabIndex={0}
          onClick={() =>
            router.push(`/billing/${encodeURIComponent(record.billId)}`)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter")
              router.push(`/billing/${encodeURIComponent(record.billId)}`);
          }}
        >
          <header>
            <Icon name="sparkles" size="lg" fallback="placeholder" />
            <div>
              <strong>{record.redemptionNo}</strong>
              <span>
                {record.tenantName} · {record.promotionName}
              </span>
            </div>
            <RedemptionActionsMenu record={record} />
          </header>
          <div className="vx-tenant-directory-card__badges">
            <Tag tone="normal">已核销</Tag>
            <Tag tone={billStatusTone(record.billStatus)}>
              {billStatusLabel(record.billStatus)}
            </Tag>
          </div>
          <p className="vx-commercial-card__description">
            {record.billNo} ·{" "}
            {record.servicePlanName ?? record.orderNo ?? "未关联套餐"}
          </p>
          <div className="vx-tenant-directory-card__metrics">
            <span>
              <b>{formatCurrency(record.discountAmount, record.currency)}</b>
              <small>优惠金额</small>
            </span>
            <span>
              <b>{formatCurrency(record.payableAmount, record.currency)}</b>
              <small>账单应付</small>
            </span>
            <span>
              <b>{formatDate(record.redeemedAt)}</b>
              <small>{record.operatorName}</small>
            </span>
          </div>
          <footer>
            <span>{record.promotionCode}</span>
            <strong>{record.orderNo ?? "未关联订单"}</strong>
          </footer>
        </article>
      ))}
    </div>
  );
}

export function PromotionRedemptionsPage() {
  const [records, setRecords] = useState<PromotionRedemptionRecord[]>([]);
  const [recordsTruncated, setRecordsTruncated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [billStatusFilter, setBillStatusFilter] =
    useState<BillStatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    fetchPromotionRedemptionRecords()
      .then((items) => {
        if (active) {
          setRecords(items);
          setRecordsTruncated(isListTruncated(items));
        }
      })
      .catch((error) => {
        if (active) {
          setRecords([]);
          setRecordsTruncated(false);
          setLoadError(
            error instanceof Error ? error.message : "核销数据读取失败",
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

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((record) => {
      if (billStatusFilter !== "all" && record.billStatus !== billStatusFilter)
        return false;
      if (
        normalizedQuery &&
        !redemptionSearchText(record).includes(normalizedQuery)
      )
        return false;
      return true;
    });
  }, [billStatusFilter, query, records]);

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const activePage = Math.min(currentPage, pageCount);
  const visibleRecords = filteredRecords.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );
  const visibleRecordIds = useMemo(
    () => visibleRecords.map((record) => record.id),
    [visibleRecords],
  );
  const selectedVisibleRecordCount = visibleRecordIds.filter((id) =>
    selectedRecordIds.has(id),
  ).length;
  const isRecordPageSelected =
    visibleRecordIds.length > 0 &&
    selectedVisibleRecordCount === visibleRecordIds.length;
  const discountAmount = records.reduce(
    (sum, record) => sum + record.discountAmount,
    0,
  );
  const tenantReach = new Set(records.map((record) => record.tenantId)).size;
  const paidBillCount = records.filter(
    (record) => record.billStatus === "paid",
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [billStatusFilter, pageSize, query, viewMode]);

  function handleReset() {
    setQuery("");
    setBillStatusFilter("all");
  }

  function toggleRecordSelection(id: string, checked: boolean) {
    setSelectedRecordIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleRecordPageSelection(checked: boolean) {
    setSelectedRecordIds((current) => {
      const next = new Set(current);
      visibleRecordIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }

  const selectedRecords = records.filter((record) =>
    selectedRecordIds.has(record.id),
  );

  function handleExportSelected() {
    exportRowsToCsv(
      "promotion-redemptions-export",
      REDEMPTION_CSV_COLUMNS,
      selectedRecords,
    );
  }

  function handleExportAll() {
    exportRowsToCsv(
      "promotion-redemptions-export",
      REDEMPTION_CSV_COLUMNS,
      filteredRecords,
    );
  }

  function handleClearSelection() {
    setSelectedRecordIds(new Set());
  }

  return (
    <div className="vx-page-stack vx-tenant-management-page vx-redemptions-page">
      <PageHeader
        icon="check"
        eyebrow="订阅交易"
        title="优惠核销"
        description="运营侧查看券核销台账（核销均为客户自助）。减免金额来自账单 discount_amount。"
      />

      <section className="vx-tenant-summary" aria-label="优惠核销统计">
        <SummaryItem
          icon="check"
          label="核销记录"
          value={formatNumber(records.length)}
          tags={[`筛选 ${formatNumber(filteredRecords.length)}`]}
        />
        <SummaryItem
          icon="chart-bar"
          label="减免金额"
          value={formatCurrency(discountAmount, "CNY")}
          tags={["账单减免"]}
          tone="green"
        />
        <SummaryItem
          icon="buildings"
          label="覆盖租户"
          value={formatNumber(tenantReach)}
          tags={["去重"]}
          tone="green"
        />
        <SummaryItem
          icon="sparkles"
          label="账单已结清"
          value={formatNumber(paidBillCount)}
          tags={["billStatus=paid"]}
          tone="green"
        />
      </section>

      {recordsTruncated ? (
        <Banner
          tone="warning"
          title="当前核销列表可能未展示全部数据"
          description="本次加载已达到单次读取上限（500 条），如未看到目标记录，请尝试缩小筛选范围（如按账单状态等）重新查询。"
        />
      ) : null}

      <div className="vx-tenant-list-shell">
        <section className="vx-tenant-toolbar" aria-label="优惠核销筛选">
          <ViewModeSwitch
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="优惠核销展示方式"
          />
          <span className="vx-tenant-view-count">
            {formatNumber(filteredRecords.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索核销、租户、账单、套餐"
            className="vx-tenant-search vx-commercial-search"
            aria-label="搜索核销"
          />
          <Button variant="outline" onClick={handleReset}>
            重置
          </Button>
          <div className="vx-tenant-filters">
            <NativeSelect
              className="vx-input vx-tenant-select"
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
              <option value="cancelled">已作废</option>
            </NativeSelect>
          </div>
          <ActionButton
            variant="outline"
            icon="arrow-down"
            onClick={handleExportAll}
            disabled={filteredRecords.length === 0}
          >
            导出全部
          </ActionButton>
        </section>

        {selectedRecords.length > 0 ? (
          <BulkActionBar
            selectedLabel={<>已选 {formatNumber(selectedRecords.length)} 项</>}
            selectionActions={
              <>
                <ActionButton
                  variant="outline"
                  icon="arrow-down"
                  onClick={handleExportSelected}
                >
                  导出所选
                </ActionButton>
                <Button variant="ghost" onClick={handleClearSelection}>
                  清除
                </Button>
              </>
            }
          />
        ) : null}

        <section className="vx-tenant-directory" aria-label="优惠核销清单">
          {loading ? (
            <header className="vx-tenant-directory__header">
              <span>读取中</span>
            </header>
          ) : null}
          {visibleRecords.length ? (
            viewMode === "list" ? (
              <RedemptionRows
                records={visibleRecords}
                startIndex={(activePage - 1) * pageSize}
                selectedRecordIds={selectedRecordIds}
                isPageSelected={isRecordPageSelected}
                onToggleRecord={toggleRecordSelection}
                onTogglePage={toggleRecordPageSelection}
              />
            ) : (
              <RedemptionCards records={visibleRecords} />
            )
          ) : (
            <section className="vx-tenant-empty">
              <EmptyState
                title={
                  loading
                    ? "正在加载核销记录"
                    : loadError
                      ? "核销数据读取失败"
                      : "没有匹配的核销记录"
                }
                description={
                  loading
                    ? "正在读取优惠核销台账。"
                    : (loadError ?? "清空筛选条件后可查看全部核销记录。")
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
          <footer className="vx-tenant-pagination">
            <span className="vx-tenant-pagination__total">
              共 {formatNumber(filteredRecords.length)} 条核销记录
            </span>
            <div className="vx-tenant-pagination__actions">
              <PageSizePicker value={pageSize} onChange={setPageSize} />
              <DsPagination
                className="vx-tenant-pagination__pager"
                page={activePage}
                pageCount={pageCount}
                onPageChange={setCurrentPage}
              />
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
