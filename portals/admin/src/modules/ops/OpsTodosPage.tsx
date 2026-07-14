"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Icon,
  ActionMenu,
  Badge,
  Button,
  EmptyState,
} from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import {
  fetchSupportTicketsStrict,
  fetchTenantOperationsStrict,
} from "@/api/admin-bff";
import type {
  SupportTicketRecord,
  TenantOperationRecord,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import {
  formatNumber,
  riskLabel,
  statusLabel,
  typeLabel,
  verifiedLabel,
} from "@/modules/tenants/tenant-utils";

type TodoSeverity = "rose" | "amber" | "blue" | "green";
type TodoType = "verification" | "risk" | "ticket" | "usage" | "subscription";

interface OpsTodoItem {
  id: string;
  type: TodoType;
  title: string;
  description: string;
  tenantId: string;
  tenantName: string;
  tenantMeta: string;
  href: string;
  severity: TodoSeverity;
  priority: number;
  updatedAt: string;
  icon: IconName;
  tags: string[];
}

const TODO_TYPE_LABEL: Record<TodoType, string> = {
  verification: "认证审核",
  risk: "风险复核",
  ticket: "工单处理",
  usage: "用量异常",
  subscription: "订阅跟进",
};

const TODO_TYPE_ICON: Record<TodoType, IconName> = {
  verification: "medal",
  risk: "warning",
  ticket: "chat-circle",
  usage: "database",
  subscription: "star",
};

const TODO_TYPE_HREF: Record<TodoType, string> = {
  verification: "/verifications",
  risk: "/tenants",
  ticket: "/tickets",
  usage: "/usage-metering",
  subscription: "/subscriptions",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function severityOrder(severity: TodoSeverity) {
  if (severity === "rose") return 0;
  if (severity === "amber") return 1;
  if (severity === "blue") return 2;
  return 3;
}

function buildTenantMeta(tenant: TenantOperationRecord) {
  return `${typeLabel(tenant.tenantType)} / ${tenant.region} / ${statusLabel(tenant.status)}`;
}

function ticketSeverity(ticket: SupportTicketRecord): TodoSeverity {
  if (ticket.priority === "p0" || ticket.status === "blocked") return "rose";
  if (ticket.priority === "p1") return "amber";
  return "blue";
}

function ticketPriority(ticket: SupportTicketRecord) {
  if (ticket.priority === "p0") return 1;
  if (ticket.priority === "p1") return 10;
  if (ticket.priority === "p2") return 30;
  return 50;
}

function buildOpsTodos(
  tenants: TenantOperationRecord[],
  tickets: SupportTicketRecord[],
): OpsTodoItem[] {
  const tenantTodos = tenants.flatMap((tenant) => {
    const items: OpsTodoItem[] = [];
    const tenantMeta = buildTenantMeta(tenant);
    const tenantHref = `/tenants/${tenant.id}`;

    if (tenant.verifiedStatus === "pending") {
      items.push({
        id: `${tenant.id}-verification`,
        type: "verification",
        title: `${tenant.displayName} 认证待审核`,
        description: `当前认证状态为${verifiedLabel(tenant.verifiedStatus)}，需要核验资质材料与联系人信息。`,
        tenantId: tenant.id,
        tenantName: tenant.displayName,
        tenantMeta,
        href: "/verifications",
        severity: "amber",
        priority: 20,
        updatedAt: tenant.verificationSubmittedAt ?? tenant.lastActiveAt,
        icon: TODO_TYPE_ICON.verification,
        tags: [tenant.industry, tenant.scale],
      });
    }

    if (tenant.riskLevel !== "normal" || tenant.status === "suspended") {
      items.push({
        id: `${tenant.id}-risk`,
        type: "risk",
        title: `${tenant.displayName} 风险状态需复核`,
        description: tenant.notes,
        tenantId: tenant.id,
        tenantName: tenant.displayName,
        tenantMeta,
        href: tenantHref,
        severity:
          tenant.riskLevel === "high" || tenant.status === "suspended"
            ? "rose"
            : "amber",
        priority: tenant.riskLevel === "high" ? 5 : 25,
        updatedAt: tenant.lastActiveAt,
        icon: TODO_TYPE_ICON.risk,
        tags: [`风险 ${riskLabel(tenant.riskLevel)}`, `SLA ${tenant.sla}`],
      });
    }

    tenant.usage
      .filter((usage) => usage.status !== "normal")
      .forEach((usage) => {
        const usageRate = usage.quota
          ? Math.round((usage.used / usage.quota) * 100)
          : 0;
        items.push({
          id: `${tenant.id}-usage-${usage.code}`,
          type: "usage",
          title: `${tenant.displayName} ${usage.label} ${usage.status === "danger" ? "超限" : "预警"}`,
          description: `${usage.label} 已使用 ${formatNumber(usage.used)} ${usage.unit}，额度 ${usage.quota ? formatNumber(usage.quota) : "未配置"}，当前 ${usageRate}%。`,
          tenantId: tenant.id,
          tenantName: tenant.displayName,
          tenantMeta,
          href: tenantHref,
          severity: usage.status === "danger" ? "rose" : "amber",
          priority: usage.status === "danger" ? 8 : 35,
          updatedAt: tenant.lastActiveAt,
          icon: TODO_TYPE_ICON.usage,
          tags: [usage.label, usage.trend],
        });
      });

    tenant.subscriptions
      .filter(
        (subscription) =>
          subscription.status === "past_due" || subscription.status === "trial",
      )
      .forEach((subscription) => {
        items.push({
          id: `${tenant.id}-subscription-${subscription.id}`,
          type: "subscription",
          title: `${tenant.displayName} ${subscription.status === "past_due" ? "订阅逾期" : "试用跟进"}`,
          description: `${subscription.productName} / ${subscription.planName}，月收入 ${formatNumber(subscription.monthlyRevenue)}，需要运营确认续费或转正动作。`,
          tenantId: tenant.id,
          tenantName: tenant.displayName,
          tenantMeta,
          href: tenantHref,
          severity: subscription.status === "past_due" ? "rose" : "amber",
          priority: subscription.status === "past_due" ? 6 : 40,
          updatedAt: subscription.renewsAt ?? subscription.startedAt,
          icon: TODO_TYPE_ICON.subscription,
          tags: [subscription.productName, subscription.planName],
        });
      });

    return items;
  });

  const ticketTodos = tickets
    .filter((ticket) => ticket.status !== "closed")
    .map((ticket) => ({
      id: `${ticket.tenantId}-${ticket.id}`,
      type: "ticket" as const,
      title: `${ticket.id} ${ticket.title}`,
      description: `${ticket.tenantName} 的 ${ticket.priority.toUpperCase()} 工单处于${ticket.status === "blocked" ? "阻塞" : ticket.status === "processing" ? "处理中" : "待处理"}状态。`,
      tenantId: ticket.tenantId,
      tenantName: ticket.tenantName,
      tenantMeta: `${typeLabel(ticket.tenantType)} / ${ticket.region} / ${statusLabel(ticket.tenantStatus)}`,
      href: "/tickets",
      severity: ticketSeverity(ticket),
      priority: ticketPriority(ticket),
      updatedAt: ticket.updatedAt,
      icon: TODO_TYPE_ICON.ticket,
      tags: [ticket.priority.toUpperCase(), TODO_TYPE_LABEL.ticket],
    }));

  return [...tenantTodos, ...ticketTodos].sort((left, right) => {
    const severityDiff =
      severityOrder(left.severity) - severityOrder(right.severity);
    if (severityDiff !== 0) return severityDiff;
    return (
      left.priority - right.priority ||
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  });
}

function SummaryItem({
  icon,
  label,
  value,
  tags,
  tone = "blue",
}: {
  icon: IconName;
  label: string;
  value: string;
  tags: string[];
  tone?: TodoSeverity;
}) {
  return (
    <article className={`vx-tenant-summary__item vx-tenant-tone--${tone}`}>
      <Icon name={icon} size="lg" fallback="placeholder" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>
          {tags.map((tag) => (
            <em key={tag}>{tag}</em>
          ))}
        </p>
      </div>
    </article>
  );
}

function TodoTypeSummary({ type, count }: { type: TodoType; count: number }) {
  return (
    <Link
      className="vx-tenant-list-card vx-ops-todo-type-card"
      href={TODO_TYPE_HREF[type]}
    >
      <span className="vx-tenant-list-card__icon" aria-hidden="true">
        <Icon name={TODO_TYPE_ICON[type]} size="lg" fallback="placeholder" />
      </span>
      <div className="vx-tenant-list-card__body">
        <div className="vx-tenant-list-card__title">
          <strong>{TODO_TYPE_LABEL[type]}</strong>
          <span>{formatNumber(count)}</span>
        </div>
        <div className="vx-tenant-list-card__meta">
          <small>{count ? "有待处理事项" : "当前无积压"}</small>
        </div>
      </div>
    </Link>
  );
}

function TodoActionsMenu({ item }: { item: OpsTodoItem }) {
  const router = useRouter();

  return (
    <div
      className="vx-tenant-actions"
      onClick={(event) => event.stopPropagation()}
    >
      <ActionMenu
        label={`${item.title} 待办操作`}
        triggerClassName="vx-tenant-actions__trigger"
        triggerProps={{ title: "操作" }}
        items={[
          {
            id: "entry",
            label: "处理入口",
            icon: <Icon name="arrow-right" size="xs" fallback="placeholder" />,
            onSelect: () => router.push(item.href),
          },
          {
            id: "tenant",
            label: "查看租户",
            icon: <Icon name="buildings" size="xs" fallback="placeholder" />,
            onSelect: () =>
              router.push(`/tenants/${encodeURIComponent(item.tenantId)}`),
          },
        ]}
      />
    </div>
  );
}

function TodoRow({ item, index }: { item: OpsTodoItem; index: number }) {
  const router = useRouter();

  return (
    <div
      className={`vx-tenant-directory-row vx-tenant-directory-row--${item.severity} vx-ops-todo-row`}
    >
      <span className="vx-tenant-directory-row__index">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="vx-tenant-directory-row__tenant">
        <Icon name={item.icon} size="sm" fallback="placeholder" />
        <span>
          <Button
            variant="link"
            className="vx-model-name-button"
            onClick={() => router.push(item.href)}
          >
            {item.title}
          </Button>
          <small>{item.description}</small>
        </span>
      </span>
      <span>
        <strong>{item.tenantName}</strong>
        <small>{item.tenantMeta}</small>
      </span>
      <span>
        <strong>{TODO_TYPE_LABEL[item.type]}</strong>
        <small>{formatDateTime(item.updatedAt)}</small>
      </span>
      <span className="vx-tenant-directory-row__tag-line">
        {item.tags.slice(0, 3).map((tag) => (
          <Badge
            key={tag}
            className={`vx-tenant-pill vx-tenant-pill--${item.severity === "rose" ? "danger" : item.severity === "amber" ? "warning" : "normal"}`}
          >
            {tag}
          </Badge>
        ))}
      </span>
      <TodoActionsMenu item={item} />
    </div>
  );
}

export function OpsTodosPage() {
  const [tenants, setTenants] = useState<TenantOperationRecord[]>([]);
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantLoadError, setTenantLoadError] = useState<string | null>(null);
  const [ticketLoadError, setTicketLoadError] = useState<string | null>(null);
  const todos = useMemo(
    () => buildOpsTodos(tenants, tickets),
    [tenants, tickets],
  );
  const urgentTodos = todos.filter((todo) => todo.severity === "rose");
  const verificationTodos = todos.filter(
    (todo) => todo.type === "verification",
  );
  const ticketTodos = todos.filter((todo) => todo.type === "ticket");
  const affectedTenants = new Set(todos.map((todo) => todo.tenantId)).size;
  const typeCounts = (Object.keys(TODO_TYPE_LABEL) as TodoType[]).map(
    (type) => ({
      type,
      count: todos.filter((todo) => todo.type === type).length,
    }),
  );
  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setTenantLoadError(null);
    setTicketLoadError(null);

    Promise.all([
      fetchTenantOperationsStrict(),
      fetchSupportTicketsStrict().catch((error) => {
        if (!cancelled) {
          setTicketLoadError(
            error instanceof Error ? error.message : "工单数据读取失败",
          );
        }
        return [];
      }),
    ])
      .then(([tenantRecords, ticketRecords]) => {
        if (!cancelled) {
          setTenants(tenantRecords);
          setTickets(ticketRecords);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setTenants([]);
          setTickets([]);
          setTenantLoadError(
            error instanceof Error ? error.message : "租户运营数据读取失败",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="vx-page-stack vx-tenant-management-page vx-ops-todos-page">
      <PageHeader
        icon="table"
        title="运营待办"
        description="聚合认证审核、风险租户、工单、用量和订阅异常，帮助运营按优先级推进人工处理。"
        secondary={<Badge>只读聚合</Badge>}
      />

      <section className="vx-tenant-summary" aria-label="运营待办统计">
        <SummaryItem
          icon="warning"
          label="紧急事项"
          value={formatNumber(urgentTodos.length)}
          tags={[`影响租户 ${formatNumber(affectedTenants)}`]}
          tone={urgentTodos.length ? "rose" : "green"}
        />
        <SummaryItem
          icon="medal"
          label="认证待审"
          value={formatNumber(verificationTodos.length)}
          tags={["组织资质"]}
          tone={verificationTodos.length ? "amber" : "green"}
        />
        <SummaryItem
          icon="chat-circle"
          label="未关闭工单"
          value={formatNumber(ticketTodos.length)}
          tags={[
            `P0/P1 ${formatNumber(ticketTodos.filter((todo) => todo.priority <= 10).length)}`,
          ]}
          tone={ticketTodos.length ? "amber" : "green"}
        />
        <SummaryItem
          icon="table"
          label="全部待办"
          value={formatNumber(todos.length)}
          tags={["按优先级排序"]}
        />
      </section>

      <section
        className="vx-tenant-workspace vx-ops-todos-workspace"
        aria-label="运营待办工作台"
      >
        <aside
          className="vx-tenant-list vx-ops-todo-type-list"
          aria-label="待办分类"
        >
          <header>
            <strong>待办分类</strong>
            <span>按业务入口分流</span>
          </header>
          <div>
            {typeCounts.map((item) => (
              <TodoTypeSummary
                key={item.type}
                type={item.type}
                count={item.count}
              />
            ))}
          </div>
        </aside>

        <section className="vx-tenant-list-shell">
          <div className="vx-tenant-directory vx-ops-todo-directory">
            <header className="vx-tenant-directory__header">
              <strong>优先处理队列</strong>
              <span>
                {formatNumber(todos.length)} 条事项
                {ticketLoadError ? " / 工单未接入" : ""}
              </span>
            </header>
            {isLoading ? (
              <div className="vx-service-health-empty">
                <EmptyState
                  title="正在加载待办"
                  description="正在从租户、用量、订阅与工单数据库读取数据。"
                />
              </div>
            ) : tenantLoadError ? (
              <div className="vx-service-health-empty">
                <EmptyState
                  title="待办数据读取失败"
                  description={tenantLoadError}
                />
              </div>
            ) : todos.length ? (
              <div className="vx-tenant-directory-list vx-ops-todo-directory-list">
                <div className="vx-tenant-directory-list__header">
                  <span>#</span>
                  <span>事项</span>
                  <span>租户</span>
                  <span>类型 / 更新时间</span>
                  <span>标签</span>
                  <span>操作</span>
                </div>
                {todos.map((item, index) => (
                  <TodoRow key={item.id} item={item} index={index} />
                ))}
              </div>
            ) : (
              <div className="vx-service-health-empty">
                <EmptyState
                  title="当前没有待办"
                  description={
                    ticketLoadError ?? "数据库中没有匹配的运营待办。"
                  }
                />
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
