"use client";

/* Metering — Atlas 事实计量（用量汇总）。
 *
 * 2026-08-11 接真实数据：源头是 opera-bff 的 GET /api/atlas/usage-summaries，
 * 代理 Atlas 真实的 `/capability/usage-summaries`。真实数据只有 tenant 维度的
 * 周期汇总（tenantId × cycleMonth × statType），没有 mocks/atlas.ts 那份
 * Provider/Model/Endpoint 四维切换——那四个维度里只有 tenant 有真实数据源，
 * 硬留另外三个空维度切换没有意义，删掉比留着假装能切换更诚实。
 *
 * 只读、不做定价：这里记的是 Raw Cost（Atlas 侧事实成本），销售价格是 admin
 * 商业层（price-rules）的事。 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionMenu,
  BulkActionBar,
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  Icon,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  MetricGrid,
  NativeSelect,
  Pagination,
  Section,
  ViewHeader,
  ViewLayout,
  useListPagination,
  useToast,
} from "@vxture/design-system";
import { api, OperaApiError } from "@/lib/api";

/** 触发一次浏览器下载；用完立即回收 URL，不留 blob 常驻内存。 */
function downloadCsv(filename: string, rows: readonly string[][]) {
  const csv = rows
    .map((cols) => cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface TenantUsageSummaryRecord {
  id: string;
  tenantId: string;
  applicationId: string | null;
  applicationType: string | null;
  cycleMonth: string;
  statType: string;
  totalRequests: string;
  successRequests: string;
  failedRequests: string;
  totalInputTokens: string;
  totalOutputTokens: string;
  totalTokens: string;
  totalCostAmount: string;
  currency: string;
  updatedAt: string;
}

function formatNumber(value: string): string {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("zh-CN").format(n) : value;
}

function formatCost(value: string, currency: string): string {
  const n = Number(value);
  return Number.isFinite(n)
    ? `${currency} ${n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : value;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

const CSV_HEADER = [
  "租户",
  "周期",
  "统计口径",
  "总请求",
  "失败请求",
  "Input Token",
  "Output Token",
  "Raw Cost",
  "币种",
];

function toCsvRow(r: TenantUsageSummaryRecord): string[] {
  return [
    r.tenantId,
    r.cycleMonth,
    r.statType,
    r.totalRequests,
    r.failedRequests,
    r.totalInputTokens,
    r.totalOutputTokens,
    r.totalCostAmount,
    r.currency,
  ];
}

export default function MeteringPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<TenantUsageSummaryRecord[]>([]);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [keyword, setKeyword] = useState("");
  const [cycleMonth, setCycleMonth] = useState("all");
  const [selectedKeys, setSelectedKeys] = useState<readonly string[]>([]);

  const reload = useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const data = await api.get<TenantUsageSummaryRecord[]>(
        "/api/atlas/usage-summaries",
      );
      setRows(data);
      setLoad({ kind: "ready" });
    } catch (error) {
      setLoad({
        kind: "error",
        message:
          error instanceof OperaApiError ? error.message : "读取用量数据失败",
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const cycleMonths = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.cycleMonth)))
        .sort()
        .reverse(),
    [rows],
  );

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (cycleMonth === "all" || r.cycleMonth === cycleMonth) &&
        (kw === "" || r.tenantId.toLowerCase().includes(kw)),
    );
  }, [rows, keyword, cycleMonth]);

  const pager = useListPagination(filtered, 20);

  const copyRow = async (r: TenantUsageSummaryRecord) => {
    const text = toCsvRow(r).join(" · ");
    try {
      await navigator.clipboard.writeText(text);
      toast({ tone: "success", title: "已复制该行到剪贴板" });
    } catch {
      toast({
        tone: "danger",
        title: "复制失败",
        description: "浏览器拒绝了剪贴板访问，请手动选中复制。",
      });
    }
  };

  const exportSelected = () => {
    const ids = new Set(selectedKeys);
    const picked = filtered.filter((r) => ids.has(r.id));
    downloadCsv(`atlas-usage-${Date.now()}.csv`, [
      CSV_HEADER,
      ...picked.map(toCsvRow),
    ]);
    toast({ tone: "success", title: `已导出 ${picked.length} 条记录` });
    setSelectedKeys([]);
  };

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => ({
          requests: acc.requests + Number(r.totalRequests || 0),
          inputTokens: acc.inputTokens + Number(r.totalInputTokens || 0),
          outputTokens: acc.outputTokens + Number(r.totalOutputTokens || 0),
          cost: acc.cost + Number(r.totalCostAmount || 0),
        }),
        { requests: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
      ),
    [filtered],
  );

  const currency = filtered[0]?.currency ?? "CNY";

  const emptyState =
    load.kind === "loading" ? (
      <EmptyState title="读取中…" description="正在读取用量汇总。" />
    ) : load.kind === "error" ? (
      <EmptyState
        title="读取失败"
        description={load.message}
        action={
          <Button variant="secondary" onClick={() => void reload()}>
            重试
          </Button>
        }
      />
    ) : filtered.length !== rows.length ? (
      <EmptyState title="没有匹配的记录" description="换个关键词或周期再看。" />
    ) : (
      <EmptyState
        title="暂无用量数据"
        description="Atlas 尚未回传任何用量汇总。"
      />
    );

  return (
    <ViewLayout>
      <ViewHeader
        icon="gauge"
        title="Metering"
        description="所有请求必须被计量。这里记的是 Raw Cost（Atlas 侧事实成本），不做定价——销售价格归 admin 的价格规则。"
      />

      <MetricGrid
        loading={load.kind === "loading" && rows.length === 0}
        columns={4}
        items={[
          {
            id: "requests",
            label: "总请求",
            value: formatNumber(String(totals.requests)),
            icon: "gauge",
          },
          {
            id: "in",
            label: "Input Token",
            value: formatNumber(String(totals.inputTokens)),
            icon: "arrow-down",
          },
          {
            id: "out",
            label: "Output Token",
            value: formatNumber(String(totals.outputTokens)),
            icon: "arrow-up",
          },
          {
            id: "cost",
            label: "Raw Cost",
            value: formatCost(String(totals.cost), currency),
            icon: "coins",
            help: "Atlas 侧事实成本，非销售价格",
          },
        ]}
      />

      <Section
        title="按租户汇总"
        icon="building"
        level={2}
        description="Atlas 只按租户 × 结算周期回传用量事实；Provider / Model / Endpoint 细分暂无对应上游数据源。"
      >
        <FilterBar
          view="list"
          onViewChange={() => {}}
          cardsDisabledReason="卡片视图已下线，改用列表"
          count={
            filtered.length === rows.length
              ? rows.length
              : `${filtered.length} / ${rows.length}`
          }
        >
          <InputGroup className="grow basis-media-3xl max-w-panel-sm">
            <InputGroupAddon>
              <Icon name="search" size="sm" aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="搜索租户 ID…"
              aria-label="搜索租户"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                pager.resetPage();
              }}
            />
          </InputGroup>
          <NativeSelect
            wrapperClassName="w-fit"
            value={cycleMonth}
            onChange={(e) => {
              setCycleMonth(e.target.value);
              pager.resetPage();
            }}
            aria-label="结算周期"
          >
            <option value="all">全部周期</option>
            {cycleMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </NativeSelect>
        </FilterBar>

        <BulkActionBar
          count={selectedKeys.length}
          noun="条"
          onClear={() => setSelectedKeys([])}
          actions={[
            {
              id: "export",
              label: "导出所选",
              icon: "download",
              onSelect: exportSelected,
            },
          ]}
        />

        <DataTable
          columns={[
            {
              id: "tenant",
              header: "租户",
              cell: (r: TenantUsageSummaryRecord) => (
                <span className="text-body-sm text-foreground">
                  {r.tenantId}
                </span>
              ),
            },
            {
              id: "requests",
              header: "请求数",
              align: "right",
              width: "sm",
              cell: (r: TenantUsageSummaryRecord) =>
                `${formatNumber(r.totalRequests)}（失败 ${formatNumber(r.failedRequests)}）`,
            },
            {
              id: "tokens",
              header: "Token（入/出）",
              align: "right",
              width: "sm",
              cell: (r: TenantUsageSummaryRecord) =>
                `${formatNumber(r.totalInputTokens)} / ${formatNumber(r.totalOutputTokens)}`,
            },
            {
              id: "cost",
              header: "Raw Cost",
              align: "right",
              width: "sm",
              cell: (r: TenantUsageSummaryRecord) =>
                formatCost(r.totalCostAmount, r.currency),
            },
            {
              id: "cycle",
              header: "周期",
              align: "center",
              width: "xs",
              cell: (r: TenantUsageSummaryRecord) => r.cycleMonth,
            },
            {
              id: "statType",
              header: "统计口径",
              align: "center",
              width: "xs",
              cell: (r: TenantUsageSummaryRecord) => r.statType,
            },
          ]}
          rows={pager.pageRows}
          rowKey={(r: TenantUsageSummaryRecord) => r.id}
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          indexStart={pager.indexStart}
          rowActions={(r) => (
            <ActionMenu
              label={`${r.tenantId} 操作`}
              items={[
                {
                  id: "copy",
                  label: "复制该行",
                  icon: "copy",
                  onSelect: () => void copyRow(r),
                },
              ]}
            />
          )}
          empty={emptyState}
          footer={
            <Pagination
              className="w-full"
              page={pager.page}
              pageCount={pager.pageCount}
              total={rows.length}
              filteredTotal={filtered.length}
              pageSize={pager.pageSize}
              onPageSizeChange={pager.onPageSizeChange}
              onPageChange={pager.onPageChange}
            />
          }
        />
      </Section>
    </ViewLayout>
  );
}
