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
  Section,
  ViewHeader,
  ViewLayout,
} from "@vxture/design-system";
import { api, OperaApiError } from "@/lib/api";

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

export default function MeteringPage() {
  const [rows, setRows] = useState<TenantUsageSummaryRecord[]>([]);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [keyword, setKeyword] = useState("");
  const [cycleMonth, setCycleMonth] = useState("all");

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
              onChange={(e) => setKeyword(e.target.value)}
            />
          </InputGroup>
          <NativeSelect
            wrapperClassName="w-fit"
            value={cycleMonth}
            onChange={(e) => setCycleMonth(e.target.value)}
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
              id: "cycle",
              header: "周期",
              cell: (r: TenantUsageSummaryRecord) => r.cycleMonth,
            },
            {
              id: "statType",
              header: "统计口径",
              cell: (r: TenantUsageSummaryRecord) => r.statType,
            },
            {
              id: "requests",
              header: "请求数",
              align: "right",
              cell: (r: TenantUsageSummaryRecord) =>
                `${formatNumber(r.totalRequests)}（失败 ${formatNumber(r.failedRequests)}）`,
            },
            {
              id: "tokens",
              header: "Token（入/出）",
              align: "right",
              cell: (r: TenantUsageSummaryRecord) =>
                `${formatNumber(r.totalInputTokens)} / ${formatNumber(r.totalOutputTokens)}`,
            },
            {
              id: "cost",
              header: "Raw Cost",
              align: "right",
              cell: (r: TenantUsageSummaryRecord) =>
                formatCost(r.totalCostAmount, r.currency),
            },
          ]}
          rows={filtered}
          rowKey={(r: TenantUsageSummaryRecord) => r.id}
          empty={emptyState}
        />
      </Section>
    </ViewLayout>
  );
}
