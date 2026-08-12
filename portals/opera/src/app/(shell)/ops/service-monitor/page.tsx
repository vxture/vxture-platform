"use client";

/* 服务监控 — 接入产品的 prod/beta 存活 + 就绪看板。
 *
 * 2026-08-11 自 admin 迁入（继维护窗口之后的第二批）。**不是搬文件，是换了数据源**：
 * admin 那份探的是本地 dev-panel（:8090），从没连过生产，它自己的 tech-debt 登记也
 * 承认这一点（TD-036 / 20-admin-platform-refinement-plan.md P4「Q6 维持 dev-only」）。
 * 这里改探接入平台的产品线（opera-bff `/api/product-health`，源头是
 * appoidc.oidc_clients 的真实登记行）。
 *
 * 一个产品一行、标题只出一次（owner 2026-08-11 口径）：每个信息列内部拆成 prod
 * （上，主）/ beta（下，辅）两条紧凑子行，中间一条虚线分隔——复用 DataTable 本就
 * 在用的 hairline 虚线令牌，不是新发明一条分隔线。这样总行高贴着单行走，不因为
 * 两个渠道变成两倍高。prod/beta 的文字标注只在专门的"渠道"列出现一次（紧跟在
 * "产品"列后面），不在其余列重复；prod 是主读数，深色前景+大一档字号，beta 是
 * 辅助参照，维持浅色小字。beta 未注册是正常态，不是异常，用 `not_configured`
 * 显式区分，不跟"不可达"混在一起。
 *
 * 每个产品/渠道探两类端点：health（liveness，只证明进程在听）+ status（readiness，
 * 依赖是否就绪，带 checks 明细）。readiness 是 025 标准里的可选端点，全仓目前零
 * 产品真正接上，所以"就绪"列大概率显示"未实现"——这是诚实的现状，不是探测缺陷
 * （router 文件头有完整口径）。
 *
 * 骨架与 opera 既有页面同构：ListPageTemplate 三槽 + FilterBar + DataTable +
 * useListPagination；不带任何 admin 遗留的 vx-* 产品 CSS 类。只读页面，无能力门。
 * 刷新节奏放宽到 30s（owner 口径：不用太频繁），另留一个手动刷新按钮。 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  Icon,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  ListPageTemplate,
  MetricGrid,
  NativeSelect,
  Pagination,
  StatusBadge,
  ViewHeader,
  useListPagination,
  type IconName,
  type StatusBadgeTone,
} from "@vxture/design-system";
import { api, OperaApiError } from "@/lib/api";

const REFRESH_INTERVAL_MS = 30_000;

/** DataTable 自己的行间虚线令牌（见 DataTable.tsx 文件头"行间虚线"），这里借来
 * 分隔同一格里的 beta / prod 两条子行——同一个视觉语言，不是另起一条新分隔线。 */
const DIVIDER_CLASS = "border-dashed border-primary/10 dark:border-primary/20";

type ProductLayer = "L1" | "L2" | "L3" | "client" | "external" | "unclassified";

type LivenessStatus =
  | "healthy"
  | "unhealthy"
  | "unreachable"
  | "not_configured";
type ReadinessStatus =
  | "ready"
  | "degraded"
  | "fail"
  | "not_implemented"
  | "unreachable"
  | "not_configured";

interface LivenessProbe {
  status: LivenessStatus;
  path: string | null;
  httpStatus: number | null;
  durationMs: number | null;
  service: string | null;
  version: string | null;
  gitSha: string | null;
  stage: string | null;
  buildTime: string | null;
  error: string | null;
  checkedAt: string;
}

interface ReadinessProbe {
  status: ReadinessStatus;
  path: string | null;
  httpStatus: number | null;
  durationMs: number | null;
  checks: Record<string, string> | null;
  error: string | null;
  checkedAt: string;
}

interface ProductChannelHealth {
  origin: string | null;
  health: LivenessProbe;
  status: ReadinessProbe;
}

interface ProductHealthItem {
  productId: string;
  productCode: string;
  productName: string;
  layer: ProductLayer;
  prod: ProductChannelHealth;
  beta: ProductChannelHealth;
}

const LAYER_LABEL: Record<ProductLayer, string> = {
  L1: "L1",
  L2: "L2",
  L3: "L3",
  client: "Client",
  external: "External",
  unclassified: "未分类",
};

const LAYER_ICON: Record<ProductLayer, IconName> = {
  L1: "stack",
  L2: "cube",
  L3: "squares-four",
  client: "desktop",
  external: "globe",
  unclassified: "circle-dashed",
};

const LIVENESS_LABELS: Record<LivenessStatus, string> = {
  healthy: "健康",
  unhealthy: "异常",
  unreachable: "不可达",
  not_configured: "未配置",
};

const READINESS_LABELS: Record<ReadinessStatus, string> = {
  ready: "就绪",
  degraded: "降级",
  fail: "未就绪",
  not_implemented: "未实现",
  unreachable: "不可达",
  not_configured: "未配置",
};

function livenessTone(status: LivenessStatus): StatusBadgeTone {
  if (status === "healthy") return "success";
  if (status === "not_configured") return "neutral";
  return "danger";
}

function readinessTone(status: ReadinessStatus): StatusBadgeTone {
  if (status === "ready") return "success";
  if (status === "degraded") return "warning";
  if (status === "not_configured" || status === "not_implemented")
    return "neutral";
  return "danger";
}

/** 一个渠道是否需要人关注：health 不健康，或 status 明确 fail/degraded/不可达。
 * 未配置、未实现都是中性事实，不算需要关注。 */
function channelNeedsAttention(channel: ProductChannelHealth): boolean {
  const healthBad =
    channel.health.status === "unhealthy" ||
    channel.health.status === "unreachable";
  const statusBad =
    channel.status.status === "fail" ||
    channel.status.status === "degraded" ||
    channel.status.status === "unreachable";
  return healthBad || statusBad;
}

/** 产品是否需要人关注：beta / prod 任一渠道需要关注。 */
function productNeedsAttention(item: ProductHealthItem): boolean {
  return channelNeedsAttention(item.beta) || channelNeedsAttention(item.prod);
}

const TIME_FORMAT = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DATE_FORMAT = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
});

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : TIME_FORMAT.format(d);
}

function formatBuildTime(iso: string | null): string {
  if (!iso || iso === "unknown") return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : DATE_FORMAT.format(d);
}

function formatChecks(checks: Record<string, string> | null): string | null {
  if (!checks) return null;
  const entries = Object.entries(checks);
  if (entries.length === 0) return null;
  return entries.map(([k, v]) => `${k} ${v}`).join(" · ");
}

/** 一个信息格里塞 prod（上，主）/ beta（下，辅）两条紧凑子行，中间一条虚线分隔。
 * 所有需要区分渠道的列（渠道/存活/就绪/版本/发布时间/最近探测）共用这一个骨架，
 * 行高只随内容走一次，不因为两个渠道各占一整行而翻倍。渠道本身的 Prod/Beta 文字
 * 只在专门的"渠道"列出现一次（第一列是产品名），其余列不重复标注。 */
function ChannelSplit({ prod, beta }: { prod: ReactNode; beta: ReactNode }) {
  return (
    <div className="flex flex-col text-left">
      <div className="pb-xs">{prod}</div>
      <div className={`border-t pt-xs ${DIVIDER_CLASS}`}>{beta}</div>
    </div>
  );
}

/** prod 是主读数：深色前景 + 大一档字号；beta 是辅助参照：维持现在的浅色小字。 */
type ChannelEmphasis = "prod" | "beta";

function LivenessLine({
  probe,
  emphasis,
}: {
  probe: LivenessProbe;
  emphasis: ChannelEmphasis;
}) {
  const isProd = emphasis === "prod";
  const detail =
    probe.status === "healthy"
      ? probe.durationMs !== null
        ? `${probe.durationMs}ms`
        : null
      : probe.status === "unreachable"
        ? (probe.error ?? "连接失败")
        : probe.status === "unhealthy"
          ? (probe.error ?? `HTTP ${probe.httpStatus ?? "?"}`)
          : null;

  return (
    <span
      className="inline-flex items-center gap-2xs min-w-0"
      title={detail ?? undefined}
    >
      <StatusBadge
        tone={livenessTone(probe.status)}
        dot
        {...(isProd ? { className: "text-label-md" } : {})}
      >
        {LIVENESS_LABELS[probe.status]}
      </StatusBadge>
      {detail ? (
        <span
          className={
            isProd
              ? "text-body-sm text-foreground truncate"
              : "text-body-xs text-muted-foreground truncate"
          }
        >
          {detail}
        </span>
      ) : null}
    </span>
  );
}

function ReadinessLine({
  probe,
  emphasis,
}: {
  probe: ReadinessProbe;
  emphasis: ChannelEmphasis;
}) {
  const isProd = emphasis === "prod";
  const checksSummary = formatChecks(probe.checks);
  const detail =
    checksSummary ??
    (probe.status === "unreachable" ? (probe.error ?? "连接失败") : null);

  return (
    <span
      className="inline-flex items-center gap-2xs min-w-0"
      title={detail ?? undefined}
    >
      <StatusBadge
        tone={readinessTone(probe.status)}
        dot
        {...(isProd ? { className: "text-label-md" } : {})}
      >
        {READINESS_LABELS[probe.status]}
      </StatusBadge>
      {detail ? (
        <span
          className={
            isProd
              ? "text-body-sm text-foreground truncate"
              : "text-body-xs text-muted-foreground truncate"
          }
        >
          {detail}
        </span>
      ) : null}
    </span>
  );
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

type StatusFilter = "all" | "attention";

export default function ServiceMonitorPage() {
  const [items, setItems] = useState<ProductHealthItem[]>([]);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<readonly string[]>([]);

  const reload = useCallback(async (opts?: { silent?: boolean }) => {
    if (opts?.silent) {
      setRefreshing(true);
    } else {
      setLoad({ kind: "loading" });
    }
    try {
      const data = await api.get<ProductHealthItem[]>("/api/product-health");
      setItems(data);
      setLastFetchedAt(new Date());
      setLoad({ kind: "ready" });
    } catch (error) {
      setLoad({
        kind: "error",
        message:
          error instanceof OperaApiError
            ? error.message
            : "读取产品健康数据失败",
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const timer = setInterval(() => {
      if (
        typeof document === "undefined" ||
        document.visibilityState === "visible"
      ) {
        void reload({ silent: true });
      }
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  const visible = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return items.filter((item) => {
      const matchesKeyword =
        kw === "" ||
        item.productName.toLowerCase().includes(kw) ||
        item.productCode.toLowerCase().includes(kw);
      const matchesStatus =
        statusFilter === "all" || productNeedsAttention(item);
      return matchesKeyword && matchesStatus;
    });
  }, [items, keyword, statusFilter]);

  const filtered = keyword.trim() !== "" || statusFilter !== "all";
  const pager = useListPagination(visible);

  const stats = useMemo(() => {
    const attention = items.filter(productNeedsAttention).length;
    const betaConfigured = items.filter(
      (i) => i.beta.health.status !== "not_configured",
    ).length;
    const betaHealthy = items.filter(
      (i) => i.beta.health.status === "healthy",
    ).length;
    const channels = items.flatMap((i) => [i.beta.status, i.prod.status]);
    const readinessImplemented = channels.filter(
      (s) => s.status !== "not_configured" && s.status !== "not_implemented",
    ).length;
    return {
      total: items.length,
      attention,
      betaConfigured,
      betaHealthy,
      readinessImplemented,
      totalChannels: channels.length,
    };
  }, [items]);

  function resetFilters() {
    setKeyword("");
    setStatusFilter("all");
  }

  const pagination = (
    <Pagination
      className="w-full"
      page={pager.page}
      pageCount={pager.pageCount}
      total={items.length}
      filteredTotal={visible.length}
      pageSize={pager.pageSize}
      onPageSizeChange={pager.onPageSizeChange}
      onPageChange={pager.onPageChange}
    />
  );

  const emptyState =
    load.kind === "loading" ? (
      <EmptyState
        title="读取中…"
        description="正在探测各产品 prod / beta 的存活与就绪状态。"
      />
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
        title="没有匹配的产品"
        description="换个关键词或筛选条件再看。"
      />
    ) : (
      <EmptyState
        title="暂无接入产品"
        description="appoidc.oidc_clients 里还没有登记可归属产品的客户端。"
      />
    );

  return (
    <ListPageTemplate
      header={
        <ViewHeader
          icon="server"
          title="服务监控"
          description="接入平台的各产品 prod / beta 存活与就绪状态；探测目标来自 OIDC 客户端登记，非静态清单。"
          secondary={
            lastFetchedAt ? (
              <Badge>上次探测 {formatTime(lastFetchedAt.toISOString())}</Badge>
            ) : null
          }
          action={
            <Button
              variant="outline"
              onClick={() => void reload()}
              disabled={load.kind === "loading" || refreshing}
            >
              <Icon name="refresh" size="sm" aria-hidden="true" />
              刷新
            </Button>
          }
        />
      }
      summary={
        <MetricGrid
          aria-label="产品健康概览"
          loading={load.kind === "loading" && items.length === 0}
          columns={4}
          items={[
            {
              id: "total",
              label: "接入产品",
              value: String(stats.total),
              icon: "server",
            },
            {
              id: "attention",
              label: "需要关注",
              value: String(stats.attention),
              icon: "warning",
              ...(stats.attention > 0 ? { tone: "danger" as const } : {}),
            },
            {
              id: "beta",
              label: "Beta 健康 / 已配置",
              value: `${stats.betaHealthy}/${stats.betaConfigured}`,
              icon: "circle-dashed",
            },
            {
              id: "readiness",
              label: "就绪已实现",
              value: `${stats.readinessImplemented}/${stats.totalChannels}`,
              icon: "shield-check",
              help: "已实现 readiness（/api/ready 或 /readyz）的渠道数占比",
            },
          ]}
        />
      }
      filters={
        <FilterBar
          count={
            visible.length === items.length
              ? items.length
              : `${visible.length} / ${items.length}`
          }
        >
          <InputGroup className="grow basis-media-3xl max-w-panel-sm">
            <InputGroupAddon>
              <Icon name="search" size="sm" aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="搜索产品名称 / 代码…"
              aria-label="搜索产品"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                pager.resetPage();
              }}
            />
          </InputGroup>
          <NativeSelect
            wrapperClassName="w-fit"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              pager.resetPage();
            }}
            aria-label="状态筛选"
          >
            <option value="all">全部产品</option>
            <option value="attention">需要关注</option>
          </NativeSelect>
          <Button variant="outline" size="md" onClick={resetFilters}>
            重置
          </Button>
        </FilterBar>
      }
      table={
        <DataTable
          columns={[
            {
              id: "product",
              header: "产品",
              cell: (r: ProductHealthItem) => (
                <div className="flex items-center gap-xs">
                  <Icon
                    name={LAYER_ICON[r.layer]}
                    size="sm"
                    className="shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col gap-2xs">
                    <span className="text-label-md text-foreground">
                      {r.productName}
                    </span>
                    <span className="text-body-sm text-muted-foreground">
                      {r.productCode} · {LAYER_LABEL[r.layer]}
                    </span>
                  </div>
                </div>
              ),
            },
            {
              id: "channel",
              header: "渠道",
              cell: () => (
                <ChannelSplit
                  prod={
                    <span className="text-label-md text-foreground font-medium">
                      Prod
                    </span>
                  }
                  beta={
                    <span className="text-body-xs text-muted-foreground">
                      Beta
                    </span>
                  }
                />
              ),
            },
            {
              id: "health",
              header: "存活",
              cell: (r: ProductHealthItem) => (
                <ChannelSplit
                  prod={<LivenessLine probe={r.prod.health} emphasis="prod" />}
                  beta={<LivenessLine probe={r.beta.health} emphasis="beta" />}
                />
              ),
            },
            {
              id: "status",
              header: "就绪",
              cell: (r: ProductHealthItem) => (
                <ChannelSplit
                  prod={<ReadinessLine probe={r.prod.status} emphasis="prod" />}
                  beta={<ReadinessLine probe={r.beta.status} emphasis="beta" />}
                />
              ),
            },
            {
              id: "version",
              header: "版本",
              cell: (r: ProductHealthItem) => (
                <ChannelSplit
                  prod={
                    <span className="text-body-sm text-foreground truncate">
                      {r.prod.health.version ?? "—"}
                    </span>
                  }
                  beta={
                    <span className="text-body-xs text-muted-foreground truncate">
                      {r.beta.health.version ?? "—"}
                    </span>
                  }
                />
              ),
            },
            {
              id: "buildTime",
              header: "发布时间",
              cell: (r: ProductHealthItem) => (
                <ChannelSplit
                  prod={
                    <span className="text-body-sm text-foreground">
                      {formatBuildTime(r.prod.health.buildTime)}
                    </span>
                  }
                  beta={
                    <span className="text-body-xs text-muted-foreground">
                      {formatBuildTime(r.beta.health.buildTime)}
                    </span>
                  }
                />
              ),
            },
            {
              id: "checkedAt",
              header: "最近探测",
              cell: (r: ProductHealthItem) => (
                <ChannelSplit
                  prod={
                    <span className="text-body-sm text-foreground">
                      {formatTime(r.prod.health.checkedAt)}
                    </span>
                  }
                  beta={
                    <span className="text-body-xs text-muted-foreground">
                      {formatTime(r.beta.health.checkedAt)}
                    </span>
                  }
                />
              ),
            },
          ]}
          rows={pager.pageRows}
          rowKey={(r: ProductHealthItem) => r.productId}
          selectedKeys={selected}
          onSelectionChange={setSelected}
          indexStart={pager.indexStart}
          footer={pagination}
          empty={emptyState}
        />
      }
    />
  );
}
