"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, Badge, Button, EmptyState } from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import { fetchProductServicePlan } from "@/api/admin-bff";
import type {
  ProductServicePlanDetailRecord,
  ProductSolutionCapabilityType,
  ProductSolutionStatus,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { DetailSectionHeading } from "@/modules/shared/DetailSectionHeading";
import { formatDate, formatNumber } from "@/modules/tenants/tenant-utils";

function statusLabel(status: ProductSolutionStatus) {
  if (status === "active") return "启用";
  if (status === "draft") return "草稿";
  return "归档";
}

function capabilityTypeIcon(type: ProductSolutionCapabilityType): IconName {
  if (type === "platform") return "database";
  if (type === "agent") return "agent";
  if (type === "model") return "cloud";
  if (type === "data") return "table";
  return "server";
}

function capabilityTypeLabel(type: ProductSolutionCapabilityType) {
  if (type === "platform") return "平台";
  if (type === "agent") return "智能体";
  if (type === "model") return "模型";
  if (type === "data") return "数据";
  return "服务";
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

function ServicePlanSummary({
  plan,
}: {
  plan: ProductServicePlanDetailRecord;
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
            {plan.solutionName} / {plan.tierName}
          </h2>
          <p>
            {plan.solutionCode} · {plan.tierCode}
          </p>
          <div className="vx-product-capability-summary__badges">
            <Badge
              className={`vx-tenant-pill vx-service-plan-pill--${plan.status}`}
            >
              {statusLabel(plan.status)}
            </Badge>
            <Badge
              className={`vx-tenant-pill vx-service-plan-pill--${plan.isPublic ? "public" : "internal"}`}
            >
              {plan.isPublic ? "公开" : "内部"}
            </Badge>
          </div>
        </div>
      </div>
      <div className="vx-product-capability-summary__metrics">
        <DetailMetric
          label="价格"
          value={plan.price.priceLabel}
          tag={plan.price.periodType === "contract" ? "专属商务" : "标准价格"}
        />
        <DetailMetric
          label="包含产品"
          value={formatNumber(plan.includedProductCount)}
          tag={`不含 ${formatNumber(plan.excludedProductCount)}`}
        />
        <DetailMetric
          label="订阅使用"
          value={formatNumber(plan.subscriptionCount)}
          tag={`活跃 ${formatNumber(plan.activeTenantCount)}`}
        />
        <DetailMetric
          label="适用范围"
          value={formatNumber(plan.applicableScope.length)}
          tag={plan.industry}
        />
      </div>
    </section>
  );
}

function ServicePlanDetails({
  plan,
}: {
  plan: ProductServicePlanDetailRecord;
}) {
  return (
    <section
      className="vx-product-capability-detail"
      aria-label={`${plan.solutionName} ${plan.tierName} 详情`}
    >
      <section className="vx-product-capability-section">
        <SectionHeading icon="database" title="基础资料" />
        <div className="vx-product-capability-fields">
          <DetailField label="业务方案" value={plan.solutionName} />
          <DetailField label="方案编码" value={plan.solutionCode} />
          <DetailField label="套餐版本" value={plan.tierName} />
          <DetailField label="版本编码" value={plan.tierCode} />
          <DetailField label="套餐状态" value={statusLabel(plan.status)} />
          <DetailField
            label="可见范围"
            value={plan.isPublic ? "公开" : "内部"}
          />
          <DetailField label="负责团队" value={plan.ownerTeam} />
          <DetailField label="更新时间" value={formatDate(plan.updatedAt)} />
        </div>
        <div className="vx-product-capability-description">
          <strong>{plan.summary}</strong>
          <p>{plan.deliveryMode}</p>
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="chart-bar" title="配额价格" />
        <div className="vx-product-capability-fields">
          <DetailField label="价格" value={plan.price.priceLabel} />
          <DetailField label="币种" value={plan.price.currency} />
          <DetailField
            label="周期"
            value={
              plan.price.periodType === "contract"
                ? "合同约定"
                : plan.price.periodType === "yearly"
                  ? "年付"
                  : "月付"
            }
          />
          <DetailField
            label="订阅数量"
            value={`${formatNumber(plan.subscriptionCount)} 个`}
          />
          <DetailField
            label="活跃租户"
            value={`${formatNumber(plan.activeTenantCount)} 个`}
          />
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="cube" title="包含 / 不包含产品" />
        <div className="vx-product-detail-list vx-product-detail-list--entitlements">
          {plan.entitlements.map((item) => (
            <Link
              key={item.productCode}
              href={`/products/${encodeURIComponent(item.productCode)}`}
              className="vx-product-detail-list__row"
            >
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
            </Link>
          ))}
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="map-pin" title="适用范围" />
        <div className="vx-product-detail-notes">
          {plan.applicableScope.map((item) => (
            <article key={item}>
              <Icon name="check" size="xs" fallback="placeholder" />
              <span>{item}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="shield-check" title="售卖状态" />
        <div className="vx-product-capability-fields">
          <DetailField label="售卖状态" value={statusLabel(plan.status)} />
          <DetailField label="公开售卖" value={plan.isPublic ? "是" : "否"} />
          <DetailField label="客户群体" value={plan.customerSegment} />
          <DetailField label="业务场景" value={plan.scenario} />
        </div>
        <div className="vx-product-detail-notes">
          {plan.salesNotes.map((item) => (
            <article key={item}>
              <Icon name="info" size="xs" fallback="placeholder" />
              <span>{item}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export function ServicePlanDetailPage({
  solutionCode,
  tierCode,
}: {
  solutionCode: string;
  tierCode: string;
}) {
  const [plan, setPlan] = useState<ProductServicePlanDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchProductServicePlan(solutionCode, tierCode)
      .then((record) => {
        if (!active) return;
        setPlan(record);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [solutionCode, tierCode]);

  if (!loading && !plan) {
    return (
      <div className="vx-page-stack vx-product-capability-page">
        <PageHeader
          icon="star"
          title="服务套餐详情"
          description="未找到对应的服务套餐。"
          action={
            <Button asChild variant="outline">
              <Link href="/service-plans">
                <Icon name="arrow-left" size="xs" fallback="placeholder" />
                返回列表
              </Link>
            </Button>
          }
        />
        <EmptyState
          title="服务套餐不存在"
          description="该套餐可能已归档，或当前账号无权访问。"
        />
      </div>
    );
  }

  return (
    <div className="vx-page-stack vx-product-capability-page">
      <PageHeader
        icon="star"
        title={
          plan ? `${plan.solutionName} / ${plan.tierName}` : "服务套餐详情"
        }
        description={plan?.summary ?? "正在读取服务套餐详情。"}
        action={
          <div className="vx-product-capability-actions">
            <Button asChild variant="outline">
              <Link href="/service-plans">
                <Icon name="arrow-left" size="xs" fallback="placeholder" />
                返回列表
              </Link>
            </Button>
            {plan ? (
              <Button asChild variant="outline">
                <Link
                  href={`/product-solutions/${encodeURIComponent(plan.solutionCode)}`}
                >
                  <Icon name="workflow" size="xs" fallback="placeholder" />
                  业务方案
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" disabled>
              <Icon name="edit" size="xs" fallback="placeholder" />
              修改
            </Button>
          </div>
        }
      />

      {plan ? (
        <>
          <ServicePlanSummary plan={plan} />
          <ServicePlanDetails plan={plan} />
        </>
      ) : (
        <section className="vx-tenant-directory__header">
          <span>读取中</span>
        </section>
      )}
    </div>
  );
}
