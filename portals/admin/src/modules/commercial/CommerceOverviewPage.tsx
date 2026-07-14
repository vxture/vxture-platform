"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon, EmptyState } from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import { fetchCommerceOverview } from "@/api/admin-bff";
import type {
  CommerceOverviewMetric,
  CommerceOverviewSnapshot,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { formatDate, formatNumber } from "@/modules/tenants/tenant-utils";
import { formatCurrency, SummaryItem } from "./CommercialUtils";

const quickLinks: Array<{
  href: string;
  label: string;
  description: string;
  icon: IconName;
}> = [
  {
    href: "/subscriptions",
    label: "订阅管理",
    description: "权益实例、续期、暂停和配额风险。",
    icon: "star",
  },
  {
    href: "/orders",
    label: "订单管理",
    description: "订单状态、支付确认和异常订单。",
    icon: "table",
  },
  {
    href: "/payments",
    label: "收款管理",
    description: "线下/线上收款台账与对账状态。",
    icon: "check",
  },
  {
    href: "/billing",
    label: "账单中心",
    description: "应收、调整、补录、作废与逾期跟进。",
    icon: "key",
  },
  {
    href: "/invoices",
    label: "发票管理",
    description: "线下开票登记、寄送交付和红冲。",
    icon: "table",
  },
  {
    href: "/usage-metering",
    label: "用量计费",
    description: "产品能力消耗、配额使用和超额风险。",
    icon: "graph",
  },
  {
    href: "/promotion-redemptions",
    label: "优惠核销",
    description: "账单减免、优惠使用和退回核销。",
    icon: "sparkles",
  },
];

function metricIcon(metric: CommerceOverviewMetric): IconName {
  if (metric.key === "subscriptions") return "star";
  if (metric.key === "payments") return "check";
  if (metric.key === "invoices") return "table";
  return "chart-bar";
}

function metricValue(metric: CommerceOverviewMetric) {
  if (typeof metric.amount === "number")
    return formatCurrency(metric.amount, metric.currency ?? "CNY");
  return formatNumber(metric.value);
}

function metricTags(metric: CommerceOverviewMetric) {
  if (typeof metric.amount === "number")
    return [`${formatNumber(metric.value)} 笔`, metric.hint];
  return [metric.hint];
}

function riskIcon(
  tone: CommerceOverviewSnapshot["risks"][number]["tone"],
): IconName {
  if (tone === "green") return "check";
  if (tone === "amber") return "clock";
  return "warning";
}

function OverviewMetricSummary({
  metrics,
}: {
  metrics: CommerceOverviewMetric[];
}) {
  return (
    <section className="vx-tenant-summary" aria-label="商业总览统计">
      {metrics.map((metric) => (
        <SummaryItem
          key={metric.key}
          icon={metricIcon(metric)}
          label={metric.label}
          value={metricValue(metric)}
          tags={metricTags(metric)}
          tone={metric.tone}
        />
      ))}
    </section>
  );
}

function RiskPanel({ snapshot }: { snapshot: CommerceOverviewSnapshot }) {
  return (
    <section
      className="vx-commerce-panel vx-commerce-risk-panel"
      aria-label="商业风险"
    >
      <header className="vx-commerce-panel__header">
        <div className="admin-overview-heading">
          <span className="admin-overview-heading__icon" aria-hidden="true">
            <Icon name="warning" size="lg" fallback="placeholder" />
          </span>
          <div className="admin-overview-heading__copy">
            <h2>风险与待办</h2>
            <p>从账单、收款、发票和用量中抽取运营侧需要跟进的事项。</p>
          </div>
        </div>
        <small>生成 {formatDate(snapshot.generatedAt)}</small>
      </header>
      <div className="vx-commerce-risk-list">
        {snapshot.risks.map((risk) => (
          <Link
            key={risk.id}
            className={`vx-commerce-risk-item vx-commerce-risk-item--${risk.tone}`}
            href={risk.href}
          >
            <span className="vx-commerce-risk-item__icon" aria-hidden="true">
              <Icon
                name={riskIcon(risk.tone)}
                size="sm"
                fallback="placeholder"
              />
            </span>
            <span>
              <strong>{risk.title}</strong>
              <small>{risk.detail}</small>
            </span>
            <Icon name="arrow-right" size="xs" fallback="placeholder" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function PlanRevenuePanel({
  snapshot,
}: {
  snapshot: CommerceOverviewSnapshot;
}) {
  return (
    <section
      className="vx-commerce-panel vx-commerce-plan-panel"
      aria-label="套餐收入"
    >
      <header className="vx-commerce-panel__header">
        <div className="admin-overview-heading">
          <span className="admin-overview-heading__icon" aria-hidden="true">
            <Icon name="chart-bar" size="lg" fallback="placeholder" />
          </span>
          <div className="admin-overview-heading__copy">
            <h2>套餐收入</h2>
            <p>
              按服务套餐汇总订阅数量与订阅应收（Σ subscriptions.pay_amount）。
            </p>
          </div>
        </div>
        <Link href="/service-plans">套餐管理</Link>
      </header>
      {/* C15: tierName / paidAmount / discountAmount removed — no source (tier not
          grouped; paidAmount was a dup of revenueAmount; discount never computed). */}
      <div className="vx-commerce-plan-list">
        {snapshot.planRevenue.length ? (
          snapshot.planRevenue.map((plan) => (
            <article key={plan.planName} className="vx-commerce-plan-row">
              <span className="vx-commerce-plan-row__main">
                <strong>{plan.planName}</strong>
                <span>
                  <small>{formatNumber(plan.subscriptionCount)} 个订阅</small>
                </span>
              </span>
              <span className="vx-commerce-plan-row__amounts">
                <span>
                  <strong>
                    {formatCurrency(plan.revenueAmount, plan.currency)}
                  </strong>
                  <small>订阅应收</small>
                </span>
              </span>
            </article>
          ))
        ) : (
          <div className="vx-commerce-panel__empty">暂无套餐收入数据</div>
        )}
      </div>
    </section>
  );
}

function QuickLinkPanel() {
  return (
    <section
      className="vx-commerce-panel vx-commerce-link-panel"
      aria-label="商业财务入口"
    >
      <header className="vx-commerce-panel__header">
        <div className="admin-overview-heading">
          <span className="admin-overview-heading__icon" aria-hidden="true">
            <Icon name="squares-four" size="lg" fallback="placeholder" />
          </span>
          <div className="admin-overview-heading__copy">
            <h2>业务入口</h2>
            <p>商业财务域的运营台账入口，保持人工处理和规则配置边界清晰。</p>
          </div>
        </div>
      </header>
      <div className="vx-commerce-link-grid">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            className="vx-commerce-link-card"
            href={link.href}
          >
            <span aria-hidden="true">
              <Icon name={link.icon} size="sm" fallback="placeholder" />
            </span>
            <strong>{link.label}</strong>
            <small>{link.description}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CommerceOverviewPage() {
  const [snapshot, setSnapshot] = useState<CommerceOverviewSnapshot | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCommerceOverview()
      .then((item) => {
        if (active) setSnapshot(item);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const metricCount = useMemo(() => snapshot?.metrics.length ?? 0, [snapshot]);

  return (
    <div className="vx-page-stack vx-tenant-management-page vx-commerce-overview-page">
      <PageHeader
        icon="chart-bar"
        eyebrow="商业分析"
        title="商业总览"
        description="运营管理平台的商业财务入口：聚合订阅、订单、收款、账单、发票、用量和优惠数据，辅助运营人员判断风险与跟进优先级。"
      />

      {snapshot ? <OverviewMetricSummary metrics={snapshot.metrics} /> : null}

      {!snapshot && !loading ? (
        <section className="vx-tenant-empty">
          <EmptyState
            title="暂未读取到商业分析数据"
            description="请确认商业 BFF 服务和数据库连接状态。"
          />
        </section>
      ) : null}

      {loading && !snapshot ? (
        <div className="vx-commerce-panel__empty">正在读取商业财务快照</div>
      ) : null}

      {snapshot ? (
        <>
          <div className="vx-commerce-overview-layout">
            <RiskPanel snapshot={snapshot} />
            <PlanRevenuePanel snapshot={snapshot} />
          </div>
          <QuickLinkPanel />
          <footer className="vx-commerce-overview-footer">
            <span>已聚合 {formatNumber(metricCount)} 类指标</span>
            <strong>更新时间 {formatDate(snapshot.generatedAt)}</strong>
          </footer>
        </>
      ) : null}
    </div>
  );
}
