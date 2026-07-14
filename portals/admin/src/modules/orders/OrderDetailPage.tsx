"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, Badge, Button, EmptyState } from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import {
  confirmOrderOfflinePayment,
  fetchOrderOperation,
} from "@/api/admin-bff";
import type {
  OrderOperationDetailRecord,
  OrderOperationStatus,
  OrderPaymentStatus,
  OrderPaySource,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { DetailSectionHeading } from "@/modules/shared/DetailSectionHeading";
import {
  canConfirmOrderOfflinePayment,
  confirmOfflinePaymentDisabledReason,
  OrderOfflinePaymentDialog,
} from "@/modules/orders/OrderOfflinePaymentDialog";
import {
  formatDate,
  formatNumber,
  typeLabel,
} from "@/modules/tenants/tenant-utils";
import { useStepUp, isStepUpCancelled } from "@/providers/StepUpProvider";

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: currency || "CNY",
    maximumFractionDigits: 2,
  }).format(value);
}

function cycleLabel(cycle: OrderOperationDetailRecord["cycleType"]) {
  if (cycle === "yearly") return "年付";
  if (cycle === "once") return "一次性";
  return "月付";
}

function orderStatusLabel(status: OrderOperationStatus) {
  if (status === "pending") return "待付款";
  if (status === "pending_verify") return "待复核";
  if (status === "confirmed") return "已确认";
  if (status === "overdue") return "逾期";
  if (status === "closed") return "已关闭";
  return "异常";
}

function paymentStatusLabel(status: OrderPaymentStatus) {
  if (status === "not_required") return "无需支付";
  if (status === "unpaid") return "未支付";
  if (status === "pending") return "支付中";
  if (status === "pending_verify") return "线下待核";
  if (status === "paid") return "已支付";
  if (status === "partial") return "部分支付";
  if (status === "failed") return "支付失败";
  if (status === "closed") return "已关闭";
  return "退款中";
}

function paySourceLabel(source: OrderPaySource) {
  if (source === "online") return "线上";
  if (source === "offline") return "线下";
  return "无";
}

function subscriptionStatusLabel(
  status: OrderOperationDetailRecord["subscriptionStatus"],
) {
  if (status === "trial") return "试用";
  if (status === "active") return "已生效";
  if (status === "expiring") return "即将到期";
  if (status === "overdue") return "逾期";
  if (status === "suspended") return "暂停";
  return "已取消";
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

function OrderSummary({ order }: { order: OrderOperationDetailRecord }) {
  return (
    <section className="vx-product-capability-summary">
      <div className="vx-product-capability-summary__identity">
        <span
          className="vx-product-capability-summary__icon"
          aria-hidden="true"
        >
          <Icon name="table" size="lg" fallback="placeholder" />
        </span>
        <div>
          <h2>{order.orderNo}</h2>
          <p>
            {order.tenantName} / {order.tierName}
          </p>
          <div className="vx-product-capability-summary__badges">
            <Badge
              className={`vx-tenant-pill vx-order-pill--${order.orderStatus}`}
            >
              {orderStatusLabel(order.orderStatus)}
            </Badge>
            <Badge
              className={`vx-tenant-pill vx-order-pill--payment-${order.paymentStatus}`}
            >
              {paymentStatusLabel(order.paymentStatus)}
            </Badge>
          </div>
        </div>
      </div>
      <div className="vx-product-capability-summary__metrics">
        <DetailMetric
          label="订单金额"
          value={formatCurrency(order.amount, order.currency)}
          tag={cycleLabel(order.cycleType)}
        />
        <DetailMetric
          label="已收金额"
          value={formatCurrency(order.paidAmount, order.currency)}
          tag={paySourceLabel(order.paySource)}
        />
        <DetailMetric
          label="业务方案"
          value={order.solutionName}
          tag={order.servicePlanName}
        />
        <DetailMetric
          label="运营动作"
          value={order.operationHint}
          tag={order.operatorName}
        />
      </div>
    </section>
  );
}

function OrderDetails({ order }: { order: OrderOperationDetailRecord }) {
  return (
    <section
      className="vx-product-capability-detail"
      aria-label={`${order.orderNo} 订单详情`}
    >
      <section className="vx-product-capability-section">
        <SectionHeading icon="table" title="基础资料" />
        <div className="vx-product-capability-fields">
          <DetailField label="订单编号" value={order.orderNo} />
          <DetailField
            label="订单状态"
            value={orderStatusLabel(order.orderStatus)}
          />
          <DetailField
            label="支付状态"
            value={paymentStatusLabel(order.paymentStatus)}
          />
          <DetailField
            label="支付来源"
            value={paySourceLabel(order.paySource)}
          />
          <DetailField label="支付方式" value={order.payMethod ?? "未设置"} />
          <DetailField label="创建时间" value={formatDate(order.createdAt)} />
          <DetailField label="确认时间" value={formatDate(order.confirmedAt)} />
          <DetailField label="更新时间" value={formatDate(order.updatedAt)} />
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="buildings" title="租户与套餐" />
        <div className="vx-product-capability-fields">
          <DetailField label="租户" value={order.tenantName} />
          <DetailField label="租户编码" value={order.tenantCode} />
          <DetailField label="租户类型" value={typeLabel(order.tenantType)} />
          <DetailField label="所属区域" value={order.region} />
          <DetailField label="所属行业" value={order.industry} />
          <DetailField label="业务方案" value={order.solutionName} />
          <DetailField label="服务套餐" value={order.servicePlanName} />
          <DetailField label="套餐层级" value={order.tierName} />
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="star" title="关联订阅" />
        <div className="vx-product-capability-fields">
          <DetailField label="订阅 ID" value={order.subscriptionId} />
          <DetailField
            label="订阅状态"
            value={subscriptionStatusLabel(order.subscriptionStatus)}
          />
          <DetailField label="计费周期" value={cycleLabel(order.cycleType)} />
        </div>
        <div className="vx-product-capability-actions vx-subscription-detail-links">
          <Button asChild variant="outline">
            <Link
              href={`/subscriptions/${encodeURIComponent(order.subscriptionId)}`}
            >
              <Icon name="star" size="xs" fallback="placeholder" />
              订阅详情
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/tenants/${encodeURIComponent(order.tenantId)}`}>
              <Icon name="buildings" size="xs" fallback="placeholder" />
              租户详情
            </Link>
          </Button>
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="key" title="账单与收款" />
        <div className="vx-product-capability-fields">
          <DetailField label="账单编号" value={order.billNo ?? "未生成"} />
          <DetailField label="账单状态" value={order.billStatus ?? "未生成"} />
          <DetailField label="支付单号" value={order.paymentNo ?? "未生成"} />
          <DetailField
            label="订单金额"
            value={formatCurrency(order.amount, order.currency)}
          />
          <DetailField
            label="已收金额"
            value={formatCurrency(order.paidAmount, order.currency)}
          />
          <DetailField
            label="剩余应收"
            value={formatCurrency(
              Math.max(0, order.amount - order.paidAmount),
              order.currency,
            )}
          />
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="list" title="账单明细" />
        <div className="vx-product-detail-list vx-product-detail-list--entitlements">
          {order.invoiceItems.map((item) => (
            <div key={item.id} className="vx-product-detail-list__row">
              <span>
                <Icon name="table" size="sm" fallback="placeholder" />
                <strong>{item.itemName}</strong>
              </span>
              <small>
                {item.itemType} | {formatNumber(item.quantity)}{" "}
                {item.itemUnit ?? ""}
              </small>
              <em>{formatCurrency(item.totalAmount, order.currency)}</em>
              <p>
                {item.remark ??
                  `单价 ${formatCurrency(item.unitPrice, order.currency)}`}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="check" title="支付记录" />
        <div className="vx-product-detail-list vx-product-detail-list--entitlements">
          {order.paymentRecords.length ? (
            order.paymentRecords.map((payment) => (
              <div key={payment.id} className="vx-product-detail-list__row">
                <span>
                  <Icon name="check" size="sm" fallback="placeholder" />
                  <strong>{payment.paymentNo}</strong>
                </span>
                <small>
                  {paySourceLabel(payment.paySource)} |{" "}
                  {paymentStatusLabel(payment.paymentStatus)} |{" "}
                  {formatDate(payment.paidAt)}
                </small>
                <em>{formatCurrency(payment.paidAmount, payment.currency)}</em>
                <p>{payment.remark ?? payment.operatorName}</p>
              </div>
            ))
          ) : (
            <div className="vx-product-detail-list__row">
              <span>
                <Icon name="clock" size="sm" fallback="placeholder" />
                <strong>暂无支付记录</strong>
              </span>
              <small>等待线上支付或运营确认线下收款</small>
              <em>未收款</em>
              <p>确认线下收款后会自动写入支付记录。</p>
            </div>
          )}
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="clock" title="运营记录" />
        <div className="vx-subscription-timeline">
          {order.operationTimeline.map((event) => (
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

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const { runWithStepUp } = useStepUp();
  const [order, setOrder] = useState<OrderOperationDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationFeedback, setOperationFeedback] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchOrderOperation(orderId)
      .then((record) => {
        if (active) setOrder(record);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  async function handleConfirmOfflinePayment(
    payload: Parameters<typeof confirmOrderOfflinePayment>[1],
  ) {
    if (!order) return;

    setSubmittingPayment(true);
    setOperationError(null);

    try {
      // Offline payment confirmation is 危 commerce:payment.settle → step-up.
      const updatedOrder = await runWithStepUp(() =>
        confirmOrderOfflinePayment(order.id, payload),
      );
      setOrder(updatedOrder);
      setOperationFeedback("线下收款已确认。");
      setPaymentDialogOpen(false);
    } catch (error) {
      if (isStepUpCancelled(error)) return;
      setOperationError(
        error instanceof Error
          ? error.message
          : "确认线下收款失败，请稍后重试。",
      );
    } finally {
      setSubmittingPayment(false);
    }
  }

  if (!loading && !order) {
    return (
      <div className="vx-page-stack vx-product-capability-page">
        <PageHeader
          icon="table"
          title="订单详情"
          description="未找到对应的订单记录。"
          action={
            <Button asChild variant="outline">
              <Link href="/orders">
                <Icon name="arrow-left" size="xs" fallback="placeholder" />
                返回列表
              </Link>
            </Button>
          }
        />
        <EmptyState
          title="订单不存在"
          description="该订单可能已归档，或当前账号无权访问。"
        />
      </div>
    );
  }

  return (
    <div className="vx-page-stack vx-product-capability-page vx-order-detail-page">
      <PageHeader
        icon="table"
        title={order ? order.orderNo : "订单详情"}
        description={
          order
            ? `${order.tenantName} · ${order.solutionName} · ${order.servicePlanName}`
            : "正在读取订单、账单和支付记录。"
        }
        action={
          <div className="vx-product-capability-actions">
            <Button asChild variant="outline">
              <Link href="/orders">
                <Icon name="arrow-left" size="xs" fallback="placeholder" />
                返回列表
              </Link>
            </Button>
            {order ? (
              <>
                <Button asChild variant="outline">
                  <Link
                    href={`/subscriptions/${encodeURIComponent(order.subscriptionId)}`}
                  >
                    <Icon name="star" size="xs" fallback="placeholder" />
                    订阅详情
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOperationError(null);
                    setOperationFeedback(null);
                    setPaymentDialogOpen(true);
                  }}
                  disabled={!canConfirmOrderOfflinePayment(order)}
                  title={
                    confirmOfflinePaymentDisabledReason(order) ?? undefined
                  }
                >
                  <Icon name="check" size="xs" fallback="placeholder" />
                  确认收款
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

      {order ? (
        <>
          <OrderSummary order={order} />
          <OrderDetails order={order} />
        </>
      ) : (
        <section className="vx-tenant-directory__header">
          <span>读取中</span>
        </section>
      )}

      {order && paymentDialogOpen ? (
        <OrderOfflinePaymentDialog
          order={order}
          busy={submittingPayment}
          error={operationError}
          onCancel={() => {
            if (!submittingPayment) setPaymentDialogOpen(false);
          }}
          onSubmit={handleConfirmOfflinePayment}
        />
      ) : null}
    </div>
  );
}
