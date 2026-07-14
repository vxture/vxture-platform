"use client";

/**
 * SubscribePage — the product→console conversion deep-link landing +
 * ordering surface (product_200 §3.2; product_320 §4.4).
 *
 * Entry: /subscribe?product=..&intent=subscribe|upgrade|renew|addon[&target_tier][&metric]
 * Fault-tolerance (arda_303 §2.2): unknown intent/product → degrade to the
 * subscription home. State machine (product_320):
 *  - a pending offline order exists → awaiting-confirmation panel (order no +
 *    transfer instructions + cancel);
 *  - otherwise the plan ladder with a month/year toggle: free → activate now,
 *    paid → subscribe/renew (new) or upgrade (from a live sub), enterprise
 *    (no price rows) → contact sales.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge, Button, PageHeader } from "@vxture/design-system";
import { useRouter } from "@/lib/i18n/navigation";
import { PageSection } from "@/layout/shell";
import {
  cancelSubscriptionOrder,
  createSubscriptionOrder,
  fetchSubscribeContext,
  type SubscribeContext,
  type SubscribePlanOption,
  type SubscribePlanPrice,
} from "@/api/console-bff";

const STATUS_KEYS = new Set([
  "active",
  "trialing",
  "overdue",
  "suspended",
  "expired",
  "cancelled",
]);

type Cycle = "month" | "year";
const CYCLES: Cycle[] = ["month", "year"];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function formatMoney(amount: string, currency: string): string {
  const n = Number.parseFloat(amount);
  const value = Number.isFinite(n) ? n.toLocaleString() : amount;
  const prefix = currency === "CNY" ? "¥" : `${currency} `;
  return `${prefix}${value}`;
}

function priceForCycle(
  plan: SubscribePlanOption,
  cycle: Cycle,
): SubscribePlanPrice | undefined {
  return plan.prices.find((p) => p.cycleUnit === cycle && p.cycleCount === 1);
}

export function SubscribePage() {
  const t = useTranslations("subscribePage");
  const router = useRouter();
  const params = useSearchParams();

  const query = useMemo(
    () => ({
      product: params.get("product") ?? undefined,
      intent: params.get("intent") ?? undefined,
      targetTier: params.get("target_tier") ?? undefined,
      metric: params.get("metric") ?? undefined,
    }),
    [params],
  );

  const [ctx, setCtx] = useState<SubscribeContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<Cycle>("year"); // 默认年付（更省）
  const [busy, setBusy] = useState<string | null>(null); // planVersionId | "cancel"
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSubscribeContext(query).then((result) => {
      if (cancelled) return;
      // Degrade (arda_303 §2.2 #1): unknown intent/product/failed fetch → home.
      if (!result || result.intent === null || result.product === null) {
        router.replace("/subscription");
        return;
      }
      setCtx(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [query, router]);

  if (loading || !ctx) {
    return (
      <div className="vx-page-stack">
        <p className="vx-empty-hint">{t("loading")}</p>
      </div>
    );
  }

  const { intent, product, targetTier, metric, current, pendingOrder, plans } =
    ctx;
  if (intent === null || product === null) return null;

  async function reload() {
    const fresh = await fetchSubscribeContext(query);
    if (fresh) setCtx(fresh);
  }

  // ── 待支付订单面板 ────────────────────────────────────────────────────────
  if (pendingOrder) {
    const onCancel = async () => {
      setBusy("cancel");
      setError(null);
      try {
        await cancelSubscriptionOrder(pendingOrder.orderId);
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("cancelOrderFailed"));
      } finally {
        setBusy(null);
      }
    };
    return (
      <div className="vx-page-stack">
        <PageHeader
          eyebrow={product.name}
          title={t("pending.title")}
          description={t("pending.awaiting")}
        />
        <PageSection title={t("pending.title")}>
          <div className="vx-subscription-panel">
            <div className="vx-detail-grid">
              <div>
                <span>{t("pending.orderNo")}</span>
                <strong>{pendingOrder.orderNo}</strong>
              </div>
              <div>
                <span>{t("plansSection")}</span>
                <strong>
                  {pendingOrder.planCode}
                  {pendingOrder.tier ? ` · ${pendingOrder.tier}` : ""}
                </strong>
              </div>
              <div>
                <span>{t("pending.amount")}</span>
                <strong>
                  {formatMoney(pendingOrder.amount, pendingOrder.currency)} /{" "}
                  {t(`cycle.${pendingOrder.cycleUnit}`)}
                </strong>
              </div>
            </div>
          </div>
        </PageSection>
        <PageSection title={t("pending.bankTitle")} tone="muted">
          {/* 汇款账户来自服务端配置；context 不透传敏感账户，仅展示占位提示 + 订单号备注 */}
          <p className="vx-empty-hint">{t("pending.configPending")}</p>
          <p className="vx-empty-hint">
            {t("pending.reference")}：<strong>{pendingOrder.orderNo}</strong>（
            {t("pending.referenceHint")}）
          </p>
        </PageSection>
        {error ? <p className="vx-empty-hint">{error}</p> : null}
        <PageSection title={t("moreSection")} tone="muted">
          <div className="vx-detail-actions">
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() => void reload()}
            >
              {t("actions.refresh")}
            </Button>
            <Button disabled={busy !== null} onClick={() => void onCancel()}>
              {busy === "cancel"
                ? t("pending.cancelling")
                : t("pending.cancel")}
            </Button>
          </div>
        </PageSection>
      </div>
    );
  }

  const stateKey = (() => {
    if (!current) return "none";
    if (current.status === "active" && !current.autoRenew) return "renewOff";
    return STATUS_KEYS.has(current.status) ? current.status : "none";
  })();

  const isLive = current?.status === "active" || current?.status === "trialing";

  const onSelect = async (plan: SubscribePlanOption) => {
    setBusy(plan.planVersionId);
    setError(null);
    const orderIntent: "new" | "renew" | "upgrade" = !current
      ? "new"
      : isLive
        ? "upgrade"
        : "renew";
    try {
      const result = await createSubscriptionOrder({
        productCode: product.code,
        planVersionId: plan.planVersionId,
        cycleUnit: cycle,
        intent: orderIntent,
        ...(orderIntent === "upgrade" && current
          ? { upgradeOfSubscriptionId: current.subscriptionId }
          : {}),
      });
      if (result.status === "active") {
        router.replace("/subscription"); // free 即时开通
        return;
      }
      await reload(); // pending order 生成 → 渲染待支付面板
    } catch (e) {
      setError(e instanceof Error ? e.message : t("orderFailed"));
      setBusy(null);
    }
  };

  const contactSales = () => {
    window.location.href = `mailto:sales@vxture.com?subject=${encodeURIComponent(
      `${product.name} 企业版咨询`,
    )}`;
  };

  const planButtonLabel = (isFree: boolean) =>
    isFree
      ? t("actions.activateFree")
      : !current
        ? t("actions.subscribe")
        : isLive
          ? t("actions.upgrade")
          : t("actions.renew");

  return (
    <div className="vx-page-stack">
      <PageHeader
        eyebrow={product.name}
        title={t(`title.${intent}`)}
        description={t(`hint.${stateKey}`)}
      />

      <PageSection title={t("currentSection")}>
        {current ? (
          <div className="vx-subscription-panel">
            <div className="vx-stack-sm">
              <div className="vx-inline-between">
                <strong>{current.planCode}</strong>
                <Badge className={isLive ? "vx-badge-positive" : undefined}>
                  {STATUS_KEYS.has(current.status)
                    ? t(`status.${current.status}`)
                    : current.status}
                </Badge>
              </div>
              <div className="vx-detail-grid">
                <div>
                  <span>{t("fields.tier")}</span>
                  <strong>{current.tier ?? "—"}</strong>
                </div>
                <div>
                  <span>
                    {current.status === "trialing"
                      ? t("fields.trialEndsAt")
                      : t("fields.periodEnd")}
                  </span>
                  <strong>
                    {formatDate(
                      current.status === "trialing"
                        ? current.trialEndAt
                        : current.endAt,
                    )}
                  </strong>
                </div>
                <div>
                  <span>{t("fields.autoRenew")}</span>
                  <strong>
                    {current.autoRenew
                      ? t("fields.autoRenewOn")
                      : t("fields.autoRenewOff")}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="vx-empty-hint">{t("noSubscription")}</p>
        )}
      </PageSection>

      {intent === "addon" ? (
        <PageSection title={t("addonSection")} tone="muted">
          <p className="vx-empty-hint">
            {metric ? t("addonNoticeMetric", { metric }) : t("addonNotice")}
          </p>
        </PageSection>
      ) : null}

      <PageSection title={t("plansSection")}>
        <div className="vx-stack-sm">
          <div className="vx-detail-actions">
            {CYCLES.map((c) => (
              <Button
                key={c}
                variant={cycle === c ? "default" : "outline"}
                onClick={() => setCycle(c)}
              >
                {t(`cycleToggle.${c === "month" ? "monthly" : "yearly"}`)}
              </Button>
            ))}
          </div>

          {plans.length === 0 ? (
            <p className="vx-empty-hint">{t("noPlans")}</p>
          ) : (
            <div className="vx-stack-sm">
              {plans.map((plan) => {
                const isCurrent =
                  current !== null &&
                  plan.planVersionId === current.planVersionId;
                const isTarget =
                  targetTier !== null && plan.tier === targetTier;
                const isEnterprise = plan.prices.length === 0;
                const price = priceForCycle(plan, cycle);
                const isFree = price
                  ? Number.parseFloat(price.price) <= 0
                  : false;
                return (
                  <div key={plan.planId} className="vx-subscription-panel">
                    <div className="vx-inline-between">
                      <div className="vx-stack-sm">
                        <div className="vx-inline-between">
                          <strong>{plan.planName}</strong>
                          <Badge>{plan.tier}</Badge>
                          {isCurrent ? (
                            <Badge>{t("badges.current")}</Badge>
                          ) : null}
                          {isTarget && !isCurrent ? (
                            <Badge className="vx-badge-positive">
                              {t("badges.recommended")}
                            </Badge>
                          ) : null}
                        </div>
                        <span>
                          {isEnterprise
                            ? t("actions.contactSales")
                            : price
                              ? `${formatMoney(price.price, price.currency)} / ${t(
                                  `cycle.${price.cycleUnit}`,
                                )}`
                              : t("pricePending")}
                        </span>
                      </div>
                      <div className="vx-detail-actions">
                        {isCurrent ? null : isEnterprise ? (
                          <Button variant="outline" onClick={contactSales}>
                            {t("actions.contactSales")}
                          </Button>
                        ) : price ? (
                          <Button
                            disabled={busy !== null}
                            onClick={() => void onSelect(plan)}
                          >
                            {busy === plan.planVersionId
                              ? t("actions.processing")
                              : planButtonLabel(isFree)}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {error ? <p className="vx-empty-hint">{error}</p> : null}
        </div>
      </PageSection>

      <PageSection title={t("moreSection")} tone="muted">
        <Button variant="outline" onClick={() => router.push("/subscription")}>
          {t("actions.backToSubscription")}
        </Button>
      </PageSection>
    </div>
  );
}
