"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, Badge, Button, EmptyState } from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import { fetchProductSolution } from "@/api/admin-bff";
import type {
  ProductSolutionCapabilitySource,
  ProductSolutionCapabilityType,
  ProductSolutionDetailRecord,
  ProductSolutionStatus,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { DetailSectionHeading } from "@/modules/shared/DetailSectionHeading";
import {
  formatDate,
  formatMoney,
  formatNumber,
} from "@/modules/tenants/tenant-utils";

function solutionStatusLabel(status: ProductSolutionStatus) {
  if (status === "active") return "启用";
  if (status === "draft") return "草稿";
  return "归档";
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

function sourceLabel(source: ProductSolutionCapabilitySource) {
  return source === "self" ? "自建" : "三方";
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

function ProductSolutionSummary({
  solution,
}: {
  solution: ProductSolutionDetailRecord;
}) {
  return (
    <section className="vx-product-capability-summary">
      <div className="vx-product-capability-summary__identity">
        <span
          className="vx-product-capability-summary__icon"
          aria-hidden="true"
        >
          <Icon name="workflow" size="lg" fallback="placeholder" />
        </span>
        <div>
          <h2>{solution.solutionName}</h2>
          <p>{solution.solutionCode}</p>
          <div className="vx-product-capability-summary__badges">
            <Badge
              className={`vx-tenant-pill vx-product-solution-pill--${solution.status}`}
            >
              {solutionStatusLabel(solution.status)}
            </Badge>
            <Badge
              className={`vx-tenant-pill vx-product-solution-pill--${solution.visibility}`}
            >
              {solution.visibility === "public" ? "公开" : "内部"}
            </Badge>
          </div>
        </div>
      </div>
      <div className="vx-product-capability-summary__metrics">
        <DetailMetric
          label="产品能力"
          value={formatNumber(solution.products.length)}
          tag={`三方 ${formatNumber(solution.products.filter((item) => item.source === "partner").length)}`}
        />
        <DetailMetric
          label="服务套餐"
          value={formatNumber(solution.tiers.length)}
          tag={solution.tiers.map((tier) => tier.tierName).join(" | ")}
        />
        <DetailMetric
          label="订阅使用"
          value={formatNumber(solution.subscriptionCount)}
          tag={`活跃 ${formatNumber(solution.activeTenantCount)}`}
        />
        <DetailMetric
          label="月度收入"
          value={formatMoney(solution.monthlyRevenue)}
          tag="方案口径"
        />
      </div>
    </section>
  );
}

function ProductSolutionDetails({
  solution,
}: {
  solution: ProductSolutionDetailRecord;
}) {
  return (
    <section
      className="vx-product-capability-detail"
      aria-label={`${solution.solutionName} 详情`}
    >
      <section className="vx-product-capability-section">
        <SectionHeading icon="database" title="基础资料" />
        <div className="vx-product-capability-fields">
          <DetailField label="方案编码" value={solution.solutionCode} />
          <DetailField label="方案名称" value={solution.solutionName} />
          <DetailField
            label="方案状态"
            value={solutionStatusLabel(solution.status)}
          />
          <DetailField
            label="可见范围"
            value={solution.visibility === "public" ? "公开" : "内部"}
          />
          <DetailField label="负责团队" value={solution.ownerTeam} />
          <DetailField
            label="创建时间"
            value={formatDate(solution.createdAt)}
          />
          <DetailField
            label="更新时间"
            value={formatDate(solution.updatedAt)}
          />
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="map-pin" title="适用行业" />
        <div className="vx-product-capability-fields">
          <DetailField label="行业领域" value={solution.industry} />
          <DetailField label="业务场景" value={solution.scenario} />
          <DetailField label="客户群体" value={solution.customerSegment} />
          <DetailField label="交付模式" value={solution.deliveryMode} />
        </div>
        <div className="vx-product-capability-description">
          <strong>{solution.description}</strong>
        </div>
        <div className="vx-product-capability-tags">
          {solution.tags.map((tag) => (
            <Badge
              key={tag}
              className="vx-tenant-pill vx-product-capability-pill--tag"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="cube" title="包含产品能力" />
        <div className="vx-product-detail-list">
          {solution.products.map((product) => (
            <Link
              key={product.productCode}
              href={`/products/${encodeURIComponent(product.productCode)}`}
              className="vx-product-detail-list__row"
            >
              <span>
                <Icon
                  name={capabilityTypeIcon(product.productType)}
                  size="sm"
                  fallback="placeholder"
                />
                <strong>{product.productName}</strong>
              </span>
              <small>{product.productCode}</small>
              <em>
                {capabilityTypeLabel(product.productType)} |{" "}
                {sourceLabel(product.source)}
              </em>
              <p>{product.role}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="shield-check" title="交付边界" />
        <div className="vx-product-detail-notes">
          {solution.deliveryBoundaries.map((item) => (
            <article key={item}>
              <Icon name="check" size="xs" fallback="placeholder" />
              <span>{item}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="vx-product-capability-section">
        <SectionHeading icon="star" title="关联服务套餐" />
        <div className="vx-product-detail-list">
          {solution.relatedServicePlans.map((plan) => (
            <Link
              key={plan.tierCode}
              href={`/service-plans/${encodeURIComponent(solution.solutionCode)}/${encodeURIComponent(plan.tierCode)}`}
              className="vx-product-detail-list__row"
            >
              <span>
                <Icon name="star" size="sm" fallback="placeholder" />
                <strong>{plan.tierName}</strong>
              </span>
              <small>{plan.tierCode}</small>
              <em>{plan.priceLabel}</em>
              <p>{plan.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}

export function ProductSolutionDetailPage({
  solutionCode,
}: {
  solutionCode: string;
}) {
  const [solution, setSolution] = useState<ProductSolutionDetailRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchProductSolution(solutionCode)
      .then((record) => {
        if (!active) return;
        setSolution(record);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [solutionCode]);

  if (!loading && !solution) {
    return (
      <div className="vx-page-stack vx-product-capability-page">
        <PageHeader
          icon="workflow"
          title="解决方案详情"
          description="未找到对应的解决方案。"
          action={
            <Button asChild variant="outline">
              <Link href="/product-solutions">
                <Icon name="arrow-left" size="xs" fallback="placeholder" />
                返回列表
              </Link>
            </Button>
          }
        />
        <EmptyState
          title="解决方案不存在"
          description="该方案可能已归档，或当前账号无权访问。"
        />
      </div>
    );
  }

  return (
    <div className="vx-page-stack vx-product-capability-page">
      <PageHeader
        icon="workflow"
        title={solution?.solutionName ?? "解决方案详情"}
        description={solution?.description ?? "正在读取解决方案详情。"}
        action={
          <div className="vx-product-capability-actions">
            <Button asChild variant="outline">
              <Link href="/product-solutions">
                <Icon name="arrow-left" size="xs" fallback="placeholder" />
                返回列表
              </Link>
            </Button>
            <Button variant="outline" disabled>
              <Icon name="edit" size="xs" fallback="placeholder" />
              修改
            </Button>
          </div>
        }
      />

      {solution ? (
        <>
          <ProductSolutionSummary solution={solution} />
          <ProductSolutionDetails solution={solution} />
        </>
      ) : (
        <section className="vx-tenant-directory__header">
          <span>读取中</span>
        </section>
      )}
    </div>
  );
}
