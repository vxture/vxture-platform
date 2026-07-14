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
import type { IconName } from "@vxture/design-system";
import { fetchUsageMeteringRecords } from "@/api/admin-bff";
import { exportRowsToCsv, type CsvColumn } from "@/lib/exportCsv";
import { isListTruncated } from "@/lib/list-truncation";
import type {
  UsageMeteringRecord,
  UsageMeteringRisk,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import {
  formatDate,
  formatNumber,
  joinClasses,
  typeLabel,
} from "@/modules/tenants/tenant-utils";
import {
  formatPercent,
  PageSizePicker,
  type PageSize,
  SummaryItem,
  Tag,
  type ViewMode,
} from "./CommercialUtils";

type RiskFilter = "all" | UsageMeteringRisk;
type ProductTypeFilter =
  | "all"
  | "智能体"
  | "平台"
  | "大模型"
  | "三方接入"
  | "产品能力";
type CycleFilter = "all" | string;

function riskLabel(risk: UsageMeteringRisk) {
  if (risk === "danger") return "超额";
  if (risk === "warning") return "接近上限";
  if (risk === "anomaly") return "计量异常";
  return "正常";
}

function riskIcon(risk: UsageMeteringRisk): IconName {
  if (risk === "normal") return "check";
  if (risk === "warning") return "clock";
  return "warning";
}

function riskTone(risk: UsageMeteringRisk) {
  if (risk === "normal") return "normal";
  if (risk === "warning") return "warning";
  return "danger";
}

function usageSearchText(record: UsageMeteringRecord) {
  return [
    record.tenantCode,
    record.tenantName,
    record.region,
    record.industry,
    record.orderNo,
    record.servicePlanName,
    record.productCode,
    record.productName,
    record.productType,
    record.metricCode,
    record.metricName,
    riskLabel(record.risk),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function formatUsageValue(value: number, unit: string) {
  if (unit === "token" || unit === "字") return formatNumber(value);
  return `${formatNumber(value)} ${unit}`;
}

const USAGE_CSV_COLUMNS: CsvColumn<UsageMeteringRecord>[] = [
  { label: "租户编号", value: (record) => record.tenantCode },
  { label: "租户名称", value: (record) => record.tenantName },
  { label: "产品编码", value: (record) => record.productCode },
  { label: "产品名称", value: (record) => record.productName },
  { label: "产品类型", value: (record) => record.productType },
  { label: "计量项", value: (record) => record.metricName },
  { label: "计量编码", value: (record) => record.metricCode },
  { label: "单位", value: (record) => record.metricUnit },
  { label: "已用量", value: (record) => record.usedValue },
  { label: "配额", value: (record) => record.quotaValue },
  { label: "使用率", value: (record) => record.usageRate },
  { label: "周期", value: (record) => record.cycleMonth },
  { label: "风险", value: (record) => riskLabel(record.risk) },
  { label: "最近同步", value: (record) => record.lastSyncedAt },
];

function UsageActionsMenu({ record }: { record: UsageMeteringRecord }) {
  const router = useRouter();

  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${record.tenantName} 用量操作`}
        triggerClassName="vx-tenant-actions__trigger"
        triggerProps={{ title: "操作" }}
        items={[
          {
            id: "tenant",
            label: "查看租户",
            icon: <Icon name="buildings" size="xs" fallback="placeholder" />,
            onSelect: () =>
              router.push(`/tenants/${encodeURIComponent(record.tenantId)}`),
          },
          {
            id: "subscription",
            label: "查看订阅",
            icon: <Icon name="star" size="xs" fallback="placeholder" />,
            disabled: !record.subscriptionId,
            onSelect: () => {
              if (!record.subscriptionId) return;
              router.push(
                `/subscriptions/${encodeURIComponent(record.subscriptionId)}`,
              );
            },
          },
          {
            id: "order",
            label: "查看订单",
            icon: <Icon name="table" size="xs" fallback="placeholder" />,
            disabled: !record.subscriptionId,
            onSelect: () => {
              if (!record.subscriptionId) return;
              router.push(
                `/orders/${encodeURIComponent(record.subscriptionId)}`,
              );
            },
          },
        ]}
      />
    </div>
  );
}

function UsageListRows({
  records,
  startIndex,
  selectedRecordIds,
  isPageSelected,
  onToggleRecord,
  onTogglePage,
}: {
  records: UsageMeteringRecord[];
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
      className="vx-tenant-directory-list vx-usage-directory-list"
      role="region"
      aria-label="用量计费清单"
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
            aria-label="选择当前页用量记录"
          />
        </span>
        <span>序号</span>
        <span>租户</span>
        <span>产品能力</span>
        <span>计量项</span>
        <span>用量</span>
        <span>风险</span>
        <span>周期</span>
        <span>操作</span>
      </div>
      {records.map((record, index) => {
        const selected = selectedRecordIds.has(record.id);

        return (
          <div
            key={record.id}
            className={joinClasses(
              "vx-tenant-directory-row",
              "vx-usage-operation-row",
              `vx-commercial-row--${riskTone(record.risk)}`,
              selected ? "vx-usage-operation-row--selected" : undefined,
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
            <span className="vx-usage-operation-row__select">
              <Checkbox
                className="vx-model-select-checkbox"
                checked={selected}
                onCheckedChange={(value) =>
                  onToggleRecord(record.id, value === true)
                }
                aria-label={`选择用量记录 ${record.tenantName}`}
              />
            </span>
            <span className="vx-tenant-directory-row__index">
              {formatNumber(startIndex + index + 1)}
            </span>
            <span className="vx-commercial-row__tenant">
              <Icon
                name={record.tenantType === "company" ? "buildings" : "user"}
                size="sm"
                fallback="placeholder"
              />
              <span>
                <Button
                  variant="link"
                  className="vx-model-name-button"
                  onClick={() =>
                    router.push(
                      `/tenants/${encodeURIComponent(record.tenantId)}`,
                    )
                  }
                >
                  {record.tenantName}
                </Button>
                <small>
                  {record.tenantCode} · {typeLabel(record.tenantType)}
                </small>
              </span>
            </span>
            <span className="vx-commercial-row__main">
              <strong>{record.productName}</strong>
              <small>
                {record.productType} · {record.productCode}
              </small>
            </span>
            <span className="vx-commercial-row__main">
              <span className="vx-tenant-directory-row__tag-line">
                <Tag tone="muted">{record.metricUnit}</Tag>
              </span>
              <small>{record.metricName}</small>
            </span>
            <span className="vx-commercial-row__center">
              <strong>
                {formatUsageValue(record.usedValue, record.metricUnit)}
              </strong>
              <small>
                配额 {formatUsageValue(record.quotaValue, record.metricUnit)} ·{" "}
                {formatPercent(record.usageRate)}
              </small>
            </span>
            <span className="vx-commercial-row__center">
              <span className="vx-commercial-status-line">
                <span
                  className={`vx-commercial-status-dot vx-commercial-status-dot--${riskTone(record.risk)}`}
                  aria-hidden="true"
                >
                  <Icon
                    name={riskIcon(record.risk)}
                    size="xs"
                    fallback="placeholder"
                  />
                </span>
                <Tag tone={riskTone(record.risk)}>{riskLabel(record.risk)}</Tag>
              </span>
            </span>
            <span className="vx-commercial-row__center">
              <strong>{record.cycleMonth}</strong>
              <small>{formatDate(record.lastSyncedAt)}</small>
            </span>
            <UsageActionsMenu record={record} />
          </div>
        );
      })}
    </div>
  );
}

function UsageCards({ records }: { records: UsageMeteringRecord[] }) {
  const router = useRouter();

  return (
    <div
      className="vx-tenant-directory-cards vx-commercial-cards"
      aria-label="用量计费卡片"
    >
      {records.map((record) => (
        <article
          key={record.id}
          className={joinClasses(
            "vx-tenant-directory-card",
            `vx-commercial-card--${riskTone(record.risk)}`,
          )}
          role="button"
          tabIndex={0}
          onClick={() =>
            router.push(`/tenants/${encodeURIComponent(record.tenantId)}`)
          }
        >
          <header>
            <Icon name="graph" size="lg" fallback="placeholder" />
            <div>
              <strong>{record.tenantName}</strong>
              <span>
                {record.productName} · {record.metricName}
              </span>
            </div>
            <UsageActionsMenu record={record} />
          </header>
          <div className="vx-tenant-directory-card__badges">
            <Tag tone={riskTone(record.risk)}>{riskLabel(record.risk)}</Tag>
            <Tag tone="muted">{record.productType}</Tag>
          </div>
          <p className="vx-commercial-card__description">
            {record.servicePlanName ?? record.orderNo ?? "未关联订阅"}
          </p>
          <div className="vx-tenant-directory-card__metrics">
            <span>
              <b>{formatUsageValue(record.usedValue, record.metricUnit)}</b>
              <small>已用</small>
            </span>
            <span>
              <b>{formatUsageValue(record.quotaValue, record.metricUnit)}</b>
              <small>配额</small>
            </span>
            <span>
              <b>{formatPercent(record.usageRate)}</b>
              <small>使用率</small>
            </span>
          </div>
          <footer>
            <span>{record.cycleMonth}</span>
            <strong>{formatDate(record.lastSyncedAt)}</strong>
          </footer>
        </article>
      ))}
    </div>
  );
}

export function UsageMeteringPage() {
  const [records, setRecords] = useState<UsageMeteringRecord[]>([]);
  const [recordsTruncated, setRecordsTruncated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [productTypeFilter, setProductTypeFilter] =
    useState<ProductTypeFilter>("all");
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>("all");
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
    fetchUsageMeteringRecords()
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
            error instanceof Error ? error.message : "用量数据读取失败",
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

  const cycles = useMemo(
    () =>
      Array.from(new Set(records.map((record) => record.cycleMonth)))
        .sort()
        .reverse(),
    [records],
  );
  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((record) => {
      if (riskFilter !== "all" && record.risk !== riskFilter) return false;
      if (
        productTypeFilter !== "all" &&
        record.productType !== productTypeFilter
      )
        return false;
      if (cycleFilter !== "all" && record.cycleMonth !== cycleFilter)
        return false;
      if (normalizedQuery && !usageSearchText(record).includes(normalizedQuery))
        return false;
      return true;
    });
  }, [cycleFilter, productTypeFilter, query, records, riskFilter]);

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
  const totalUsed = records.reduce((sum, record) => sum + record.usedValue, 0);
  const warningCount = records.filter(
    (record) => record.risk === "warning",
  ).length;
  const dangerCount = records.filter(
    (record) => record.risk === "danger" || record.risk === "anomaly",
  ).length;

  useEffect(() => {
    setCurrentPage(1);
  }, [cycleFilter, pageSize, productTypeFilter, query, riskFilter, viewMode]);

  function handleReset() {
    setQuery("");
    setRiskFilter("all");
    setProductTypeFilter("all");
    setCycleFilter("all");
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

  function clearRecordSelection() {
    setSelectedRecordIds(new Set());
  }

  function handleExportSelected() {
    exportRowsToCsv(
      "usage-metering-export",
      USAGE_CSV_COLUMNS,
      selectedRecords,
    );
  }

  function handleExportAll() {
    exportRowsToCsv(
      "usage-metering-export",
      USAGE_CSV_COLUMNS,
      filteredRecords,
    );
  }

  return (
    <div className="vx-page-stack vx-tenant-management-page vx-usage-page">
      <PageHeader
        icon="graph"
        eyebrow="订阅交易"
        title="用量计费"
        description="运营侧查看租户、订阅、产品能力维度的计量消耗、配额使用率和超额风险。"
      />

      <section className="vx-tenant-summary" aria-label="用量计费统计">
        <SummaryItem
          icon="graph"
          label="计量记录"
          value={formatNumber(records.length)}
          tags={[`筛选 ${formatNumber(filteredRecords.length)}`]}
        />
        <SummaryItem
          icon="chart-bar"
          label="总消耗"
          value={formatNumber(totalUsed)}
          tags={[`计量项 ${formatNumber(records.length)}`]}
          tone="green"
        />
        <SummaryItem
          icon="clock"
          label="接近上限"
          value={formatNumber(warningCount)}
          tags={[">=85%"]}
          tone={warningCount ? "amber" : "green"}
        />
        <SummaryItem
          icon="warning"
          label="超额异常"
          value={formatNumber(dangerCount)}
          tags={[">100% / 异常"]}
          tone={dangerCount ? "rose" : "green"}
        />
      </section>

      {recordsTruncated ? (
        <Banner
          tone="warning"
          title="当前用量列表可能未展示全部数据"
          description="本次加载已达到单次读取上限（500 条），如未看到目标记录，请尝试缩小筛选范围（如按风险、产品类型、周期等）重新查询。"
        />
      ) : null}

      <div className="vx-tenant-list-shell">
        <section className="vx-tenant-toolbar" aria-label="用量筛选">
          <ViewModeSwitch
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="用量展示方式"
          />
          <span className="vx-tenant-view-count">
            {formatNumber(filteredRecords.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索租户、产品、计量项"
            className="vx-tenant-search vx-commercial-search"
            aria-label="搜索用量"
          />
          <Button variant="outline" onClick={handleReset}>
            重置
          </Button>
          <ActionButton
            variant="outline"
            icon="arrow-down"
            onClick={handleExportAll}
            disabled={!filteredRecords.length}
          >
            导出全部
          </ActionButton>
          <div className="vx-tenant-filters">
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={riskFilter}
              onChange={(event) =>
                setRiskFilter(event.target.value as RiskFilter)
              }
              aria-label="风险状态"
            >
              <option value="all">全部风险</option>
              <option value="normal">正常</option>
              <option value="warning">接近上限</option>
              <option value="danger">超额</option>
              <option value="anomaly">计量异常</option>
            </NativeSelect>
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={productTypeFilter}
              onChange={(event) =>
                setProductTypeFilter(event.target.value as ProductTypeFilter)
              }
              aria-label="产品类型"
            >
              <option value="all">全部产品</option>
              <option value="智能体">智能体</option>
              <option value="平台">平台</option>
              <option value="大模型">大模型</option>
              <option value="三方接入">三方接入</option>
              <option value="产品能力">产品能力</option>
            </NativeSelect>
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={cycleFilter}
              onChange={(event) => setCycleFilter(event.target.value)}
              aria-label="计量周期"
            >
              <option value="all">全部周期</option>
              {cycles.map((cycle) => (
                <option key={cycle} value={cycle}>
                  {cycle}
                </option>
              ))}
            </NativeSelect>
          </div>
        </section>

        {selectedRecords.length ? (
          <BulkActionBar
            selectedLabel={<>已选 {formatNumber(selectedRecords.length)} 项</>}
            selectionActions={
              <>
                <Button variant="outline" onClick={handleExportSelected}>
                  导出所选
                </Button>
                <Button variant="ghost" onClick={clearRecordSelection}>
                  清除
                </Button>
              </>
            }
          />
        ) : null}

        <section className="vx-tenant-directory" aria-label="用量清单">
          {loading ? (
            <header className="vx-tenant-directory__header">
              <span>读取中</span>
            </header>
          ) : null}
          {visibleRecords.length ? (
            viewMode === "list" ? (
              <UsageListRows
                records={visibleRecords}
                startIndex={(activePage - 1) * pageSize}
                selectedRecordIds={selectedRecordIds}
                isPageSelected={isRecordPageSelected}
                onToggleRecord={toggleRecordSelection}
                onTogglePage={toggleRecordPageSelection}
              />
            ) : (
              <UsageCards records={visibleRecords} />
            )
          ) : (
            <section className="vx-tenant-empty">
              <EmptyState
                title={
                  loading
                    ? "正在加载用量"
                    : loadError
                      ? "用量数据读取失败"
                      : "没有匹配的用量记录"
                }
                description={
                  loading
                    ? "正在读取计量汇总数据。"
                    : (loadError ?? "清空筛选条件后可查看全部计量记录。")
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
              共 {formatNumber(filteredRecords.length)} 条用量记录
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
