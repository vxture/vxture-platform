"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  Badge,
  Button,
  ActionButton,
  DataTable,
  PageHeader,
} from "@vxture/design-system";
import type { DataTableColumn } from "@vxture/design-system";
import {
  cancelSubscriptionOrder,
  fetchBillingInvoices,
  fetchCredits,
  fetchEntitlements,
  fetchMyOrders,
  fetchMySubscriptions,
  ConsoleBffError,
  type ConsoleInvoice,
  type ConsoleSubscription,
  type MyOrder,
  type WorkspaceEntitlement,
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
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

function formatOrderAmount(amount: string, currency: string): string {
  const n = Number.parseFloat(amount);
  const value = Number.isFinite(n) ? n.toLocaleString() : amount;
  return currency === "CNY" ? `¥${value}` : `${currency} ${value}`;
}

// Six-state contract (product_321 P1); labels come from the orderPay i18n
// namespace at render time (this page's own copy stays the 320-era English
// placeholder debt — the ORDERS tab is the one surface localized here).
const ORDER_STATUS_BADGES: Record<MyOrder["orderStatus"], string> = {
  pending_payment: "vx-badge-warning",
  paid_pending_verify: "vx-badge-info",
  activating: "vx-badge-info",
  completed: "vx-badge-positive",
  cancelled: "vx-badge-muted",
  expired: "vx-badge-muted",
};

// C2 subscription-status six-value domain (@vxture/shared SUBSCRIPTION_STATUSES)
// + null = never subscribed (product_220 §3 — absence, not a status value).
const ENTITLEMENT_STATUS_BADGES: Record<string, string> = {
  active: "vx-badge-positive",
  trialing: "vx-badge-info",
  overdue: "vx-badge-warning",
  suspended: "vx-badge-warning",
  expired: "vx-badge-muted",
  cancelled: "vx-badge-muted",
};

/**
 * `status: null` means "no standalone (primary) subscription" — it does NOT
 * mean "no access" when `bundled` is true (product_220 §2/§3: a product can
 * carry real bundled-only coverage with no primary subscription of its own,
 * e.g. a raven-pro plan bundling arda). Labeling that combination "Not
 * subscribed" would read as an error to a workspace admin who does have
 * working access via the bundle, so the two facts are distinguished here.
 */
function formatEntitlementStatus(
  status: string | null,
  bundled: boolean,
): string {
  if (status === null) return bundled ? "Bundled access" : "Not subscribed";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatTier(tier: string | null): string {
  if (tier === null) return "—";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function formatLimits(limits: Record<string, number>): string {
  const entries = Object.entries(limits);
  if (entries.length === 0) return "—";
  return entries
    .map(([key, value]) => `${key}: ${value === -1 ? "unlimited" : value}`)
    .join(" · ");
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
  const tOrder = useTranslations("orderPay");
  const router = useRouter();
  const [tab, setTab] = useState<
    "overview" | "billing" | "orders" | "payments"
  >("overview");
  const [subscriptions, setSubscriptions] = useState<ConsoleSubscription[]>([]);
  const [invoices, setInvoices] = useState<ConsoleInvoice[]>([]);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [credits, setCredits] = useState<{
    balance: string;
    currency: string;
  } | null>(null);
  const [entitlements, setEntitlements] = useState<WorkspaceEntitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchMySubscriptions(),
      fetchBillingInvoices(10),
      fetchMyOrders(),
      fetchCredits(),
      fetchEntitlements(),
    ])
      .then(([subs, invs, ords, creditRecord, entitlementRecords]) => {
        setSubscriptions(subs);
        setInvoices(invs);
        setOrders(ords);
        setCredits(creditRecord);
        setEntitlements(entitlementRecords);
      })
      .finally(() => setLoading(false));
  }, [session.tenant?.id]);

  async function handleCancelOrder(orderId: string) {
    setOrderError(null);
    setCancelingId(orderId);
    try {
      await cancelSubscriptionOrder(orderId);
      setOrders(await fetchMyOrders());
    } catch (err) {
      setOrderError(
        err instanceof ConsoleBffError
          ? err.message
          : "Failed to cancel order.",
      );
    } finally {
      setCancelingId(null);
    }
  }

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

  const entitlementColumns: DataTableColumn<WorkspaceEntitlement>[] = [
    { id: "product", header: "Product", cell: (e) => e.productCode },
    { id: "tier", header: "Tier", cell: (e) => formatTier(e.tier) },
    {
      id: "status",
      header: "Status",
      cell: (e) => (
        <Badge
          className={
            e.status
              ? (ENTITLEMENT_STATUS_BADGES[e.status] ?? "vx-badge-muted")
              : e.bundled
                ? "vx-badge-info"
                : "vx-badge-muted"
          }
        >
          {formatEntitlementStatus(e.status, e.bundled)}
        </Badge>
      ),
    },
    {
      id: "bundled",
      header: "Bundled",
      cell: (e) => (e.bundled ? "Yes" : "—"),
    },
    { id: "limits", header: "Limits", cell: (e) => formatLimits(e.limits) },
  ];

  const orderColumns: DataTableColumn<MyOrder>[] = [
    { id: "orderNo", header: "Order no.", cell: (o) => o.orderNo },
    {
      id: "type",
      header: "Type",
      cell: () => tOrder("list.typeSubscription"),
    },
    {
      id: "plan",
      header: "Plan",
      cell: (o) => (o.tier ? `${o.planName} · ${o.tier}` : o.planName),
    },
    {
      id: "cycle",
      header: "Cycle",
      cell: (o) => (o.cycleUnit === "year" ? "Yearly" : "Monthly"),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (o) => (
        <span>
          {formatOrderAmount(o.amount, o.currency)}
          {Number(o.voucherOff) > 0 ? (
            <span className="vx-empty-hint">
              {" "}
              {tOrder("list.voucherOff", {
                amount: formatOrderAmount(o.voucherOff, o.currency),
              })}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (o) => (
        <Badge className={ORDER_STATUS_BADGES[o.orderStatus]}>
          {tOrder(`status.${o.orderStatus}`)}
        </Badge>
      ),
    },
    { id: "placed", header: "Placed", cell: (o) => formatDate(o.createdAt) },
    {
      id: "action",
      header: " ",
      align: "right",
      cell: (o) =>
        o.orderStatus === "pending_payment" ? (
          <span className="vx-inline-between">
            <Button
              size="sm"
              onClick={() => router.push(`/subscribe/pay/${o.orderId}`)}
            >
              {tOrder("list.payNow")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={cancelingId === o.orderId || Number(o.paidAmount) > 0}
              onClick={() => handleCancelOrder(o.orderId)}
            >
              {cancelingId === o.orderId ? "Canceling…" : "Cancel"}
            </Button>
          </span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/subscribe/pay/${o.orderId}`)}
          >
            {tOrder("list.view")}
          </Button>
        ),
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
          className={tab === "orders" ? "vx-tab vx-tab--active" : "vx-tab"}
          onClick={() => setTab("orders")}
        >
          My orders
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
        <PageSection
          title="Current entitlements"
          description="Per-product tier, status, and pooled-resource ceilings resolved from the platform's commercial contract (product_220 §3)."
        >
          <DataTable
            columns={entitlementColumns}
            rows={entitlements}
            rowKey={(e) => e.productCode}
            loading={loading}
            loadingLabel="Loading entitlements…"
            empty="No product entitlements yet."
          />
        </PageSection>
      ) : null}

      {tab === "overview" ? (
        <DashboardSplit>
          <PageSection
            title={tOrder("list.creditsTitle")}
            description={tOrder("list.creditsNote")}
            tone="muted"
          >
            {/* Dormant wallet (product_321 P6): read-only balance, no top-up. */}
            <div className="vx-subscription-panel">
              <div className="vx-inline-between">
                <strong>
                  {formatOrderAmount(
                    credits?.balance ?? "0.00",
                    credits?.currency ?? "CNY",
                  )}
                </strong>
              </div>
            </div>
          </PageSection>
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

      {tab === "orders" ? (
        <PageSection
          title="My orders"
          description="Offline subscription orders you placed — track the order number, transfer status, and cancel one that is still awaiting confirmation."
        >
          {orderError ? <p className="vx-empty-hint">{orderError}</p> : null}
          <DataTable
            columns={orderColumns}
            rows={orders}
            rowKey={(order) => order.orderId}
            loading={loading}
            loadingLabel="Loading orders…"
            empty="No orders yet."
          />
        </PageSection>
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
