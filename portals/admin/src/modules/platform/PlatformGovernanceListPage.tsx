"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Icon,
  ActionMenu,
  Badge,
  Button,
  Checkbox,
  Input,
  NativeSelect,
  ActionButton,
  EmptyState,
  ViewModeSwitch,
} from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import { fetchPlatformGovernanceRecords } from "@/api/admin-bff";
import type {
  PlatformGovernanceKind,
  PlatformGovernanceRecord,
  PlatformGovernanceStatus,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { formatNumber, joinClasses } from "@/modules/tenants/tenant-utils";

type ViewMode = "list" | "cards";

interface GovernanceConfig {
  title: string;
  description: string;
  icon: IconName;
  primaryAction: string;
  batchAction: string;
  searchPlaceholder: string;
  objectLabel: string;
  scopeLabel: string;
  ownerLabel: string;
  policyLabel: string;
  summary: {
    total: { label: string; tag: string };
    normal: { label: string; tag: string };
    risk: { label: string; tag: string };
    pending: { label: string; tag: string };
  };
  actions: {
    detail: string;
    edit: string;
    audit: string;
  };
}

const statusMeta = {
  normal: {
    label: "正常",
    icon: "check",
    className: "vx-platform-governance-status--normal",
  },
  warning: {
    label: "关注",
    icon: "info",
    className: "vx-platform-governance-status--warning",
  },
  blocked: {
    label: "阻断",
    icon: "x",
    className: "vx-platform-governance-status--blocked",
  },
  pending: {
    label: "待处理",
    icon: "clock",
    className: "vx-platform-governance-status--pending",
  },
} satisfies Record<
  PlatformGovernanceStatus,
  { label: string; icon: IconName; className: string }
>;

const approvalStatusMeta = {
  normal: {
    label: "已完成",
    icon: "check",
    className: "vx-platform-governance-status--normal",
  },
  warning: {
    label: "待执行",
    icon: "info",
    className: "vx-platform-governance-status--warning",
  },
  blocked: {
    label: "已阻断",
    icon: "x",
    className: "vx-platform-governance-status--blocked",
  },
  pending: {
    label: "待审批",
    icon: "clock",
    className: "vx-platform-governance-status--pending",
  },
} satisfies Record<
  PlatformGovernanceStatus,
  { label: string; icon: IconName; className: string }
>;

const governanceConfigs = {
  admins: {
    title: "平台用户",
    description:
      "管理平台内部管理员、运营人员和运维人员，明确岗位、角色、准入状态和最近访问。",
    icon: "user",
    primaryAction: "新增人员",
    batchAction: "批量审计",
    searchPlaceholder: "搜索人员、岗位、角色或职责",
    objectLabel: "人员",
    scopeLabel: "岗位",
    ownerLabel: "角色",
    policyLabel: "准入策略",
    summary: {
      total: { label: "人员总数", tag: "全部账号" },
      normal: { label: "正常可用", tag: "可登录" },
      risk: { label: "风险关注", tag: "需核查" },
      pending: { label: "待处理", tag: "队列" },
    },
    actions: { detail: "查看详情", edit: "编辑人员", audit: "审计记录" },
  },
  secrets: {
    title: "密钥管理",
    description: "集中管理平台级 API Key、服务凭据、轮换周期和最小可见范围。",
    icon: "key",
    primaryAction: "新增密钥",
    batchAction: "批量审计",
    searchPlaceholder: "搜索密钥、用途、负责人或策略",
    objectLabel: "密钥",
    scopeLabel: "作用域",
    ownerLabel: "负责人",
    policyLabel: "轮换策略",
    summary: {
      total: { label: "密钥总数", tag: "全部配置" },
      normal: { label: "正常可用", tag: "可使用" },
      risk: { label: "风险关注", tag: "需处理" },
      pending: { label: "待处理", tag: "队列" },
    },
    actions: { detail: "查看详情", edit: "编辑配置", audit: "审计记录" },
  },
  jobs: {
    title: "任务调度",
    description: "观察平台异步任务、重试、死信、调度状态和关键后台作业。",
    icon: "workflow",
    primaryAction: "新增任务",
    batchAction: "批量审计",
    searchPlaceholder: "搜索任务、队列、负责人或策略",
    objectLabel: "任务",
    scopeLabel: "队列",
    ownerLabel: "负责人",
    policyLabel: "调度策略",
    summary: {
      total: { label: "任务总数", tag: "全部队列" },
      normal: { label: "正常运行", tag: "可调度" },
      risk: { label: "风险关注", tag: "需处置" },
      pending: { label: "待处理", tag: "队列" },
    },
    actions: { detail: "查看详情", edit: "编辑任务", audit: "执行记录" },
  },
  approvals: {
    title: "审批中心",
    description: "承接高风险操作的二次确认、审批流、执行凭证和审计闭环。",
    icon: "check",
    primaryAction: "新增审批",
    batchAction: "批量复核",
    searchPlaceholder: "搜索审批、对象、发起人或策略",
    objectLabel: "审批事项",
    scopeLabel: "对象",
    ownerLabel: "发起人",
    policyLabel: "审批策略",
    summary: {
      total: { label: "审批总数", tag: "高风险操作" },
      normal: { label: "已完成", tag: "审计可查" },
      risk: { label: "待执行", tag: "需跟进" },
      pending: { label: "待审批", tag: "队列" },
    },
    actions: { detail: "查看详情", edit: "审批处理", audit: "审计凭证" },
  },
} satisfies Record<PlatformGovernanceKind, GovernanceConfig>;

function recordSearchText(record: PlatformGovernanceRecord) {
  return [
    record.id,
    record.name,
    record.scope,
    record.owner,
    record.policy,
    record.description,
    ...record.tags,
  ]
    .join(" ")
    .toLowerCase();
}

function governanceStatusMeta(
  kind: PlatformGovernanceKind,
  status: PlatformGovernanceStatus,
) {
  return kind === "approvals" ? approvalStatusMeta[status] : statusMeta[status];
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        'button, input, select, textarea, a, [role="button"], [role="menu"], [role="menuitem"]',
      ),
    )
  );
}

function GovernanceActionsMenu({
  record,
  labels,
}: {
  record: PlatformGovernanceRecord;
  labels: GovernanceConfig["actions"];
}) {
  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${record.name} 操作`}
        triggerClassName="vx-tenant-actions__trigger"
        triggerProps={{ title: "操作" }}
        items={[
          {
            id: "detail",
            label: labels.detail,
            icon: <Icon name="info" size="xs" fallback="placeholder" />,
            disabled: true,
          },
          {
            id: "edit",
            label: labels.edit,
            icon: <Icon name="edit" size="xs" fallback="placeholder" />,
            disabled: true,
          },
          {
            id: "audit",
            label: labels.audit,
            icon: <Icon name="shield-check" size="xs" fallback="placeholder" />,
            disabled: true,
          },
        ]}
      />
    </div>
  );
}

export function PlatformGovernanceListPage({
  kind,
}: {
  kind: PlatformGovernanceKind;
}) {
  const config = governanceConfigs[kind];
  const [sourceRecords, setSourceRecords] = useState<
    PlatformGovernanceRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    PlatformGovernanceStatus | "all"
  >("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const records = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sourceRecords.filter((record) => {
      const matchesQuery =
        !normalizedQuery || recordSearchText(record).includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, sourceRecords, statusFilter]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    fetchPlatformGovernanceRecords(kind)
      .then((nextRecords) => {
        if (!active) return;
        setSourceRecords(nextRecords);
      })
      .catch((error) => {
        if (!active) return;
        setSourceRecords([]);
        setLoadError(
          error instanceof Error
            ? error.message
            : `${config.title}数据读取失败`,
        );
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [config.title, kind]);

  const selectedOnPage = records.filter((record) =>
    selectedIds.has(record.id),
  ).length;
  const isPageSelected =
    records.length > 0 && selectedOnPage === records.length;
  const isPagePartiallySelected =
    selectedOnPage > 0 && selectedOnPage < records.length;

  function toggleRecord(recordId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(recordId);
      else next.delete(recordId);
      return next;
    });
  }

  function togglePage(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      records.forEach((record) => {
        if (checked) next.add(record.id);
        else next.delete(record.id);
      });
      return next;
    });
  }

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
  }

  const summary = {
    total: sourceRecords.length,
    normal: sourceRecords.filter((record) => record.status === "normal").length,
    risk: sourceRecords.filter(
      (record) => record.status === "warning" || record.status === "blocked",
    ).length,
    pending: sourceRecords.filter((record) => record.status === "pending")
      .length,
  };

  return (
    <div
      className={joinClasses(
        "vx-page-stack vx-tenant-management-page vx-platform-governance-page",
        `vx-platform-governance-page--${kind}`,
      )}
    >
      <PageHeader
        icon={config.icon}
        title={config.title}
        description={config.description}
      />

      <section
        className="vx-tenant-summary vx-platform-governance-summary"
        aria-label={`${config.title}统计`}
      >
        <article className="vx-tenant-summary__item vx-tenant-tone--blue">
          <Icon name={config.icon} size="lg" fallback="placeholder" />
          <div>
            <span>{config.summary.total.label}</span>
            <p>
              <strong>{formatNumber(summary.total)}</strong>
              <em>{config.summary.total.tag}</em>
            </p>
          </div>
        </article>
        <article className="vx-tenant-summary__item vx-tenant-tone--green">
          <Icon name="check" size="lg" fallback="placeholder" />
          <div>
            <span>{config.summary.normal.label}</span>
            <p>
              <strong>{formatNumber(summary.normal)}</strong>
              <em>{config.summary.normal.tag}</em>
            </p>
          </div>
        </article>
        <article className="vx-tenant-summary__item vx-tenant-tone--amber">
          <Icon name="info" size="lg" fallback="placeholder" />
          <div>
            <span>{config.summary.risk.label}</span>
            <p>
              <strong>{formatNumber(summary.risk + summary.pending)}</strong>
              {summary.risk ? (
                <em>
                  {config.summary.risk.tag} {formatNumber(summary.risk)}
                </em>
              ) : null}
              {summary.pending ? (
                <em>
                  {config.summary.pending.tag} {formatNumber(summary.pending)}
                </em>
              ) : null}
              {!summary.risk && !summary.pending ? <em>无待处理</em> : null}
            </p>
          </div>
        </article>
      </section>

      <div className="vx-tenant-list-shell">
        <section
          className="vx-tenant-toolbar"
          aria-label={`${config.title}筛选`}
        >
          <ViewModeSwitch
            value={viewMode}
            onChange={setViewMode}
            ariaLabel={`${config.title}展示方式`}
          />
          <span className="vx-tenant-view-count">
            {formatNumber(records.length)}
          </span>
          <span className="vx-tenant-toolbar__spacer" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={config.searchPlaceholder}
            className="vx-tenant-search"
            aria-label={`搜索${config.objectLabel}`}
          />
          <Button variant="outline" onClick={resetFilters}>
            重置
          </Button>
          <div className="vx-tenant-filters">
            <NativeSelect
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as PlatformGovernanceStatus | "all",
                )
              }
              className="vx-input vx-tenant-select"
              aria-label={`${config.objectLabel}状态`}
            >
              <option value="all">全部状态</option>
              <option value="normal">正常</option>
              <option value="warning">关注</option>
              <option value="blocked">阻断</option>
              <option value="pending">待处理</option>
            </NativeSelect>
          </div>
          <ActionButton
            icon="shield-check"
            variant="outline"
            disabled={selectedIds.size === 0}
          >
            {config.batchAction}
            {selectedIds.size ? ` (${selectedIds.size})` : ""}
          </ActionButton>
          <ActionButton icon="plus" disabled>
            {config.primaryAction}
          </ActionButton>
        </section>

        <section
          className="vx-tenant-directory vx-platform-governance-directory"
          aria-label={`${config.title}清单`}
        >
          {loading ? (
            <header className="vx-tenant-directory__header">
              <span>正在加载自治数据</span>
            </header>
          ) : null}

          {!loading && loadError ? (
            <section className="vx-tenant-empty">
              <EmptyState
                title={`${config.title}数据读取失败`}
                description={loadError}
              />
            </section>
          ) : !loading && records.length === 0 ? (
            <section className="vx-tenant-empty">
              <EmptyState
                title="暂无匹配记录"
                description="调整关键词或筛选条件后再查看。"
                action={
                  <ActionButton
                    variant="outline"
                    icon="x"
                    onClick={resetFilters}
                  >
                    重置筛选
                  </ActionButton>
                }
              />
            </section>
          ) : viewMode === "list" ? (
            <div
              className="vx-tenant-directory-list vx-platform-governance-list"
              role="region"
              aria-label={`${config.title}清单`}
            >
              <div className="vx-tenant-directory-list__header">
                <span>
                  <Checkbox
                    className="vx-model-select-checkbox"
                    checked={
                      isPageSelected
                        ? true
                        : isPagePartiallySelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={(value) => togglePage(value === true)}
                    aria-label={`选择当前页${config.objectLabel}`}
                  />
                </span>
                <span>序号</span>
                <span>{config.objectLabel}</span>
                <span>状态</span>
                <span>{config.scopeLabel}</span>
                <span>{config.ownerLabel}</span>
                <span>{config.policyLabel}</span>
                <span>操作</span>
              </div>
              {records.map((record, index) => {
                const meta = governanceStatusMeta(kind, record.status);
                const selected = selectedIds.has(record.id);
                return (
                  <div
                    key={record.id}
                    className={joinClasses(
                      "vx-tenant-directory-row vx-platform-governance-row",
                      selected ? "vx-platform-governance-row--selected" : "",
                    )}
                    onClick={(event) => {
                      if (isInteractiveTarget(event.target)) return;
                      toggleRecord(record.id, !selected);
                    }}
                  >
                    <span className="vx-platform-governance-row__select">
                      <Checkbox
                        className="vx-model-select-checkbox"
                        checked={selected}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={(value) =>
                          toggleRecord(record.id, value === true)
                        }
                        aria-label={`选择 ${record.name}`}
                      />
                    </span>
                    <span className="vx-platform-governance-row__index">
                      {formatNumber(index + 1)}
                    </span>
                    <span className="vx-tenant-directory-row__tenant vx-platform-governance-row__identity">
                      <Icon
                        name={config.icon}
                        size="sm"
                        fallback="placeholder"
                      />
                      <span>
                        <span className="vx-tenant-directory-row__title-line">
                          <Button
                            variant="link"
                            className="vx-model-name-button"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {record.name}
                          </Button>
                        </span>
                        <small>{record.description}</small>
                      </span>
                    </span>
                    <span className="vx-platform-governance-row__status">
                      <Badge
                        className={`vx-platform-governance-status ${meta.className}`}
                      >
                        <Icon
                          name={meta.icon}
                          size="xs"
                          fallback="placeholder"
                        />
                        {meta.label}
                      </Badge>
                    </span>
                    <span className="vx-platform-governance-row__scope">
                      <Badge className="vx-tenant-pill vx-model-provider-pill--online">
                        {record.scope}
                      </Badge>
                    </span>
                    <span className="vx-platform-governance-row__owner">
                      <strong>{record.owner}</strong>
                      <small>{record.updatedAt}</small>
                    </span>
                    <span className="vx-platform-governance-row__policy">
                      <strong>{record.policy}</strong>
                      <small>{record.tags.join(" / ")}</small>
                    </span>
                    <GovernanceActionsMenu
                      record={record}
                      labels={config.actions}
                    />
                  </div>
                );
              })}
            </div>
          ) : records.length ? (
            <div
              className="vx-tenant-directory-cards vx-platform-governance-cards"
              aria-label={`${config.title}卡片`}
            >
              {records.map((record) => {
                const meta = governanceStatusMeta(kind, record.status);
                return (
                  <article
                    key={record.id}
                    className="vx-tenant-directory-card vx-platform-governance-card"
                  >
                    <header>
                      <Icon
                        name={config.icon}
                        size="lg"
                        fallback="placeholder"
                      />
                      <div>
                        <strong>{record.name}</strong>
                        <span>
                          {record.scope} · {record.owner}
                        </span>
                      </div>
                      <Badge
                        className={`vx-platform-governance-status ${meta.className}`}
                      >
                        <Icon
                          name={meta.icon}
                          size="xs"
                          fallback="placeholder"
                        />
                        {meta.label}
                      </Badge>
                    </header>
                    <p>{record.description}</p>
                    <div className="vx-platform-governance-card__tags">
                      {record.tags.map((tag) => (
                        <Badge key={tag} className="vx-tenant-pill">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <footer>
                      <span>{record.policy}</span>
                      <strong>{record.updatedAt}</strong>
                    </footer>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
