"use client";

/* Metrics — opera-top-level-design.md §7：请求量 / 延迟 / 错误率等运行指标。
 *
 * 2026-08-12 诚实化：此前 gateway/providerMetrics 是页面里手写的虚构数组
 * （QPS/延迟/错误率），mocks/atlas.ts 的 meteringByProvider/Model/Endpoint 三个
 * 维度同样是虚构——Atlas 真实的 `/capability/usage-summaries` 只回传
 * tenant × cycleMonth 维度（Metering 页已接），没有 provider/model/endpoint
 * 细分，也没有任何网关侧 QPS/延迟/错误率导出（已提 liaison issue 给
 * vxture-atlas）。接假数据不如不接——这里换成两块真实存在的运行信号
 * （后台任务执行统计、webhook 投递队列深度），并如实标注网关性能指标的缺口，
 * 不再假装能看到 Provider/Model 维度的性能数据。 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionMenu,
  Banner,
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  Icon,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  MetricGrid,
  Pagination,
  Section,
  StatusBadge,
  ViewHeader,
  ViewLayout,
  useListPagination,
  useToast,
  type StatusBadgeTone,
} from "@vxture/design-system";
import { api, OperaApiError } from "@/lib/api";

type JobStatus = "idle" | "running" | "success" | "failed";

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  idle: "空闲",
  running: "运行中",
  success: "正常",
  failed: "异常",
};

function jobStatusTone(status: JobStatus): StatusBadgeTone {
  if (status === "success") return "success";
  if (status === "running") return "info";
  if (status === "failed") return "danger";
  return "neutral";
}

interface JobHeartbeatItem {
  jobName: string;
  status: JobStatus;
  lastDurationMs: number | null;
  runCount: number;
  failureCount: number;
}

interface WebhookQueueCounts {
  pending: number;
  delivering: number;
  delivered: number;
  failed: number;
  dead: number;
}

interface JobSchedulerSnapshot {
  jobs: JobHeartbeatItem[];
  queue: { counts: WebhookQueueCounts };
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

export default function MetricsPage() {
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState<JobSchedulerSnapshot | null>(null);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<readonly string[]>([]);

  const reload = useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const data = await api.get<JobSchedulerSnapshot>("/api/job-scheduler");
      setSnapshot(data);
      setLoad({ kind: "ready" });
    } catch (error) {
      setLoad({
        kind: "error",
        message:
          error instanceof OperaApiError ? error.message : "读取运行指标失败",
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const counts = snapshot?.queue.counts;
  const jobs = useMemo(() => snapshot?.jobs ?? [], [snapshot]);
  const filteredJobs = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return kw === ""
      ? jobs
      : jobs.filter((j) => j.jobName.toLowerCase().includes(kw));
  }, [jobs, keyword]);
  const pager = useListPagination(filteredJobs, 20);

  const copyRow = async (r: JobHeartbeatItem) => {
    const text = [
      r.jobName,
      JOB_STATUS_LABELS[r.status],
      r.lastDurationMs != null ? `${r.lastDurationMs}ms` : "—",
      `运行 ${r.runCount} / 失败 ${r.failureCount}`,
    ].join(" · ");
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

  return (
    <ViewLayout>
      <ViewHeader
        icon="chart-line"
        title="Metrics"
        description="平台运行指标。网关请求量/延迟/错误率、Provider/Model 维度用量暂无上游数据源。"
      />

      <Banner
        tone="info"
        title="规划中：网关性能指标尚未接入"
        description="Atlas 尚未导出网关侧 QPS / 延迟 / 错误率，也未提供按 Provider / Model 维度的用量拆分（已提 liaison issue 给 vxture-atlas）。这里不接虚构数字；按租户的成本/Token 用量是真实数据，见下方入口。"
      />

      <Section
        title="后台任务执行统计"
        icon="gauge"
        level={2}
        description="opera-bff 自有的四个后台作业（provisioning-dispatch / sharing-expiry / trial-expiry / order-payment-expiry），真实心跳数据。"
      >
        <FilterBar
          view="list"
          onViewChange={() => {}}
          cardsDisabledReason="卡片视图已下线，改用列表"
          count={
            filteredJobs.length === jobs.length
              ? jobs.length
              : `${filteredJobs.length} / ${jobs.length}`
          }
        >
          <InputGroup className="grow basis-media-3xl max-w-panel-sm">
            <InputGroupAddon>
              <Icon name="search" size="sm" aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="搜索作业名…"
              aria-label="搜索作业"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                pager.resetPage();
              }}
            />
          </InputGroup>
        </FilterBar>
        <DataTable
          columns={[
            {
              id: "job",
              header: "作业",
              cell: (r: JobHeartbeatItem) => r.jobName,
            },
            {
              id: "duration",
              header: "最近耗时",
              align: "right",
              width: "xs",
              cell: (r: JobHeartbeatItem) =>
                r.lastDurationMs != null ? `${r.lastDurationMs}ms` : "—",
            },
            {
              id: "runs",
              header: "累计运行",
              align: "right",
              width: "xs",
              cell: (r: JobHeartbeatItem) => r.runCount,
            },
            {
              id: "failures",
              header: "累计失败",
              align: "right",
              width: "xs",
              cell: (r: JobHeartbeatItem) => r.failureCount,
            },
            {
              id: "status",
              header: "状态",
              align: "center",
              width: "xs",
              cell: (r: JobHeartbeatItem) => (
                <StatusBadge tone={jobStatusTone(r.status)}>
                  {JOB_STATUS_LABELS[r.status]}
                </StatusBadge>
              ),
            },
          ]}
          rows={pager.pageRows}
          rowKey={(r) => r.jobName}
          selectedKeys={selected}
          onSelectionChange={setSelected}
          indexStart={pager.indexStart}
          rowActions={(r: JobHeartbeatItem) => (
            <ActionMenu
              label={`${r.jobName} 操作`}
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
          footer={
            <Pagination
              className="w-full"
              page={pager.page}
              pageCount={pager.pageCount}
              total={jobs.length}
              filteredTotal={filteredJobs.length}
              pageSize={pager.pageSize}
              onPageSizeChange={pager.onPageSizeChange}
              onPageChange={pager.onPageChange}
            />
          }
          empty={
            load.kind === "loading" ? (
              <EmptyState title="读取中…" description="正在读取作业统计。" />
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
            ) : (
              <EmptyState
                title="暂无作业数据"
                description="尚未采集到任何作业心跳。"
              />
            )
          }
        />
      </Section>

      <Section
        title="Webhook 投递队列深度"
        icon="package"
        level={2}
        description="provisioning.webhook_deliveries 当前各状态计数，真实数据。"
      >
        <MetricGrid
          loading={load.kind === "loading" && !snapshot}
          columns={5}
          items={[
            {
              id: "pending",
              label: "待投递",
              value: String(counts?.pending ?? 0),
              icon: "clock",
            },
            {
              id: "delivering",
              label: "投递中",
              value: String(counts?.delivering ?? 0),
              icon: "arrow-up",
            },
            {
              id: "delivered",
              label: "已投递",
              value: String(counts?.delivered ?? 0),
              icon: "success",
            },
            {
              id: "failed",
              label: "失败（待重试）",
              value: String(counts?.failed ?? 0),
              icon: "warning",
              ...((counts?.failed ?? 0) > 0
                ? { trendTone: "warning" as const }
                : {}),
            },
            {
              id: "dead",
              label: "死信",
              value: String(counts?.dead ?? 0),
              icon: "error",
              ...((counts?.dead ?? 0) > 0
                ? { trendTone: "danger" as const }
                : {}),
            },
          ]}
        />
      </Section>

      <Section
        title="按租户成本 / Token 用量"
        icon="coins"
        level={2}
        description="Atlas 真实用量汇总，已在 Metering 页展示，此处不重复维护同一份聚合逻辑。"
        action={
          <Button asChild variant="ghost" size="md">
            <Link href="/atlas/metering">
              前往 Metering
              <Icon name="chevron-right" size="sm" aria-hidden="true" />
            </Link>
          </Button>
        }
      >
        <p className="text-body-sm text-muted-foreground">
          请求数、Token 用量与事实成本按租户 × 结算周期回传，完整视图见 Metering
          页。
        </p>
      </Section>
    </ViewLayout>
  );
}
