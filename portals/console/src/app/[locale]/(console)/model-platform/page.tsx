"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable, MetricGrid, PageHeader } from "@vxture/design-system";
import type { DataTableColumn } from "@vxture/design-system";

import {
  fetchAiModelGrants,
  fetchAiModels,
  fetchTenantModelQuotas,
  fetchTenantModelUsageSummaries,
} from "@/api/console-bff";
import type {
  AiModelGrantRecord,
  AiModelRecord,
  SummaryMetric,
  TenantQuotaRecord,
  TenantUsageSummaryRecord,
} from "@/entities/console";
import { useConsoleSession } from "@/features/session/ConsoleSessionProvider";
import { DashboardSplit, PageSection, SignalList } from "@/layout/shell";

type ModelRow = [string, string, string, string];
type GrantRow = [string, string, string, string];
type QuotaRow = [string, string, string, string];
type UsageRow = [string, string, string, string];

const modelColumns: DataTableColumn<ModelRow>[] = [
  { id: "model", header: "Model", cell: (row) => row[0] },
  { id: "provider", header: "Provider", cell: (row) => row[1] },
  { id: "protocol", header: "Protocol", cell: (row) => row[2] },
  { id: "capabilities", header: "Capabilities", cell: (row) => row[3] },
];

const grantColumns: DataTableColumn<GrantRow>[] = [
  { id: "model", header: "Model", cell: (row) => row[0] },
  { id: "scope", header: "Scope", cell: (row) => row[1] },
  { id: "priority", header: "Priority", cell: (row) => row[2] },
  { id: "expires", header: "Expires", cell: (row) => row[3] },
];

const quotaColumns: DataTableColumn<QuotaRow>[] = [
  { id: "cycle", header: "Cycle", cell: (row) => row[0] },
  { id: "tokens", header: "Tokens", cell: (row) => row[1] },
  { id: "ratio", header: "Usage", cell: (row) => row[2] },
  { id: "models", header: "Allowed models", cell: (row) => row[3] },
];

const usageColumns: DataTableColumn<UsageRow>[] = [
  { id: "cycle", header: "Cycle", cell: (row) => row[0] },
  { id: "scope", header: "Scope", cell: (row) => row[1] },
  { id: "tokens", header: "Tokens", cell: (row) => row[2] },
  { id: "cost", header: "Cost", cell: (row) => row[3], align: "right" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatBigIntText(value: string | null) {
  if (!value) return "-";
  return formatNumber(Number(value));
}

function quotaUsageRatio(quota: TenantQuotaRecord) {
  if (!quota.periodTokens) return "-";
  const used = Number(quota.usedTokens);
  const limit = Number(quota.periodTokens);
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) {
    return "-";
  }
  return `${Math.min(100, Math.round((used / limit) * 100))}%`;
}

function buildMetrics(
  models: AiModelRecord[],
  grants: AiModelGrantRecord[],
  quotas: TenantQuotaRecord[],
  usageSummaries: TenantUsageSummaryRecord[],
  loading: boolean,
): SummaryMetric[] {
  const activeGrants = grants.filter((grant) => grant.isActive);
  const activeQuotas = quotas.filter((quota) => quota.isActive);
  const totalTokens = usageSummaries.reduce(
    (total, summary) => total + Number(summary.totalTokens || 0),
    0,
  );

  return [
    {
      label: "Available models",
      value: loading ? "-" : formatNumber(models.length),
      trend: `${formatNumber(activeGrants.length)} active grants`,
      tone: models.length ? "positive" : "warning",
    },
    {
      label: "Quota pools",
      value: loading ? "-" : formatNumber(activeQuotas.length),
      trend: `${formatNumber(quotas.length)} total`,
      tone: activeQuotas.length ? "positive" : "default",
    },
    {
      label: "Token usage",
      value: loading ? "-" : formatNumber(totalTokens),
      trend: `${formatNumber(usageSummaries.length)} summaries`,
      tone: totalTokens > 0 ? "positive" : "default",
    },
  ];
}

export default function Page() {
  const { session } = useConsoleSession();
  const [models, setModels] = useState<AiModelRecord[]>([]);
  const [grants, setGrants] = useState<AiModelGrantRecord[]>([]);
  const [quotas, setQuotas] = useState<TenantQuotaRecord[]>([]);
  const [usageSummaries, setUsageSummaries] = useState<
    TenantUsageSummaryRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);

    Promise.all([
      fetchAiModels(),
      fetchAiModelGrants(),
      fetchTenantModelQuotas(),
      fetchTenantModelUsageSummaries(),
    ])
      .then(([modelRecords, grantRecords, quotaRecords, usageRecords]) => {
        if (!active) return;
        setModels(modelRecords);
        setGrants(grantRecords);
        setQuotas(quotaRecords);
        setUsageSummaries(usageRecords);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session.tenant?.id]);

  const modelById = useMemo(
    () => new Map(models.map((model) => [model.id, model])),
    [models],
  );
  const metrics = buildMetrics(models, grants, quotas, usageSummaries, loading);

  const modelRows = models.map<ModelRow>((model) => [
    model.modelName,
    model.provider,
    model.protocol,
    model.capabilities.join(", ") || "-",
  ]);
  const grantRows = grants
    .filter((grant) => grant.isActive)
    .map<GrantRow>((grant) => [
      modelById.get(grant.modelId)?.modelName ?? grant.modelId,
      grant.applicationType
        ? `${grant.applicationType}:${grant.applicationId ?? "-"}`
        : "tenant",
      String(grant.priority),
      grant.expiresAt ?? "Never",
    ]);
  const quotaRows = quotas
    .filter((quota) => quota.isActive)
    .map<QuotaRow>((quota) => [
      quota.quotaCycle,
      `${formatBigIntText(quota.usedTokens)} / ${formatBigIntText(quota.periodTokens)}`,
      quotaUsageRatio(quota),
      formatNumber(quota.allowedModelIds.length),
    ]);
  const usageRows = usageSummaries.map<UsageRow>((summary) => [
    summary.cycleMonth,
    summary.applicationType
      ? `${summary.applicationType}:${summary.applicationId ?? "-"}`
      : summary.statType,
    formatBigIntText(summary.totalTokens),
    `${summary.totalCostAmount} ${summary.currency}`,
  ]);

  const statusSignals = [
    {
      title: "Tenant scope",
      description: session.tenant?.name
        ? `Showing model-platform state for ${session.tenant.name}.`
        : "Tenant context is required before model-platform state can be shown.",
    },
    {
      title: "Control-plane boundary",
      description:
        "Provider, model, policy, price, and grant changes are managed by platform operators in Admin.",
    },
  ];

  return (
    <div className="vx-page-stack">
      <PageHeader
        eyebrow="Model Platform"
        title="模型平台"
        description="当前租户可用模型、应用授权、配额和用量状态。"
      />

      {loadError ? (
        <p className="vx-profile-error">模型平台状态加载失败，请稍后重试。</p>
      ) : null}

      <MetricGrid items={metrics} />

      <DashboardSplit>
        <PageSection
          title="可用模型"
          description="由平台控制面授权给当前租户的模型。"
          tone="muted"
        >
          <DataTable
            columns={modelColumns}
            rows={modelRows}
            rowKey={(row, index) => row[0] ?? index}
            loading={loading}
            loadingLabel="Loading models..."
            empty="No available models."
          />
        </PageSection>

        <PageSection
          title="模型授权"
          description="租户级与应用级模型访问范围。"
        >
          <DataTable
            columns={grantColumns}
            rows={grantRows}
            rowKey={(row, index) => `${row[0]}-${row[1]}-${index}`}
            loading={loading}
            loadingLabel="Loading grants..."
            empty="No active model grants."
          />
        </PageSection>
      </DashboardSplit>

      <DashboardSplit>
        <PageSection title="配额状态" description="订阅周期内的模型资源池。">
          <DataTable
            columns={quotaColumns}
            rows={quotaRows}
            rowKey={(row, index) => `${row[0]}-${index}`}
            loading={loading}
            loadingLabel="Loading quotas..."
            empty="No active model quotas."
          />
        </PageSection>

        <PageSection title="用量汇总" description="按周期聚合的模型调用消耗。">
          <DataTable
            columns={usageColumns}
            rows={usageRows}
            rowKey={(row, index) => `${row[0]}-${row[1]}-${index}`}
            loading={loading}
            loadingLabel="Loading usage..."
            empty="No model usage summary."
          />
        </PageSection>
      </DashboardSplit>

      <PageSection
        title="状态说明"
        description="租户侧仅显示当前上下文可见状态。"
        tone="muted"
      >
        <SignalList items={statusSignals} />
      </PageSection>
    </div>
  );
}
