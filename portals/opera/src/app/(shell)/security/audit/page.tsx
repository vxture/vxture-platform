"use client";

/* Audit — opera-top-level-design.md §8：谁 / 什么时间 / 修改什么。
 *
 * 2026-08-12 接真实数据：源头是 opera-bff 的 GET /api/audit-logs，读
 * `support.audit_logs`（actor_type='operator'）——admin 与 opera 写的是同一张
 * 平台级审计表，这里只是给它开一个读口。真实字段是 action/resourceType/
 * resourceId/result/errorCode，不是 mocks/atlas.ts 那份虚构的
 * "Router 变更/Key 轮换" 中文动作名——如实展示点分动词与资源类型，比伪造中文
 * 文案更诚实，也不会因为字段改名而脱节。 */

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
  type StatusBadgeTone,
  useListPagination,
  ViewHeader,
} from "@vxture/design-system";
import { api, OperaApiError } from "@/lib/api";

interface AuditLogEntry {
  id: string;
  time: string;
  actorId: string;
  actor: string;
  action: string;
  result: string;
  resourceType: string;
  resourceId: string;
  errorCode: string | null;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

const RESULT_TONE: Record<string, StatusBadgeTone> = {
  success: "success",
  denied: "warning",
  failure: "danger",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("zh-CN", { hour12: false });
}

export default function AuditPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [keyword, setKeyword] = useState("");
  const [action, setAction] = useState("all");
  const [sort, setSort] = useState<DataTableSort>({
    columnId: "time",
    direction: "desc",
  });

  const reload = useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const data = await api.get<AuditLogEntry[]>("/api/audit-logs?limit=200");
      setRows(data);
      setLoad({ kind: "ready" });
    } catch (error) {
      setLoad({
        kind: "error",
        message:
          error instanceof OperaApiError ? error.message : "读取审计留痕失败",
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const ACTIONS = useMemo(
    () => Array.from(new Set(rows.map((r) => r.action))).sort(),
    [rows],
  );

  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const filtered = rows.filter(
      (r) =>
        (action === "all" || r.action === action) &&
        (kw === "" ||
          r.resourceId.toLowerCase().includes(kw) ||
          r.resourceType.toLowerCase().includes(kw) ||
          r.actor.toLowerCase().includes(kw)),
    );
    return [...filtered].sort((a, b) =>
      sort.direction === "asc"
        ? a.time.localeCompare(b.time)
        : b.time.localeCompare(a.time),
    );
  }, [rows, keyword, action, sort]);

  const filtered = keyword !== "" || action !== "all";
  const pager = useListPagination(visible);
  const [view, setView] = useState<FilterBarView>("list");
  /* 选择列全站占位（owner 定）：留痕只读，列先在。 */
  const [selected, setSelected] = useState<readonly string[]>([]);

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
      <EmptyState title="读取中…" description="正在读取审计留痕。" />
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
        title={filtered ? "没有匹配的留痕" : "暂无变更留痕"}
        description={
          filtered
            ? "换个动作或关键词再看。"
            : "配置尚未发生过变更。审计只记录写操作，读操作不留痕。"
        }
      />
    );

  return (
    <ListPageTemplate
      header={
        <ViewHeader
          icon="clipboard"
          title="Audit"
          description="配置变更审计：谁、什么时间、改了什么。只读，不可删改。与 admin 共用同一张平台审计表。"
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
              placeholder="搜索对象 / 操作者…"
              aria-label="搜索留痕"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                pager.resetPage();
              }}
            />
          </InputGroup>
          <NativeSelect
            wrapperClassName="w-fit"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              pager.resetPage();
            }}
            aria-label="动作筛选"
          >
            <option value="all">全部动作</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
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
                cell: (r: AuditLogEntry) => formatTime(r.time),
                sortable: true,
              },
              {
                id: "actor",
                header: "操作者",
                cell: (r: AuditLogEntry) => r.actor,
              },
              {
                id: "action",
                header: "动作",
                cell: (r: AuditLogEntry) => r.action,
              },
              {
                id: "target",
                header: "对象",
                cell: (r: AuditLogEntry) => (
                  <span className="text-label-md text-foreground">
                    {r.resourceType} · {r.resourceId}
                  </span>
                ),
              },
              {
                id: "result",
                header: "结果",
                cell: (r: AuditLogEntry) => (
                  <StatusBadge tone={RESULT_TONE[r.result] ?? "neutral"} dot>
                    {r.errorCode ? `${r.result} · ${r.errorCode}` : r.result}
                  </StatusBadge>
                ),
              },
            ]}
            rows={pager.pageRows}
            rowKey={(r: AuditLogEntry) => r.id}
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
                  title={`${r.resourceType} · ${r.resourceId}`}
                  description={`${formatTime(r.time)} · ${r.actor}`}
                  status={
                    <StatusBadge tone={RESULT_TONE[r.result] ?? "neutral"} dot>
                      {r.action}
                    </StatusBadge>
                  }
                  meta={
                    <span>
                      {r.errorCode ? `${r.result} · ${r.errorCode}` : r.result}
                    </span>
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
