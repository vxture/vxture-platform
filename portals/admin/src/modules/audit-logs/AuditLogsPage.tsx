"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Icon,
  Input,
  NativeSelect,
  Pagination,
  ActionButton,
  EmptyState,
} from "@vxture/design-system";
import { fetchAuditLogs, type AuditLogFilters } from "@/api/admin-bff";
import type { AuditLogRecord } from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { formatDate, joinClasses } from "@/modules/tenants/tenant-utils";
import { exportRowsToCsv, type CsvColumn } from "@/lib/exportCsv";

// ─── 辅助函数 ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;
const EMPTY_MARK = "-";

function resultLabel(result: AuditLogRecord["result"]) {
  return result === "success" ? "成功" : "失败";
}

function resultBadgeClass(result: AuditLogRecord["result"]) {
  return result === "success"
    ? "vx-admin-role-status-pill--enabled"
    : "vx-admin-role-status-pill--disabled";
}

function resultIcon(result: AuditLogRecord["result"]) {
  return result === "success" ? "check" : "x";
}

function auditLogSearchText(log: AuditLogRecord) {
  return [
    log.operatorName,
    log.operatorEmail,
    log.action,
    log.actionLabel,
    log.targetType,
    log.targetLabel,
    log.ip,
    log.module,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// ─── 子组件：汇总卡片 ──────────────────────────────────────────────────────────

function AuditSummary({ logs }: { logs: AuditLogRecord[] }) {
  const todayStr = new Date().toDateString();
  const todayLogs = logs.filter(
    (l) => new Date(l.createdAt).toDateString() === todayStr,
  );
  const failureCount = logs.filter((l) => l.result === "failure").length;
  const operatorSet = new Set(logs.map((l) => l.operatorId));

  return (
    <section
      className="vx-tenant-summary vx-audit-summary"
      aria-label="审计日志统计"
    >
      <article className="vx-tenant-summary__item vx-tenant-tone--blue">
        <Icon name="list" size="lg" fallback="placeholder" />
        <div>
          <span>日志总数</span>
          <p>
            <strong>{logs.length}</strong>
            <em>操作员 {operatorSet.size}</em>
          </p>
        </div>
      </article>
      <article className="vx-tenant-summary__item vx-tenant-tone--green">
        <Icon name="check" size="lg" fallback="placeholder" />
        <div>
          <span>今日操作</span>
          <p>
            <strong>{todayLogs.length}</strong>
            <em>当日写入</em>
          </p>
        </div>
      </article>
      <article className="vx-tenant-summary__item vx-tenant-tone--rose">
        <Icon name="x" size="lg" fallback="placeholder" />
        <div>
          <span>失败操作</span>
          <p>
            <strong>{failureCount}</strong>
            <em>需复核</em>
          </p>
        </div>
      </article>
    </section>
  );
}

// ─── 子组件：工具栏 ────────────────────────────────────────────────────────────

type ResultFilter = "all" | "success" | "failure";

function AuditToolbar({
  search,
  resultFilter,
  dateFrom,
  dateTo,
  total,
  exportDisabled,
  onSearchChange,
  onResultFilterChange,
  onDateFromChange,
  onDateToChange,
  onReset,
  onExport,
}: {
  search: string;
  resultFilter: ResultFilter;
  dateFrom: string;
  dateTo: string;
  total: number;
  exportDisabled: boolean;
  onSearchChange: (v: string) => void;
  onResultFilterChange: (v: ResultFilter) => void;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onReset: () => void;
  onExport: () => void;
}) {
  return (
    <section className="vx-tenant-toolbar" aria-label="审计日志筛选">
      <span className="vx-tenant-view-count">{total}</span>
      <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
      <Input
        placeholder="搜索操作员、操作类型、对象…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="vx-tenant-search"
        aria-label="搜索审计日志（当前结果内）"
      />
      <Button variant="outline" onClick={onReset}>
        重置
      </Button>
      <div className="vx-tenant-filters">
        <Input
          type="datetime-local"
          className="vx-input vx-tenant-select"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          aria-label="起始时间"
          title="起始时间（服务端筛选）"
        />
        <Input
          type="datetime-local"
          className="vx-input vx-tenant-select"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          aria-label="截止时间"
          title="截止时间（服务端筛选）"
        />
        <NativeSelect
          className="vx-input vx-tenant-select"
          value={resultFilter}
          onChange={(e) => onResultFilterChange(e.target.value as ResultFilter)}
          aria-label="审计结果"
        >
          <option value="all">全部结果</option>
          <option value="success">成功</option>
          <option value="failure">失败</option>
        </NativeSelect>
      </div>
      <ActionButton
        icon="shield-check"
        variant="outline"
        disabled={exportDisabled}
        onClick={onExport}
      >
        导出审计
      </ActionButton>
    </section>
  );
}

const AUDIT_CSV_COLUMNS: readonly CsvColumn<AuditLogRecord>[] = [
  { label: "时间", value: (l) => l.createdAt },
  { label: "操作员", value: (l) => l.operatorName },
  { label: "邮箱", value: (l) => l.operatorEmail },
  { label: "操作", value: (l) => l.action },
  { label: "对象类型", value: (l) => l.targetType },
  { label: "对象ID", value: (l) => l.targetId ?? "" },
  { label: "模块", value: (l) => l.module },
  { label: "结果", value: (l) => (l.result === "success" ? "成功" : "失败") },
  { label: "IP", value: (l) => l.ip ?? "" },
  { label: "错误", value: (l) => l.errorMessage ?? "" },
];

function localInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// ─── 子组件：列表 ──────────────────────────────────────────────────────────────

function AuditList({
  logs,
  startIndex,
}: {
  logs: AuditLogRecord[];
  startIndex: number;
}) {
  return (
    <div
      className="vx-tenant-directory-list vx-audit-directory-list"
      role="region"
      aria-label="审计日志列表"
    >
      <div className="vx-tenant-directory-list__header">
        <span>序号</span>
        <span>操作员</span>
        <span>操作</span>
        <span>对象</span>
        <span>模块</span>
        <span>结果</span>
        <span>IP</span>
        <span>时间</span>
      </div>
      {logs.map((log, index) => (
        <div key={log.id} className="vx-tenant-directory-row vx-audit-row">
          <span className="vx-audit-row__index">{startIndex + index + 1}</span>
          <span className="vx-audit-row__operator">
            <span className="vx-audit-row__operator-name">
              {log.operatorName}
            </span>
            <span className="vx-audit-row__operator-email">
              {log.operatorEmail}
            </span>
          </span>
          <span className="vx-audit-row__action">
            <span className="vx-audit-row__action-label">
              {log.actionLabel}
            </span>
            <span className="vx-audit-row__action-code">{log.action}</span>
          </span>
          <span className="vx-audit-row__target">
            {log.targetLabel ? (
              <>
                <span className="vx-audit-row__target-label">
                  {log.targetLabel}
                </span>
                <span className="vx-audit-row__target-type">
                  {log.targetType}
                </span>
              </>
            ) : (
              <span className="vx-audit-row__target-empty">{EMPTY_MARK}</span>
            )}
          </span>
          <span className="vx-audit-row__module">{log.module}</span>
          <span className="vx-audit-row__result">
            <span className="vx-tenant-directory-row__status-line">
              <span
                className={`vx-model-state-icon vx-model-state-icon--${log.result === "success" ? "active" : "inactive"}`}
                role="img"
                aria-label={resultLabel(log.result)}
                title={resultLabel(log.result)}
              >
                <Icon
                  name={resultIcon(log.result)}
                  size="xs"
                  fallback="placeholder"
                />
              </span>
              <Badge className={resultBadgeClass(log.result)}>
                {resultLabel(log.result)}
              </Badge>
            </span>
            {log.errorMessage ? (
              <span className="vx-audit-row__error" title={log.errorMessage}>
                <Icon name="info" size="xs" fallback="placeholder" />
              </span>
            ) : null}
          </span>
          <span className="vx-audit-row__ip">{log.ip ?? EMPTY_MARK}</span>
          <span className="vx-audit-row__time">
            {formatDate(log.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  // Server-side filters (date range + result) drive the fetch; free-text search
  // stays client-side over the returned set (the BFF has no text search).
  useEffect(() => {
    const filters: AuditLogFilters = {};
    const fromIso = localInputToIso(dateFrom);
    const toIso = localInputToIso(dateTo);
    if (fromIso) filters.from = fromIso;
    if (toIso) filters.to = toIso;
    if (resultFilter !== "all") filters.result = resultFilter;

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchAuditLogs(filters)
      .then((rows) => {
        if (!cancelled) setLogs(rows);
      })
      .catch((error) => {
        if (!cancelled) {
          setLogs([]);
          setLoadError(
            error instanceof Error ? error.message : "审计日志读取失败",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resultFilter, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.trim().toLowerCase();
    return logs.filter((l) => auditLogSearchText(l).includes(q));
  }, [logs, search]);

  const pageLogs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const handleResultFilter = (v: ResultFilter) => {
    setResultFilter(v);
    setPage(1);
  };
  const handleReset = () => {
    setSearch("");
    setResultFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };
  const handleExport = () => {
    exportRowsToCsv("audit-logs-export", AUDIT_CSV_COLUMNS, filtered);
  };

  return (
    <div
      className={joinClasses(
        "vx-page-stack",
        "vx-tenant-management-page",
        "vx-audit-page",
      )}
    >
      <PageHeader
        icon="info"
        title="审计日志"
        description="追溯运营后台关键操作，按操作员、时间和对象筛选审计记录。"
      />
      <AuditSummary logs={logs} />
      <AuditToolbar
        search={search}
        resultFilter={resultFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        total={filtered.length}
        exportDisabled={filtered.length === 0}
        onSearchChange={handleSearch}
        onResultFilterChange={handleResultFilter}
        onDateFromChange={(v) => {
          setDateFrom(v);
          setPage(1);
        }}
        onDateToChange={(v) => {
          setDateTo(v);
          setPage(1);
        }}
        onReset={handleReset}
        onExport={handleExport}
      />
      <div className="vx-tenant-list-shell">
        <section className="vx-tenant-directory" aria-label="审计日志清单">
          {loading ? (
            <header className="vx-tenant-directory__header">
              <span>正在加载审计日志</span>
            </header>
          ) : null}
          {!loading && loadError ? (
            <section className="vx-tenant-empty">
              <EmptyState
                title="审计日志读取失败"
                description={loadError}
                action={
                  <ActionButton
                    variant="outline"
                    icon="x"
                    onClick={handleReset}
                  >
                    重置筛选
                  </ActionButton>
                }
              />
            </section>
          ) : !loading && filtered.length === 0 ? (
            <section className="vx-tenant-empty">
              <EmptyState
                title="暂无审计记录"
                description={
                  search || resultFilter !== "all" || dateFrom || dateTo
                    ? "尝试调整筛选条件或时间范围"
                    : "后台操作记录将在此处显示"
                }
                action={
                  <ActionButton
                    variant="outline"
                    icon="x"
                    onClick={handleReset}
                  >
                    重置筛选
                  </ActionButton>
                }
              />
            </section>
          ) : filtered.length ? (
            <>
              <AuditList logs={pageLogs} startIndex={(page - 1) * PAGE_SIZE} />
              {pageCount > 1 ? (
                <Pagination
                  className="vx-tenant-pagination"
                  page={page}
                  pageCount={pageCount}
                  total={filtered.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
