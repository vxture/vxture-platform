"use client";

import { useEffect, useState } from "react";
import { Badge, Button, ActionButton, PageHeader } from "@vxture/design-system";
import {
  fetchBillingInvoices,
  fetchMySubscriptions,
  type ConsoleInvoice,
  type ConsoleSubscription,
} from "@/api/console-bff";
import { useConsoleSession } from "@/features/session/ConsoleSessionProvider";
import {
  DashboardSplit,
  PageSection,
  SignalList,
  SummaryStrip,
} from "@/layout/shell";
import type { ModuleCardStat } from "@/entities/console";

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

function buildSummaryItems(
  subscriptions: ConsoleSubscription[],
): ModuleCardStat[] {
  const active =
    subscriptions.find((s) => s.status === "active") ?? subscriptions[0];
  if (!active) {
    return [
      { label: "Plan", value: "—", hint: "No active subscription." },
      { label: "Renewal", value: "—", hint: "—" },
      { label: "Billing", value: "—", hint: "—" },
    ];
  }

  return [
    {
      label: "Plan",
      value: active.planName,
      hint: `${formatAmount(active.price, active.currency)} / ${active.cycle}`,
    },
    {
      label: "Renewal",
      value: formatDate(active.nextBillingDate),
      hint: active.autoRenew ? "Auto-renew enabled" : "Will not auto-renew",
    },
    {
      label: "Status",
      value: active.status.charAt(0).toUpperCase() + active.status.slice(1),
      hint: active.isTrial ? "Trial period active" : "Paid subscription",
    },
  ];
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

// ============================================================================
// SubscriptionPage
// ============================================================================

const changePlanningNotes = [
  {
    title: "Upgrade recommendation",
    body: "Fine-tune demand suggests moving GPU budget into the next tier before the next contract checkpoint.",
  },
  {
    title: "Renewal note",
    body: "Seats can still be adjusted before the invoice locks on the next billing date.",
  },
];

const paymentMethods = [
  {
    title: "Corporate Visa",
    body: "Primary method for annual subscription charges and variable overage billing.",
  },
  {
    title: "Bank transfer",
    body: "Reserved for negotiated invoice settlements and manual approval workflow.",
  },
];

export function SubscriptionPage() {
  const { session } = useConsoleSession();
  const [tab, setTab] = useState<"overview" | "billing" | "payments">(
    "overview",
  );
  const [subscriptions, setSubscriptions] = useState<ConsoleSubscription[]>([]);
  const [invoices, setInvoices] = useState<ConsoleInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMySubscriptions(), fetchBillingInvoices(10)])
      .then(([subs, invs]) => {
        setSubscriptions(subs);
        setInvoices(invs);
      })
      .finally(() => setLoading(false));
  }, [session.tenant?.id]);

  const summaryItems = buildSummaryItems(subscriptions);
  const invoiceRows = buildInvoiceRows(invoices);
  const planningSignals = changePlanningNotes.map((note) => ({
    title: note.title,
    description: note.body,
  }));
  const paymentSignals = paymentMethods.map((method) => ({
    title: method.title,
    description: method.body,
  }));

  const activeSubscription =
    subscriptions.find((s) => s.status === "active") ?? subscriptions[0];

  const postureSignals = [
    {
      title: "Invoice readiness",
      description:
        "Finance contact and payment routing are configured, renewal can proceed without manual intervention.",
    },
  ];

  const chargeSignals = [
    {
      title: "Overage driver",
      description:
        "Most variable spend comes from burst model access rather than additional seat growth.",
    },
  ];

  return (
    <div className="vx-page-stack">
      <PageHeader
        eyebrow="Commerce"
        title="Subscription"
        description="Surface current plan, renewal timing, and pooled resource posture before dropping into billing records."
        action={<ActionButton icon="settings">Manage plan</ActionButton>}
      />

      <SummaryStrip items={summaryItems} />

      <div
        className="vx-tabs-list"
        role="tablist"
        aria-label="Subscription tabs"
      >
        <Button
          variant="ghost"
          size="sm"
          className={tab === "overview" ? "vx-tab vx-tab--active" : "vx-tab"}
          onClick={() => setTab("overview")}
        >
          Plan overview
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={tab === "billing" ? "vx-tab vx-tab--active" : "vx-tab"}
          onClick={() => setTab("billing")}
        >
          Recent billing
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={tab === "payments" ? "vx-tab vx-tab--active" : "vx-tab"}
          onClick={() => setTab("payments")}
        >
          Payment methods
        </Button>
      </div>

      {tab === "overview" ? (
        <DashboardSplit>
          <PageSection
            title="Current package"
            description="A modern SaaS billing page starts with the plan, not the table."
          >
            {loading ? (
              <p className="vx-empty-hint">Loading subscription…</p>
            ) : activeSubscription ? (
              <div className="vx-subscription-panel">
                <div className="vx-stack-sm">
                  <div className="vx-inline-between">
                    <strong>{activeSubscription.planName}</strong>
                    <Badge className="vx-badge-positive">
                      {activeSubscription.status}
                    </Badge>
                  </div>
                  <div className="vx-detail-grid">
                    <div>
                      <span>Renewal</span>
                      <strong>
                        {formatDate(activeSubscription.nextBillingDate)}
                      </strong>
                    </div>
                    <div>
                      <span>Price</span>
                      <strong>
                        {formatAmount(
                          activeSubscription.price,
                          activeSubscription.currency,
                        )}{" "}
                        / {activeSubscription.cycle}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="vx-detail-actions">
                  <ActionButton variant="outline" icon="chart-bar">
                    Compare tiers
                  </ActionButton>
                  <ActionButton variant="outline" icon="calendar">
                    Preview renewal
                  </ActionButton>
                </div>
              </div>
            ) : (
              <p className="vx-empty-hint">No active subscription found.</p>
            )}
          </PageSection>

          <PageSection
            title="Change planning"
            description="Keep upgrade or downgrade actions available, but visually secondary to the current state."
            tone="muted"
          >
            <SignalList items={planningSignals} />
          </PageSection>
        </DashboardSplit>
      ) : null}

      {tab === "overview" ? (
        <DashboardSplit>
          <PageSection
            title="Billing posture"
            description="Keep payment context available without turning subscription into a finance page."
            tone="muted"
          >
            <SignalList items={postureSignals} />
          </PageSection>
        </DashboardSplit>
      ) : null}

      {tab === "billing" ? (
        <DashboardSplit>
          <PageSection
            title="Recent charges"
            description="Invoices and overage records remain secondary to the subscription overview."
          >
            {loading ? (
              <p className="vx-empty-hint">Loading invoices…</p>
            ) : invoiceRows.length > 0 ? (
              <div className="vx-table">
                <div className="vx-table__header vx-table__row">
                  <span>Invoice</span>
                  <span>Date</span>
                  <span>Scope</span>
                  <span>Status</span>
                  <span>Amount</span>
                </div>
                {invoiceRows.map((row) => (
                  <div key={row[0]} className="vx-table__row">
                    {row.map((cell, idx) => (
                      <span key={idx}>{cell}</span>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="vx-empty-hint">No invoices found.</p>
            )}
          </PageSection>

          <PageSection
            title="Charge guidance"
            description="Explain what changed and what operators need to review next."
            tone="muted"
          >
            <SignalList items={chargeSignals} />
          </PageSection>
        </DashboardSplit>
      ) : null}

      {tab === "payments" ? (
        <PageSection
          title="Payment methods"
          description="Payment management stays available without turning the page into a finance system."
          tone="muted"
        >
          <SignalList items={paymentSignals} />
        </PageSection>
      ) : null}
    </div>
  );
}
