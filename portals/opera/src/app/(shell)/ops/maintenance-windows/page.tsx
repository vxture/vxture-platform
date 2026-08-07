"use client";

/* 维护窗口 — 计划内停机的声明、执行与对账。
 *
 * 2026-08-07 自 admin 迁入（批 A）。**按 opera 的方式重写**，不是搬文件：admin 那份
 * 挂在 5 个产品 CSS 类上（vx-maintenance-page / vx-tenant-search / vx-tenant-select /
 * vx-model-dialog__grid / vx-admin-action-btn），而 opera 的 globals.css 只引 DS，
 * 骨架一律 ListPageTemplate 三槽 + 纯 T2 工具类。行为与能力门不变，数据仍是
 * admin.maintenance_windows，只是改由 opera-bff 供给。
 *
 * 状态机由 BFF 守：scheduled →(start) in_progress →(complete) completed，
 * scheduled|in_progress →(cancel) cancelled，终态只读。前端只按当前状态决定
 * 哪些动作可见，不自己判合法性——真正的裁决在条件 UPDATE 那一层。 */

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
  ViewHeader,
  useListPagination,
  type DataTableSort,
  type FilterBarView,
  type StatusBadgeTone,
} from "@vxture/design-system";
import { api, OperaApiError } from "@/lib/api";

interface MaintenanceWindowItem {
  id: string;
  severity: "minor" | "major" | "critical";
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  title: string;
  description: string | null;
  impactDescription: string | null;
  affectedServices: string[];
  startAt: string;
  endAt: string;
  actualEndAt: string | null;
  createdBy: string;
  createdByName: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<MaintenanceWindowItem["status"], string> = {
  scheduled: "已计划",
  in_progress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};

const SEVERITY_LABELS: Record<MaintenanceWindowItem["severity"], string> = {
  minor: "一般",
  major: "重要",
  critical: "严重",
};

/** 窗口状态 → DS 语气。业务状态到语气的映射留产品侧，DS 不收业务语义。 */
function statusTone(status: MaintenanceWindowItem["status"]): StatusBadgeTone {
  if (status === "in_progress") return "warning";
  if (status === "scheduled") return "info";
  if (status === "completed") return "success";
  return "neutral";
}

/**
 * 严重度阶梯：灰 / 琥珀 / 红。
 *
 * `minor` 走中性而不是绿（owner 2026-08-06 判，随页面一起迁过来）：六档里
 * `success` 的语义是**达成了一件事**，而低严重度不是一项达成，是"不用担心"。
 * 同一页的状态列已经用绿表示「已完成」，严重度再用绿，一屏里的绿就有两种含义。
 */
function severityTone(
  severity: MaintenanceWindowItem["severity"],
): StatusBadgeTone {
  if (severity === "critical") return "danger";
  if (severity === "major") return "warning";
  return "neutral";
}

const DATE_TIME = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatMoment(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : DATE_TIME.format(d);
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

export default function MaintenanceWindowsPage() {
  const [rows, setRows] = useState<MaintenanceWindowItem[]>([]);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState<FilterBarView>("list");
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [sort, setSort] = useState<DataTableSort>({
    columnId: "startAt",
    direction: "desc",
  });

  const reload = useCallback(async () => {
    setLoad({ kind: "loading" });
    try {
      const data = await api.get<MaintenanceWindowItem[]>(
        "/api/maintenance-windows",
      );
      setRows(data);
      setLoad({ kind: "ready" });
    } catch (error) {
      // 读失败与"本来就没有"是两件事，空态要能分辨（#41 的三分口径）。
      setLoad({
        kind: "error",
        message:
          error instanceof OperaApiError ? error.message : "读取维护窗口失败",
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const matched = rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (kw === "" ||
          r.title.toLowerCase().includes(kw) ||
          r.affectedServices.some((s) => s.toLowerCase().includes(kw))),
    );
    return [...matched].sort((a, b) => {
      const cmp = a.startAt.localeCompare(b.startAt);
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [rows, keyword, status, sort]);

  const filtered = keyword.trim() !== "" || status !== "all";
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
      <EmptyState title="读取中…" description="正在取维护窗口清单。" />
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
    ) : filtered ? (
      <EmptyState
        title="没有匹配的维护窗口"
        description="换个状态或关键词再看。"
      />
    ) : (
      <EmptyState
        title="暂无维护窗口"
        description="计划内停机需要先在这里声明，运维执行与对账都以此为准。"
      />
    );

  return (
    <ListPageTemplate
      header={
        <ViewHeader
          icon="clock"
          title="维护窗口"
          description="声明与管理平台维护窗口：计划、执行、完成与取消，实际结束时间对账。"
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
              placeholder="搜索标题 / 影响服务…"
              aria-label="搜索维护窗口"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                pager.resetPage();
              }}
            />
          </InputGroup>
          <NativeSelect
            wrapperClassName="w-fit"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              pager.resetPage();
            }}
            aria-label="状态筛选"
          >
            <option value="all">全部状态</option>
            {(
              Object.keys(STATUS_LABELS) as MaintenanceWindowItem["status"][]
            ).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
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
                id: "title",
                header: "窗口",
                cell: (r) => (
                  <div className="flex flex-col gap-2xs">
                    <span className="text-label-md text-foreground">
                      {r.title}
                    </span>
                    {r.affectedServices.length > 0 ? (
                      <span className="text-body-sm text-muted-foreground">
                        {r.affectedServices.join(" · ")}
                      </span>
                    ) : null}
                  </div>
                ),
              },
              {
                id: "severity",
                header: "严重度",
                align: "center",
                cell: (r) => (
                  <StatusBadge tone={severityTone(r.severity)}>
                    {SEVERITY_LABELS[r.severity]}
                  </StatusBadge>
                ),
              },
              {
                id: "status",
                header: "状态",
                align: "center",
                cell: (r) => (
                  <StatusBadge tone={statusTone(r.status)}>
                    {STATUS_LABELS[r.status]}
                  </StatusBadge>
                ),
              },
              {
                id: "startAt",
                header: "开始",
                sortable: true,
                cell: (r) => formatMoment(r.startAt),
              },
              {
                id: "endAt",
                header: "结束（计划）",
                cell: (r) => formatMoment(r.endAt),
              },
              {
                id: "actualEndAt",
                header: "实际结束",
                cell: (r) => (
                  <span className="text-body-sm text-muted-foreground">
                    {formatMoment(r.actualEndAt)}
                  </span>
                ),
              },
              {
                id: "createdByName",
                header: "创建人",
                cell: (r) => (
                  <span className="text-body-sm text-muted-foreground">
                    {r.createdByName ?? "—"}
                  </span>
                ),
              },
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
                  title={r.title}
                  description={`${formatMoment(r.startAt)} → ${formatMoment(r.endAt)}`}
                  status={
                    <StatusBadge tone={statusTone(r.status)}>
                      {STATUS_LABELS[r.status]}
                    </StatusBadge>
                  }
                  meta={
                    // 严重度在列表视图里是有色阶的，卡片视图必须同一套语气——
                    // 同一个数据在一页的两个视图里给出两种编码，读者会以为是两件事。
                    <span className="inline-flex items-center gap-2xs">
                      <StatusBadge tone={severityTone(r.severity)}>
                        {SEVERITY_LABELS[r.severity]}
                      </StatusBadge>
                      {r.affectedServices.length > 0 ? (
                        <span>· {r.affectedServices.join(" · ")}</span>
                      ) : null}
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
