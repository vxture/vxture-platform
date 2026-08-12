"use client";

/* Logs — opera-top-level-design.md §7：Application / System / Audit 三类日志，
 * 此页承载运行日志（Audit 独立在 Security 域）。
 *
 * 2026-08-12 接真实数据：源头是 opera-bff 的 GET /api/job-scheduler（后台任务
 * 心跳 + webhook 投递队列），不是网关/路由日志——那部分的遥测导出上游还没有
 * （见 Observability/Metrics 页的说明与 liaison issue）。这里只展示确实存在
 * 的运行信号：四个后台作业的当前心跳，以及 webhook 投递失败/死信明细。没有
 * Trace ID（真实数据没有这个字段），不编一个假的凑数。 */

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
  ListCard,
  ListCardGrid,
  ListPageTemplate,
  NativeSelect,
  Pagination,
  StatusBadge,
  type DataTableSort,
  type FilterBarView,
  useListPagination,
  ViewHeader,
} from "@vxture/design-system";
import { api, OperaApiError } from "@/lib/api";
import { LOG_LEVEL_META, type LogLevel } from "@/lib/status";

type JobStatus = "idle" | "running" | "success" | "failed";

interface JobHeartbeatItem {
  jobName: string;
  status: JobStatus;
  lastFinishedAt: string | null;
  lastError: string | null;
  updatedAt: string;
}

interface WebhookDeliveryIssue {
  id: string;
  eventType: string;
  status: "pending" | "delivering" | "delivered" | "failed" | "dead";
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  lastAttemptAt: string | null;
}

interface JobSchedulerSnapshot {
  jobs: JobHeartbeatItem[];
  queue: { recentIssues: WebhookDeliveryIssue[] };
}

interface LogRow {
  id: string;
  time: string;
  level: LogLevel;
  source: string;
  message: string;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

function jobLevel(status: JobStatus): LogLevel {
  return status === "failed" ? "error" : "info";
}

function toRows(snapshot: JobSchedulerSnapshot): LogRow[] {
  const jobRows: LogRow[] = snapshot.jobs.map((j) => ({
    id: `job:${j.jobName}`,
    time: j.lastFinishedAt ?? j.updatedAt,
    level: jobLevel(j.status),
    source: `job:${j.jobName}`,
    message:
      j.status === "failed"
        ? (j.lastError ?? "作业失败，无错误详情")
        : `当前状态：${j.status}`,
  }));
  const webhookRows: LogRow[] = snapshot.queue.recentIssues.map((d) => ({
    id: `webhook:${d.id}`,
    time: d.lastAttemptAt ?? "",
    level: d.status === "dead" ? "error" : "warn",
    source: "webhook",
    message: `${d.eventType} 投递${d.status === "dead" ? "已死信" : "失败"}（尝试 ${d.attempts}/${d.maxAttempts}）：${d.lastError ?? "未知错误"}`,
  }));
  return [...jobRows, ...webhookRows];
}

export default function LogsPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [keyword, setKeyword] = useState("");
  const [level, setLevel] = useState<LogLevel | "all">("all");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState<DataTableSort>({
    columnId: "time",
    direction: "desc",
  });
  const [view, setView] = useState<FilterBarView>("list");
  /* 选择列全站占位（owner 定）：日志暂无批量动作，列先在。 */
  const [selected, setSelected] = useState<readonly string[]>([]);

  const reload = useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const data = await api.get<JobSchedulerSnapshot>("/api/job-scheduler");
      setRows(toRows(data));
      setLoad({ kind: "ready" });
    } catch (error) {
      setLoad({
        kind: "error",
        message:
          error instanceof OperaApiError ? error.message : "读取运行日志失败",
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const SOURCES = useMemo(
    () => Array.from(new Set(rows.map((r) => r.source))).sort(),
    [rows],
  );

  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const filteredRows = rows.filter(
      (r) =>
        (level === "all" || r.level === level) &&
        (source === "all" || r.source === source) &&
        (kw === "" || r.message.toLowerCase().includes(kw)),
    );
    return [...filteredRows].sort((a, b) =>
      sort.direction === "asc"
        ? a.time.localeCompare(b.time)
        : b.time.localeCompare(a.time),
    );
  }, [rows, keyword, level, source, sort]);

  const filtered = keyword !== "" || level !== "all" || source !== "all";
  const pager = useListPagination(visible);

  const pagination = (
    <Pagination
      className="w-full"
      page={pager.page}
      pageCount={pager.pageCount}
      total={rows.length}
      filteredTotal={visible.length}
      pageSize={pager.pageSize}
      onPageSizeChange={pager.onPageSizeChange}
      onPageChange={pager.onPageChange}
    />
  );

  const emptyState =
    load.kind === "loading" ? (
      <EmptyState title="读取中…" description="正在读取运行日志。" />
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
        title={filtered ? "没有匹配的日志" : "暂无运行日志"}
        description={
          filtered
            ? "放宽级别或来源，或换个关键词。"
            : "后台任务与投递队列当前没有异常。"
        }
      />
    );

  return (
    <ListPageTemplate
      header={
        <ViewHeader
          icon="terminal"
          title="Logs"
          description="后台任务心跳与 webhook 投递运行日志。网关/路由层遥测暂未接入，见 Metrics 页说明。"
        />
      }
      filters={
        <FilterBar
          view={view}
          onViewChange={setView}
          count={
            visible.length === rows.length
              ? rows.length
              : `${visible.length} / ${rows.length}`
          }
        >
          <InputGroup className="grow basis-media-3xl max-w-panel-sm">
            <InputGroupAddon>
              <Icon name="search" size="sm" aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="搜索日志内容…"
              aria-label="搜索日志"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                pager.resetPage();
              }}
            />
          </InputGroup>
          <NativeSelect
            wrapperClassName="w-fit"
            value={level}
            onChange={(e) => {
              setLevel(e.target.value as LogLevel | "all");
              pager.resetPage();
            }}
            aria-label="级别筛选"
          >
            <option value="all">全部级别</option>
            <option value="error">ERROR</option>
            <option value="warn">WARN</option>
            <option value="info">INFO</option>
          </NativeSelect>
          <NativeSelect
            wrapperClassName="w-fit"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              pager.resetPage();
            }}
            aria-label="来源筛选"
          >
            <option value="all">全部来源</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        </FilterBar>
      }
      table={
        view === "list" ? (
          <DataTable
            columns={[
              {
                id: "time",
                header: "时间",
                cell: (r: LogRow) => r.time || "—",
                sortable: true,
              },
              {
                id: "level",
                header: "级别",
                cell: (r: LogRow) => (
                  <StatusBadge tone={LOG_LEVEL_META[r.level].tone}>
                    {LOG_LEVEL_META[r.level].label}
                  </StatusBadge>
                ),
              },
              { id: "source", header: "来源", cell: (r: LogRow) => r.source },
              { id: "message", header: "内容", cell: (r: LogRow) => r.message },
            ]}
            rows={pager.pageRows}
            rowKey={(r) => r.id}
            selectedKeys={selected}
            onSelectionChange={setSelected}
            indexStart={pager.indexStart}
            sort={sort}
            onSortChange={setSort}
            footer={pagination}
            empty={emptyState}
          />
        ) : (
          <div className="flex flex-col gap-sm">
            <ListCardGrid>
              {pager.pageRows.map((r) => (
                <ListCard
                  key={r.id}
                  title={r.message}
                  description={`${r.time || "—"} · ${r.source}`}
                  status={
                    <StatusBadge tone={LOG_LEVEL_META[r.level].tone}>
                      {LOG_LEVEL_META[r.level].label}
                    </StatusBadge>
                  }
                />
              ))}
            </ListCardGrid>
            {pagination}
          </div>
        )
      }
    />
  );
}
