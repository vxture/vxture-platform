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
import { fetchPromotionOperations } from "@/api/admin-bff";
import { exportRowsToCsv, type CsvColumn } from "@/lib/exportCsv";
import { isListTruncated } from "@/lib/list-truncation";
import type {
  PromotionOperationRecord,
  PromotionOperationStatus,
  PromotionOperationType,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import {
  formatDate,
  formatNumber,
  joinClasses,
} from "@/modules/tenants/tenant-utils";
import {
  PageSizePicker,
  type PageSize,
  SummaryItem,
  Tag,
  type ViewMode,
} from "./CommercialUtils";

type StatusFilter = "all" | PromotionOperationStatus;
type TypeFilter = "all" | PromotionOperationType;

function statusLabel(status: PromotionOperationStatus) {
  if (status === "scheduled") return "待开始";
  if (status === "expired") return "已结束";
  if (status === "paused") return "已暂停";
  return "生效中";
}

function typeLabel(type: PromotionOperationType) {
  if (type === "discount") return "套餐折扣";
  if (type === "coupon") return "优惠码";
  return "活动";
}

function statusTone(status: PromotionOperationStatus) {
  if (status === "active") return "normal";
  if (status === "scheduled") return "warning";
  if (status === "paused") return "muted";
  return "danger";
}

function promotionSearchText(record: PromotionOperationRecord) {
  return [
    record.promotionCode,
    record.promotionName,
    record.scopeLabel,
    record.discountLabel,
    record.ownerName,
    record.description,
    statusLabel(record.status),
    typeLabel(record.promotionType),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const PROMOTION_CSV_COLUMNS: CsvColumn<PromotionOperationRecord>[] = [
  { label: "优惠编号", value: (record) => record.promotionCode },
  { label: "优惠名称", value: (record) => record.promotionName },
  { label: "类型", value: (record) => typeLabel(record.promotionType) },
  { label: "状态", value: (record) => statusLabel(record.status) },
  { label: "适用范围", value: (record) => record.scopeLabel },
  { label: "优惠", value: (record) => record.discountLabel },
  { label: "核销次数", value: (record) => record.redemptionCount },
  { label: "租户数", value: (record) => record.tenantCount },
  { label: "负责人", value: (record) => record.ownerName },
  { label: "开始时间", value: (record) => formatDate(record.startsAt) },
  {
    label: "结束时间",
    value: (record) => (record.endsAt ? formatDate(record.endsAt) : "长期"),
  },
];

function PromotionActionsMenu({
  record,
}: {
  record: PromotionOperationRecord;
}) {
  const router = useRouter();

  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${record.promotionName} 操作`}
        triggerClassName="vx-tenant-actions__trigger"
        triggerProps={{ title: "操作" }}
        items={[
          {
            id: "redemptions",
            label: "查看核销",
            icon: <Icon name="check" size="xs" fallback="placeholder" />,
            onSelect: () => router.push("/promotion-redemptions"),
          },
          {
            id: "service-plans",
            label: "服务套餐",
            icon: <Icon name="star" size="xs" fallback="placeholder" />,
            onSelect: () => router.push("/service-plans"),
          },
        ]}
      />
    </div>
  );
}

function PromotionRows({
  records,
  startIndex,
  selectedRecordIds,
  isPageSelected,
  onToggleRecord,
  onTogglePage,
}: {
  records: PromotionOperationRecord[];
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
      className="vx-tenant-directory-list vx-promotion-directory-list"
      role="region"
      aria-label="营销优惠清单"
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
            aria-label="选择当前页优惠活动"
          />
        </span>
        <span>序号</span>
        <span>优惠活动</span>
        <span>适用范围</span>
        <span>优惠</span>
        <span>核销</span>
        <span>状态</span>
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
              "vx-promotion-operation-row",
              `vx-commercial-row--${statusTone(record.status)}`,
              selected ? "vx-promotion-operation-row--selected" : undefined,
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
            <span className="vx-promotion-operation-row__select">
              <Checkbox
                className="vx-model-select-checkbox"
                checked={selected}
                onCheckedChange={(value) =>
                  onToggleRecord(record.id, value === true)
                }
                aria-label={`选择优惠活动 ${record.promotionName}`}
              />
            </span>
            <span className="vx-tenant-directory-row__index">
              {formatNumber(startIndex + index + 1)}
            </span>
            <span className="vx-commercial-row__main">
              <Button
                variant="link"
                className="vx-model-name-button"
                onClick={() => router.push("/promotion-redemptions")}
              >
                {record.promotionName}
              </Button>
              <small>
                {record.promotionCode} · {typeLabel(record.promotionType)}
              </small>
            </span>
            <span className="vx-commercial-row__main">
              <span className="vx-tenant-directory-row__tag-line">
                <Tag tone="muted">{record.scopeLabel}</Tag>
              </span>
              <small>{record.description}</small>
            </span>
            <span className="vx-commercial-row__center">
              <strong>{record.discountLabel}</strong>
              <small>{typeLabel(record.promotionType)}</small>
            </span>
            <span className="vx-commercial-row__center">
              <strong>{formatNumber(record.redemptionCount)}</strong>
              <small>{formatNumber(record.tenantCount)} 租户</small>
            </span>
            <span className="vx-commercial-row__center">
              <Tag tone={statusTone(record.status)}>
                {statusLabel(record.status)}
              </Tag>
              <small>{record.ownerName}</small>
            </span>
            <span className="vx-commercial-row__center">
              <strong>{formatDate(record.startsAt)}</strong>
              <small>
                {record.endsAt ? formatDate(record.endsAt) : "长期"}
              </small>
            </span>
            <PromotionActionsMenu record={record} />
          </div>
        );
      })}
    </div>
  );
}

function PromotionCards({ records }: { records: PromotionOperationRecord[] }) {
  return (
    <div
      className="vx-tenant-directory-cards vx-commercial-cards"
      aria-label="营销优惠卡片"
    >
      {records.map((record) => (
        <article
          key={record.id}
          className={joinClasses(
            "vx-tenant-directory-card",
            `vx-commercial-card--${statusTone(record.status)}`,
          )}
        >
          <header>
            <Icon name="sparkles" size="lg" fallback="placeholder" />
            <div>
              <strong>{record.promotionName}</strong>
              <span>
                {record.promotionCode} · {record.scopeLabel}
              </span>
            </div>
            <PromotionActionsMenu record={record} />
          </header>
          <div className="vx-tenant-directory-card__badges">
            <Tag tone={statusTone(record.status)}>
              {statusLabel(record.status)}
            </Tag>
            <Tag tone="muted">{typeLabel(record.promotionType)}</Tag>
          </div>
          <p className="vx-commercial-card__description">
            {record.description}
          </p>
          <div className="vx-tenant-directory-card__metrics">
            <span>
              <b>{record.discountLabel}</b>
              <small>优惠</small>
            </span>
            <span>
              <b>{formatNumber(record.redemptionCount)}</b>
              <small>核销</small>
            </span>
            <span>
              <b>{formatNumber(record.tenantCount)}</b>
              <small>租户</small>
            </span>
          </div>
          <footer>
            <span>{record.ownerName}</span>
            <strong>{formatDate(record.updatedAt)}</strong>
          </footer>
        </article>
      ))}
    </div>
  );
}

export function PromotionsPage() {
  const [records, setRecords] = useState<PromotionOperationRecord[]>([]);
  const [recordsTruncated, setRecordsTruncated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    let active = true;
    setLoadError(null);
    fetchPromotionOperations()
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
            error instanceof Error ? error.message : "优惠数据读取失败",
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
      if (statusFilter !== "all" && record.status !== statusFilter)
        return false;
      if (typeFilter !== "all" && record.promotionType !== typeFilter)
        return false;
      if (
        normalizedQuery &&
        !promotionSearchText(record).includes(normalizedQuery)
      )
        return false;
      return true;
    });
  }, [query, records, statusFilter, typeFilter]);
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
  const activeCount = records.filter(
    (record) => record.status === "active",
  ).length;
  const redemptionCount = records.reduce(
    (sum, record) => sum + record.redemptionCount,
    0,
  );
  const tenantReach = records.reduce(
    (sum, record) => sum + record.tenantCount,
    0,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, query, statusFilter, typeFilter, viewMode]);

  function handleReset() {
    setQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
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
      "promotions-export",
      PROMOTION_CSV_COLUMNS,
      selectedRecords,
    );
  }

  function handleExportAll() {
    exportRowsToCsv(
      "promotions-export",
      PROMOTION_CSV_COLUMNS,
      filteredRecords,
    );
  }

  function handleClearSelection() {
    setSelectedRecordIds(new Set());
  }

  return (
    <div className="vx-page-stack vx-tenant-management-page vx-promotions-page">
      <PageHeader
        icon="sparkles"
        eyebrow="产品体系"
        title="营销优惠"
        description="市场运营侧查看卡券批次、发放与核销台账（批次/发码/核销数据来自 promotion 域）。券面金额按 kind 存于 effect JSONB，暂不在本台账展示（见 TD-030）。"
      />
      <section className="vx-tenant-summary" aria-label="营销优惠统计">
        <SummaryItem
          icon="sparkles"
          label="优惠活动"
          value={formatNumber(records.length)}
          tags={[`生效 ${formatNumber(activeCount)}`]}
        />
        <SummaryItem
          icon="check"
          label="核销次数"
          value={formatNumber(redemptionCount)}
          tags={[`筛选 ${formatNumber(filteredRecords.length)}`]}
          tone="green"
        />
        <SummaryItem
          icon="chart-bar"
          label="覆盖租户"
          value={formatNumber(tenantReach)}
          tags={["已核销租户数"]}
          tone="green"
        />
        <SummaryItem
          icon="clock"
          label="待配置"
          value={formatNumber(
            records.filter((record) => record.promotionType === "coupon")
              .length,
          )}
          tags={["优惠码"]}
          tone="amber"
        />
      </section>
      {recordsTruncated ? (
        <Banner
          tone="warning"
          title="当前优惠列表可能未展示全部数据"
          description="本次加载已达到单次读取上限（500 条），如未看到目标优惠活动，请尝试缩小筛选范围（如按状态、类型等）重新查询。"
        />
      ) : null}

      <div className="vx-tenant-list-shell">
        <section className="vx-tenant-toolbar" aria-label="营销优惠筛选">
          <ViewModeSwitch
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="营销优惠展示方式"
          />
          <span className="vx-tenant-view-count">
            {formatNumber(filteredRecords.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索优惠、套餐、负责人"
            className="vx-tenant-search vx-commercial-search"
            aria-label="搜索优惠"
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
              aria-label="优惠状态"
            >
              <option value="all">全部状态</option>
              <option value="active">生效中</option>
              <option value="scheduled">待开始</option>
              <option value="paused">已暂停</option>
              <option value="expired">已结束</option>
            </NativeSelect>
            <NativeSelect
              className="vx-input vx-tenant-select"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as TypeFilter)
              }
              aria-label="优惠类型"
            >
              <option value="all">全部类型</option>
              <option value="discount">套餐折扣</option>
              <option value="coupon">优惠码</option>
              <option value="campaign">活动</option>
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
          <ActionButton variant="outline" icon="plus" disabled>
            新建优惠
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
        <section className="vx-tenant-directory" aria-label="营销优惠清单">
          {loading ? (
            <header className="vx-tenant-directory__header">
              <span>读取中</span>
            </header>
          ) : null}
          {visibleRecords.length ? (
            viewMode === "list" ? (
              <PromotionRows
                records={visibleRecords}
                startIndex={(activePage - 1) * pageSize}
                selectedRecordIds={selectedRecordIds}
                isPageSelected={isRecordPageSelected}
                onToggleRecord={toggleRecordSelection}
                onTogglePage={toggleRecordPageSelection}
              />
            ) : (
              <PromotionCards records={visibleRecords} />
            )
          ) : (
            <section className="vx-tenant-empty">
              <EmptyState
                title={
                  loading
                    ? "正在加载优惠"
                    : loadError
                      ? "优惠数据读取失败"
                      : "没有匹配的优惠"
                }
                description={
                  loading
                    ? "正在读取营销优惠台账。"
                    : (loadError ?? "清空筛选条件后可查看全部优惠活动。")
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
              共 {formatNumber(filteredRecords.length)} 条优惠记录
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
