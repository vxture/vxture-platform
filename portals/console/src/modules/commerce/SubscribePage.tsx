"use client";

/**
 * SubscribePage — the product→console conversion deep-link landing
 * (product_200 §3.2; fault-tolerance contract arda_303 §2.2).
 *
 * Entry: /subscribe?product=..&intent=upgrade|renew|addon[&target_tier][&metric]
 * Products link here as their ONLY conversion exit; all commercial decisions
 * render on this side. Contract behaviors implemented here:
 *  1. unknown intent/product → degrade to the subscription home, context kept
 *     (server already logged the stray value as a vocabulary-evolution signal);
 *  2. known intent + invalid params → proceed, invalid param ignored
 *     (target_tier merely loses its preselection);
 *  3. state-aware primary action (never subscribed → subscribe; trialing →
 *     convert; active w/o auto-renew → renew; lapsed → renew; overdue →
 *     settle once the payment plane emits it).
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge, Button, PageHeader } from "@vxture/design-system";
import { useRouter } from "@/lib/i18n/navigation";
import { PageSection } from "@/layout/shell";
import {
  executeSubscriptionUpgrade,
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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function formatPrice(price: SubscribePlanPrice): string {
  const amount = Number.parseFloat(price.price);
  const value = Number.isFinite(amount) ? amount.toLocaleString() : price.price;
  const prefix = price.currency === "CNY" ? "¥" : `${price.currency} `;
  return `${prefix}${value}`;
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
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgraded, setUpgraded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchSubscribeContext(query).then((result) => {
      if (cancelled) return;
      // Degrade rule (arda_303 §2.2 #1): unknown intent, unknown product, or a
      // failed fetch all land on the subscription home instead of an error —
      // a stale deep link costs one navigation, never a dead end.
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

  const { intent, product, targetTier, metric, current, plans } = ctx;
  // The effect already degrades these cases; this narrows the types for render.
  if (intent === null || product === null) return null;

  // State-aware primary hint (rule #3): what the user most likely came to do.
  const stateKey = (() => {
    if (!current) return "none";
    if (current.status === "active" && !current.autoRenew) return "renewOff";
    return STATUS_KEYS.has(current.status) ? current.status : "none";
  })();

  const onUpgrade = async (plan: SubscribePlanOption) => {
    if (!current) return;
    setBusyPlan(plan.planVersionId);
    setError(null);
    try {
      await executeSubscriptionUpgrade(
        current.subscriptionId,
        plan.planVersionId,
      );
      setUpgraded(true);
      router.replace("/subscription");
    } catch {
      setError(t("upgradeFailed"));
      setBusyPlan(null);
    }
  };

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
                <Badge
                  className={
                    current.status === "active" || current.status === "trialing"
                      ? "vx-badge-positive"
                      : undefined
                  }
                >
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
        {plans.length === 0 ? (
          <p className="vx-empty-hint">{t("noPlans")}</p>
        ) : (
          <div className="vx-stack-sm">
            {plans.map((plan) => {
              const isCurrent =
                current !== null &&
                plan.planVersionId === current.planVersionId;
              const isTarget = targetTier !== null && plan.tier === targetTier;
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
                        {plan.prices.length > 0
                          ? plan.prices
                              .map(
                                (price) =>
                                  `${formatPrice(price)} / ${
                                    price.cycleCount > 1
                                      ? `${price.cycleCount}×`
                                      : ""
                                  }${t(`cycle.${price.cycleUnit}`)}`,
                              )
                              .join(" · ")
                          : t("pricePending")}
                      </span>
                    </div>
                    <div className="vx-detail-actions">
                      {current && !isCurrent ? (
                        <Button
                          disabled={busyPlan !== null || upgraded}
                          onClick={() => void onUpgrade(plan)}
                        >
                          {busyPlan === plan.planVersionId
                            ? t("actions.processing")
                            : t("actions.switchTo")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {!current ? (
          <p className="vx-empty-hint">{t("contactToSubscribe")}</p>
        ) : null}
        {error ? <p className="vx-empty-hint">{error}</p> : null}
      </PageSection>

      <PageSection title={t("moreSection")} tone="muted">
        <Button onClick={() => router.push("/subscription")}>
          {t("actions.backToSubscription")}
        </Button>
      </PageSection>
    </div>
  );
}
