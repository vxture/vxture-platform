"use client";

import { useEffect, useState } from "react";
import { Link } from "@/lib/i18n/navigation";
import {
  Badge,
  DataTable,
  Icon,
  ActionButton,
  PageHeader,
  TableToolbar,
} from "@vxture/design-system";
import type { DataTableColumn, IconName } from "@vxture/design-system";
import { fetchBillingInvoices, type ConsoleInvoice } from "@/api/console-bff";
import { useConsoleSession } from "@/features/session/ConsoleSessionProvider";
import { useTranslations } from "next-intl";
import {
  DashboardSplit,
  PageSection,
  SignalList,
  SummaryStrip,
} from "@/layout/shell";

// ============================================================================
// 数据格式化工具
// ============================================================================

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatAmount(amount: number, currency = "CNY"): string {
  return currency === "CNY"
    ? `¥${amount.toLocaleString()}`
    : `${currency} ${amount.toLocaleString()}`;
}

function buildInvoiceRows(invoices: ConsoleInvoice[]): string[][] {
  return invoices.map((inv) => [
    inv.invoiceNumber,
    formatDate(inv.dueDate),
    inv.lineItems[0]?.description ?? "—",
    inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
    formatAmount(inv.totalAmount, inv.currency),
  ]);
}

function invoiceColumns(
  t: ReturnType<typeof useTranslations>,
): DataTableColumn<string[]>[] {
  return [
    {
      id: "invoice",
      header: t("invoices.headers.invoice"),
      cell: (row) => row[0],
    },
    { id: "date", header: t("invoices.headers.date"), cell: (row) => row[1] },
    { id: "scope", header: t("invoices.headers.scope"), cell: (row) => row[2] },
    {
      id: "status",
      header: t("invoices.headers.status"),
      cell: (row) => row[3],
    },
    {
      id: "amount",
      header: t("invoices.headers.amount"),
      cell: (row) => row[4],
      align: "right",
    },
  ];
}

// ============================================================================
// DashboardPage
// ============================================================================

export function DashboardPage() {
  const { session } = useConsoleSession();
  const t = useTranslations("dashboard");
  const [invoices, setInvoices] = useState<ConsoleInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  useEffect(() => {
    setInvoicesLoading(true);
    fetchBillingInvoices(5)
      .then(setInvoices)
      .finally(() => setInvoicesLoading(false));
  }, [session.tenant?.id]);

  const dashboardStats = [
    { id: "plan", icon: "medal" },
    { id: "quota", icon: "chart-bar" },
    { id: "reminders", icon: "warning" },
  ] as const;

  const quickActions = [
    { id: "addMember", href: "/members", icon: "users" },
    { id: "reviewSubscription", href: "/subscription", icon: "chart-bar" },
    { id: "adjustQuotas", href: "/quotas", icon: "database" },
  ] as const;

  const summaryItems = dashboardStats.map((stat) => ({
    label: t(`stats.${stat.id}.label`),
    value: t(`stats.${stat.id}.value`),
    hint: t(`stats.${stat.id}.hint`),
    aside: (
      <span className="vx-summary-strip__icon" aria-hidden="true">
        <Icon name={stat.icon as IconName} size="sm" fallback="info" />
      </span>
    ),
  }));

  const signalItems = [
    {
      title: t("signals.billing.title"),
      description: t("signals.billing.description"),
    },
    {
      title: t("signals.quota.title"),
      description: t("signals.quota.description"),
    },
    {
      title: t("signals.access.title"),
      description: t("signals.access.description"),
    },
  ];

  const invoiceRows = buildInvoiceRows(invoices);
  const invoiceTableColumns = invoiceColumns(t);

  return (
    <div className="vx-page-stack">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        action={<ActionButton icon="plus">{t("createAction")}</ActionButton>}
      />

      <SummaryStrip items={summaryItems} />

      <DashboardSplit>
        <PageSection
          title={t("quickActions.title")}
          description={t("quickActions.description")}
        >
          <div className="vx-action-list">
            {quickActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="vx-action-item"
              >
                <div className="vx-action-item__icon">
                  <Icon
                    name={action.icon as IconName}
                    size={20}
                    fallback="arrow-right"
                  />
                </div>
                <div>
                  <strong>{t(`quickActions.${action.id}.label`)}</strong>
                  <p>{t(`quickActions.${action.id}.description`)}</p>
                </div>
                <span className="vx-action-item__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </PageSection>

        <PageSection
          title={t("signals.title")}
          description={t("signals.description")}
          action={
            <Badge className="vx-badge-neutral">{t("signals.badge")}</Badge>
          }
          tone="muted"
        >
          <SignalList items={signalItems} />
        </PageSection>
      </DashboardSplit>

      <PageSection
        title={t("invoices.title")}
        description={t("invoices.description")}
      >
        <TableToolbar
          title={
            invoicesLoading
              ? "Loading…"
              : `${invoiceRows.length} recent invoices`
          }
          hint={t("invoices.headers.scope")}
          action={
            <ActionButton variant="outline" icon="arrow-right">
              {t("signals.billing.title")}
            </ActionButton>
          }
        />
        <DataTable
          columns={invoiceTableColumns}
          rows={invoiceRows}
          rowKey={(row, index) => row[0] ?? index}
          loading={invoicesLoading}
          loadingLabel="Loading invoices…"
          empty="No invoices found."
        />
      </PageSection>

      <PageSection
        title={t("quotas.title")}
        description={t("quotas.description")}
        tone="muted"
      >
        <p className="vx-empty-hint">
          Quota monitoring is not yet available. Check back after your first
          billing cycle.
        </p>
      </PageSection>
    </div>
  );
}
