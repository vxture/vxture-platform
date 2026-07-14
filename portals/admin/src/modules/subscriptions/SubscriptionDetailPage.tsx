"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, Badge, Button, EmptyState } from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import {
  fetchSubscriptionOperation,
  submitSubscriptionOperation,
} from "@/api/admin-bff";
import type {
  ProductSolutionCapabilityType,
  SubscriptionOperationAction,
  SubscriptionOperationDetailRecord,
  SubscriptionOperationQuotaRisk,
  SubscriptionOperationStatus,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { DetailSectionHeading } from "@/modules/shared/DetailSectionHeading";
import {
  canRunSubscriptionAction,
  SubscriptionOperationDialog,
  subscriptionActionDisabledReason,
  subscriptionActionIcon,
  subscriptionActionLabel,
  subscriptionToggleAction,
} from "@/modules/subscriptions/SubscriptionOperationDialog";
import {
  formatDate,
  formatMoney,
  formatNumber,
  typeLabel,
} from "@/modules/tenants/tenant-utils";

function subscriptionStatusLabel(status: SubscriptionOperationStatus) {
  if (status === "trial") return "试用";
  if (status === "active") return "已生效";
  if (status === "expiring") return "即将到期";
  if (status === "overdue") return "逾期";
  if (status === "suspended") return "暂停";
  return "已取消";
}

function quotaRiskLabel(risk: SubscriptionOperationQuotaRisk) {
  if (risk === "danger") return "高风险";
  if (risk === "warning") return "需关注";
  return "正常";
}

function cycleLabel(cycle: SubscriptionOperationDetailRecord["cycleType"]) {
  if (cycle === "yearly") return "年付";
  if (cycle === "once") return "一次性";
  return "月付";
}

function associationSourceLabel(
  source: SubscriptionOperationDetailRecord["solutionAssociation"]["source"],
) {
  return source === "industry_rule" ? "运营规则关联" : "历史套餐兼容";
}

function capabilityTypeLabel(type: ProductSolutionCapabilityType) {
  if (type === "platform") return "平台";
  if (type === "agent") return "智能体";
  if (type === "model") return "模型";
  if (type === "data") return "数据";
  return "服务";
}

function capabilityTypeIcon(type: ProductSolutionCapabilityType): IconName {
  if (type === "platform") return "database";
  if (type === "agent") return "agent";
  if (type === "model") return "cloud";
  if (type === "data") return "table";
  return "server";
}

function SectionHeading({ icon, title }: { icon: IconName; title: string }) {
  return <DetailSectionHeading icon={icon} title={title} />;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="vx-product-capability-field">
      <span>{label}</span>
      <strong>{value || "未设置"}</strong>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  tag,
}: {
  label: string;
  value: string;
  tag?: string;
}) {
  return (
    <div className="vx-product-capability-metric">
      <span>{label}</span>
      <p>
        <strong>{value}</strong>
        {tag ? <em>{tag}</em> : null}
      </p>
    </div>
  );
}

function SubscriptionSummary({
  subscription,
}: {
  subscription: SubscriptionOperationDetailRecord;
}) {
  return (
    <section className="vx-product-capability-summary">
      <div className="vx-product-capability-summary__identity">
        <span
          className="vx-product-capability-summary__icon"
          aria-hidden="true"
        >
          <Icon name="star" size="lg" fallback="placeholder" />
        </span>
        <div>
          <h2>
            {subscription.tenantName} / {subscription.tierName}
          </h2>
          <p>{subscription.subscriptionCode}</p>
          <div className="vx-product-capability-summary__badges">
            <Badge
              className={`vx-tenant-pill vx-subscription-pill--${subscription.status}`}
            >
              {subscriptionStatusLabel(subscription.status)}
            </Badge>
            <Badge
              className={`vx-tenant-pill vx-subscription-pill--quota-${subscription.quota.risk}`}
            >
              {quotaRiskLabel(subscription.quota.risk)}
            </Badge>
          </div>
        </div>
      </div>
      <div className="vx-product-capability-summary__metrics">
        <DetailMetric
          label="业务方案"
          value={subscription.solutionAssociation.solutionName}
          tag={associationSourceLabel(subscription.solutionAssociation.source)}
        />
        <DetailMetric
          label="月收入"
          value={formatMoney(subscription.monthlyRevenue)}
          tag={cycleLabel(subscription.cycleType)}
        />
        <DetailMetric
          label="配额消耗"
          value={`${formatNumber(subscription.quota.usageRate)}%`}
          tag={`${formatNumber(subscription.quota.maxUsers)} 席位`}
        />
        <DetailMetric
          label="运营动作"
          value={subscription.operationHint}
          tag={subscription.autoRenew ? "自动续期" : "人工跟进"}
        />
      </div>
    </section>
  );
}

function SubscriptionDetails({
  subscription,
}: {
  subscription: SubscriptionOperationDetailRecord;
}) {
  const servicePlanHref = subscription.solutionAssociation.solutionCode
    ? `/service-plans/${encodeURIComponent(subscription.solutionAssociation.solutionCode)}/${encodeURIComponent(subscription.solutionAssociation.tierCode)}`
    : null;

  return (
    <section
      className="vx-product-capability-detail"
      aria-label={`${subscription.tenantName} 订阅详情`}
    >
      <section className="vx-product-capability-section">
        <SectionHeading icon="database" title="基础资料" />
        <div className="vx-product-capability-fields">
          <DetailField label="订阅编码" value={subscription.subscriptionCode} />
          <DetailField
            label="订单编号"
            value={subscription.orderNo ?? "未设置"}
          />
          <DetailField label="租户" value={subscription.tenantName} />
          <DetailField
            label="租户类型"
            value={typeLabel(subscription.tenantType)}
          />
          <DetailField
            label="订阅状态"
            value={subscriptionStatusLabel(subscription.status)}
          />
          <DetailField
            label="计费周期"
            value={cycleLabel(subscription.cycleType)}
          />
          <DetailField
            label="自动续期"
            value={subscription.autoRenew ? "是" : "否"}
          />
          <DetailField label="运营创建人" value={subscription.operatorName} />
          <DetailField
            label="开通时间"
            value={formatDate(subscription.startAt)}
          />
          <DetailField
            label="到期时间"
            value={formatDate(subscription.endAt)}
          />
          <DetailField
            label="试用结束"
            value={formatDate(subscription.trialEndAt)}
          />
          <DetailField
            label="更新时间"
            value={formatDate(subscription.updatedAt)}
          />
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="workflow" title="业务方案关联" />
        <div className="vx-product-capability-fields">
          <DetailField
            label="业务方案"
            value={subscription.solutionAssociation.solutionName}
          />
          <DetailField
            label="方案编码"
            value={
              subscription.solutionAssociation.solutionCode ?? "未显式绑定"
            }
          />
          <DetailField
            label="套餐层级"
            value={subscription.solutionAssociation.tierName}
          />
          <DetailField
            label="关联来源"
            value={associationSourceLabel(
              subscription.solutionAssociation.source,
            )}
          />
        </div>
        <div className="vx-product-capability-description">
          <p>{subscription.solutionAssociation.note}</p>
        </div>
        <div className="vx-product-capability-actions vx-subscription-detail-links">
          {subscription.solutionAssociation.solutionCode ? (
            <Button asChild variant="outline">
              <Link
                href={`/product-solutions/${encodeURIComponent(subscription.solutionAssociation.solutionCode)}`}
              >
                <Icon name="workflow" size="xs" fallback="placeholder" />
                业务方案
              </Link>
            </Button>
          ) : null}
          {servicePlanHref ? (
            <Button asChild variant="outline">
              <Link href={servicePlanHref}>
                <Icon name="star" size="xs" fallback="placeholder" />
                服务套餐
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="cube" title="权益快照" />
        <div className="vx-product-detail-list vx-product-detail-list--entitlements">
          {subscription.entitlementSnapshot.map((item) => (
            <div key={item.productCode} className="vx-product-detail-list__row">
              <span>
                <Icon
                  name={capabilityTypeIcon(item.productType)}
                  size="sm"
                  fallback="placeholder"
                />
                <strong>{item.productName}</strong>
              </span>
              <small>
                {capabilityTypeLabel(item.productType)} |{" "}
                {item.source === "self" ? "自建" : "三方"}
              </small>
              <em className={item.included ? "is-included" : "is-excluded"}>
                {item.included ? "包含" : "不包含"} | {item.quotaSummary}
              </em>
              <p>{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="chart-bar" title="配额快照" />
        <div className="vx-product-capability-fields">
          <DetailField
            label="最大席位"
            value={`${formatNumber(subscription.quota.maxUsers)} 人`}
          />
          <DetailField
            label="Token 配额"
            value={formatNumber(subscription.quota.periodTokens)}
          />
          <DetailField
            label="已消耗 Token"
            value={formatNumber(subscription.quota.usedTokens)}
          />
          <DetailField
            label="消耗比例"
            value={`${formatNumber(subscription.quota.usageRate)}%`}
          />
          <DetailField
            label="配额周期"
            value={cycleLabel(subscription.quota.quotaCycle)}
          />
          <DetailField
            label="允许模型"
            value={`${formatNumber(subscription.quota.allowedModelCount)} 个`}
          />
          <DetailField
            label="自定义模型"
            value={subscription.quota.allowCustomModel ? "允许" : "不允许"}
          />
          <DetailField
            label="配额风险"
            value={quotaRiskLabel(subscription.quota.risk)}
          />
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="clock" title="运营记录" />
        <div className="vx-subscription-timeline">
          {subscription.operationTimeline.map((event) => (
            <article
              key={event.id}
              className={`vx-subscription-timeline__item vx-subscription-timeline__item--${event.tone}`}
            >
              <span aria-hidden="true">
                <Icon
                  name={
                    event.tone === "danger"
                      ? "warning"
                      : event.tone === "success"
                        ? "check"
                        : "info"
                  }
                  size="xs"
                  fallback="placeholder"
                />
              </span>
              <div>
                <strong>{event.title}</strong>
                <p>{event.description}</p>
                <small>
                  {event.actor} · {formatDate(event.at)}
                </small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export function SubscriptionDetailPage({
  subscriptionId,
}: {
  subscriptionId: string;
}) {
  const [subscription, setSubscription] =
    useState<SubscriptionOperationDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] =
    useState<SubscriptionOperationAction | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationFeedback, setOperationFeedback] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchSubscriptionOperation(subscriptionId)
      .then((record) => {
        if (active) setSubscription(record);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [subscriptionId]);

  function requestSubscriptionAction(action: SubscriptionOperationAction) {
    setOperationError(null);
    setOperationFeedback(null);
    setPendingAction(action);
  }

  async function handleSubmitSubscriptionAction(reason: string) {
    if (!subscription || !pendingAction) return;

    setSubmittingAction(true);
    setOperationError(null);

    try {
      const updatedSubscription = await submitSubscriptionOperation(
        subscription.id,
        {
          action: pendingAction,
          reason,
        },
      );

      setSubscription(updatedSubscription);
      setOperationFeedback(`${subscriptionActionLabel(pendingAction)}已完成。`);
      setPendingAction(null);
    } catch (error) {
      setOperationError(
        error instanceof Error ? error.message : "订阅操作失败，请稍后重试。",
      );
    } finally {
      setSubmittingAction(false);
    }
  }

  if (!loading && !subscription) {
    return (
      <div className="vx-page-stack vx-product-capability-page">
        <PageHeader
          icon="star"
          title="订阅详情"
          description="未找到对应的订阅实例。"
          action={
            <Button asChild variant="outline">
              <Link href="/subscriptions">
                <Icon name="arrow-left" size="xs" fallback="placeholder" />
                返回列表
              </Link>
            </Button>
          }
        />
        <EmptyState
          title="订阅实例不存在"
          description="该订阅可能已归档，或当前账号无权访问。"
        />
      </div>
    );
  }

  return (
    <div className="vx-page-stack vx-product-capability-page vx-subscription-detail-page">
      <PageHeader
        icon="star"
        title={
          subscription
            ? `${subscription.tenantName} / ${subscription.tierName}`
            : "订阅详情"
        }
        description={
          subscription?.solutionAssociation.note ?? "正在读取租户订阅权益实例。"
        }
        action={
          <div className="vx-product-capability-actions">
            <Button asChild variant="outline">
              <Link href="/subscriptions">
                <Icon name="arrow-left" size="xs" fallback="placeholder" />
                返回列表
              </Link>
            </Button>
            {subscription ? (
              <Button asChild variant="outline">
                <Link
                  href={`/tenants/${encodeURIComponent(subscription.tenantId)}`}
                >
                  <Icon name="buildings" size="xs" fallback="placeholder" />
                  租户详情
                </Link>
              </Button>
            ) : null}
            {subscription ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => requestSubscriptionAction("renew")}
                  disabled={!canRunSubscriptionAction("renew", subscription)}
                  title={
                    subscriptionActionDisabledReason("renew", subscription) ??
                    undefined
                  }
                >
                  <Icon
                    name={subscriptionActionIcon("renew")}
                    size="xs"
                    fallback="placeholder"
                  />
                  {subscriptionActionLabel("renew")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    requestSubscriptionAction(
                      subscriptionToggleAction(subscription.status),
                    )
                  }
                  disabled={
                    !canRunSubscriptionAction(
                      subscriptionToggleAction(subscription.status),
                      subscription,
                    )
                  }
                  title={
                    subscriptionActionDisabledReason(
                      subscriptionToggleAction(subscription.status),
                      subscription,
                    ) ?? undefined
                  }
                >
                  <Icon
                    name={subscriptionActionIcon(
                      subscriptionToggleAction(subscription.status),
                    )}
                    size="xs"
                    fallback="placeholder"
                  />
                  {subscriptionActionLabel(
                    subscriptionToggleAction(subscription.status),
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="vx-subscription-action-button--danger"
                  onClick={() => requestSubscriptionAction("cancel")}
                  disabled={!canRunSubscriptionAction("cancel", subscription)}
                  title={
                    subscriptionActionDisabledReason("cancel", subscription) ??
                    undefined
                  }
                >
                  <Icon
                    name={subscriptionActionIcon("cancel")}
                    size="xs"
                    fallback="placeholder"
                  />
                  {subscriptionActionLabel("cancel")}
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {operationFeedback ? (
        <div className="vx-subscription-operation-feedback">
          {operationFeedback}
        </div>
      ) : null}

      {subscription ? (
        <>
          <SubscriptionSummary subscription={subscription} />
          <SubscriptionDetails subscription={subscription} />
        </>
      ) : (
        <section className="vx-tenant-directory__header">
          <span>读取中</span>
        </section>
      )}

      {subscription && pendingAction ? (
        <SubscriptionOperationDialog
          action={pendingAction}
          subscriptionName={`${subscription.tenantName} / ${subscription.tierName}`}
          busy={submittingAction}
          error={operationError}
          onCancel={() => {
            if (!submittingAction) setPendingAction(null);
          }}
          onSubmit={handleSubmitSubscriptionAction}
        />
      ) : null}
    </div>
  );
}
