"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon, Badge, Button, EmptyState } from "@vxture/design-system";
import type { IconName } from "@vxture/design-system";
import { fetchProductCapability } from "@/api/admin-bff";
import type {
  ProductCapabilityHealthStatus,
  ProductCapabilityIntegrationStatus,
  ProductCapabilityRecord,
  ProductCapabilitySource,
  ProductCapabilityStatus,
  ProductCapabilityType,
} from "@/entities/console";
import { PageHeader } from "@/modules/shared/PageHeader";
import { DetailSectionHeading } from "@/modules/shared/DetailSectionHeading";
import { formatDate, formatNumber } from "@/modules/tenants/tenant-utils";

function capabilityTypeLabel(type: ProductCapabilityType) {
  if (type === "platform") return "平台";
  if (type === "agent") return "智能体";
  if (type === "model") return "模型";
  if (type === "data") return "数据";
  return "服务";
}

function capabilityTypeIcon(type: ProductCapabilityType): IconName {
  if (type === "platform") return "database";
  if (type === "agent") return "agent";
  if (type === "model") return "cloud";
  if (type === "data") return "table";
  return "server";
}

function sourceLabel(source: ProductCapabilitySource) {
  return source === "self" ? "自建" : "三方接入";
}

function statusLabel(status: ProductCapabilityStatus) {
  if (status === "active") return "已上线";
  if (status === "draft") return "草稿";
  return "已归档";
}

function integrationStatusLabel(status: ProductCapabilityIntegrationStatus) {
  if (status === "connected") return "已接入";
  if (status === "testing") return "联调中";
  if (status === "config_required") return "待配置";
  return "无需接入";
}

function healthLabel(status: ProductCapabilityHealthStatus) {
  if (status === "normal") return "正常";
  if (status === "warning") return "需关注";
  return "不可用";
}

function regionLabel(region: ProductCapabilityRecord["region"]) {
  if (region === "domestic") return "国内";
  if (region === "international") return "国际";
  return "全局";
}

function ProductSectionHeading({
  icon,
  title,
}: {
  icon: IconName;
  title: string;
}) {
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

function ProductCapabilitySummary({
  product,
}: {
  product: ProductCapabilityRecord;
}) {
  return (
    <section className="vx-product-capability-summary">
      <div className="vx-product-capability-summary__identity">
        <span
          className="vx-product-capability-summary__icon"
          aria-hidden="true"
        >
          <Icon
            name={capabilityTypeIcon(product.productType)}
            size="lg"
            fallback="placeholder"
          />
        </span>
        <div>
          <h2>{product.productName}</h2>
          <p>{product.productCode}</p>
          <div className="vx-product-capability-summary__badges">
            <Badge
              className={`vx-tenant-pill vx-product-pill--${product.productType}`}
            >
              {capabilityTypeLabel(product.productType)}
            </Badge>
            <Badge
              className={`vx-tenant-pill vx-product-pill--${product.source}`}
            >
              {sourceLabel(product.source)}
            </Badge>
            <Badge
              className={`vx-tenant-pill vx-product-pill--${product.status}`}
            >
              {statusLabel(product.status)}
            </Badge>
          </div>
        </div>
      </div>
      <div className="vx-product-capability-summary__metrics">
        <DetailMetric
          label="业务方案"
          value={formatNumber(product.solutionCount)}
          tag={`${formatNumber(product.planCount)} 套餐`}
        />
        <DetailMetric
          label="接入状态"
          value={integrationStatusLabel(product.integration.status)}
          tag={product.integration.providerName}
        />
        <DetailMetric
          label="计量单位"
          value={product.meteringUnit}
          tag={product.billingMode}
        />
        <DetailMetric
          label="可用状态"
          value={healthLabel(product.healthStatus)}
          tag={`${formatNumber(product.modelPolicyCount)} 模型授权`}
        />
      </div>
    </section>
  );
}

function ProductCapabilityDetails({
  product,
}: {
  product: ProductCapabilityRecord;
}) {
  return (
    <section
      className="vx-product-capability-detail"
      aria-label={`${product.productName} 产品能力详情`}
    >
      <section className="vx-product-capability-section">
        <ProductSectionHeading icon="database" title="基础资料" />
        <div className="vx-product-capability-fields">
          <DetailField label="产品编码" value={product.productCode} />
          <DetailField label="产品名称" value={product.productName} />
          <DetailField
            label="产品类型"
            value={capabilityTypeLabel(product.productType)}
          />
          <DetailField label="产品来源" value={sourceLabel(product.source)} />
          <DetailField
            label="可见范围"
            value={product.visibility === "public" ? "公开" : "内部"}
          />
          <DetailField label="服务区域" value={regionLabel(product.region)} />
          <DetailField label="负责团队" value={product.ownerTeam} />
          <DetailField label="创建时间" value={formatDate(product.createdAt)} />
          <DetailField label="更新时间" value={formatDate(product.updatedAt)} />
        </div>
      </section>

      <section className="vx-product-capability-section">
        <ProductSectionHeading icon="sparkles" title="能力属性" />
        <div className="vx-product-capability-description">
          <strong>{product.capabilitySummary}</strong>
          <p>{product.description}</p>
        </div>
        <div className="vx-product-capability-tags">
          {product.accessModes.map((mode) => (
            <Badge
              key={mode}
              className="vx-tenant-pill vx-product-capability-pill--mode"
            >
              {mode}
            </Badge>
          ))}
          {product.tags.map((tag) => (
            <Badge
              key={tag}
              className="vx-tenant-pill vx-product-capability-pill--tag"
            >
              {tag}
            </Badge>
          ))}
        </div>
        <div className="vx-product-capability-related-list">
          {product.relatedSolutions.length ? (
            product.relatedSolutions.map((solution) => (
              <article key={`${solution.solutionCode}:${solution.role}`}>
                <strong>{solution.solutionName}</strong>
                <span>{solution.role}</span>
                <small>{solution.tierNames.join(" | ")}</small>
              </article>
            ))
          ) : (
            <article>
              <strong>暂未被业务方案引用</strong>
              <span>后续可在解决方案中配置。</span>
            </article>
          )}
        </div>
      </section>

      <section className="vx-product-capability-section">
        <ProductSectionHeading icon="api" title="接入配置" />
        <div className="vx-product-capability-fields">
          <DetailField
            label="供应商"
            value={product.integration.providerName}
          />
          <DetailField
            label="供应商类型"
            value={sourceLabel(product.integration.providerType)}
          />
          <DetailField
            label="接入状态"
            value={integrationStatusLabel(product.integration.status)}
          />
          <DetailField label="协议" value={product.integration.protocol} />
          <DetailField label="认证方式" value={product.integration.authMode} />
          <DetailField
            label="结算方式"
            value={product.integration.settlementMode ?? "无"}
          />
          <DetailField
            label="接口地址"
            value={product.integration.endpoint ?? "内部能力，无需外部接口"}
          />
          <DetailField
            label="最近检测"
            value={
              product.integration.lastCheckedAt
                ? formatDate(product.integration.lastCheckedAt)
                : "未检测"
            }
          />
        </div>
      </section>

      <section className="vx-product-capability-section">
        <ProductSectionHeading icon="chart-bar" title="计量配置" />
        <div className="vx-product-capability-fields vx-product-capability-fields--compact">
          <DetailField label="默认计量单位" value={product.meteringUnit} />
          <DetailField label="计费模式" value={product.billingMode} />
          <DetailField
            label="策略数量"
            value={`${formatNumber(product.modelPolicyCount)} 个`}
          />
        </div>
        <div className="vx-product-capability-metric-rules">
          {product.metrics.map((metric) => (
            <article key={metric.metricCode}>
              <strong>{metric.metricName}</strong>
              <span>{metric.metricCode}</span>
              <small>
                {metric.unit} | {metric.cycle} | {metric.quotaBase} |{" "}
                {metric.billingMode}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section className="vx-product-capability-section">
        <ProductSectionHeading icon="shield-check" title="可用状态" />
        <div className="vx-product-capability-fields">
          <DetailField label="能力状态" value={statusLabel(product.status)} />
          <DetailField
            label="健康状态"
            value={healthLabel(product.healthStatus)}
          />
          <DetailField
            label="发布数量"
            value={`${formatNumber(product.releaseCount)} 个`}
          />
          <DetailField
            label="方案复用"
            value={`${formatNumber(product.solutionCount)} 个`}
          />
        </div>
        <div className="vx-product-capability-related-list">
          {product.releases.length ? (
            product.releases.map((release) => (
              <article key={release.releaseCode}>
                <strong>{release.releaseName}</strong>
                <span>{release.releaseCode}</span>
                <small>{release.versionLabels.join(" | ")}</small>
              </article>
            ))
          ) : (
            <article>
              <strong>暂无发布版本</strong>
              <span>该能力当前主要通过业务方案组合使用。</span>
            </article>
          )}
        </div>
      </section>
    </section>
  );
}

export function ProductCapabilityDetailPage({
  productCode,
}: {
  productCode: string;
}) {
  const [product, setProduct] = useState<ProductCapabilityRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchProductCapability(productCode)
      .then((record) => {
        if (!active) return;
        setProduct(record);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productCode]);

  if (!loading && !product) {
    return (
      <div className="vx-page-stack vx-product-capability-page">
        <PageHeader
          icon="database"
          title="产品能力详情"
          description="未找到对应的产品能力。"
          action={
            <Button asChild variant="outline">
              <Link href="/products">
                <Icon name="arrow-left" size="xs" fallback="placeholder" />
                返回列表
              </Link>
            </Button>
          }
        />
        <EmptyState
          title="产品能力不存在"
          description="该产品能力可能已下线，或当前账号无权访问。"
          action={
            <Button asChild variant="outline">
              <Link href="/products">返回产品能力管理</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="vx-page-stack vx-product-capability-page">
      <PageHeader
        icon={product ? capabilityTypeIcon(product.productType) : "database"}
        title={product?.productName ?? "产品能力详情"}
        description={product?.capabilitySummary ?? "正在读取产品能力详情。"}
        action={
          <div className="vx-product-capability-actions">
            <Button asChild variant="outline">
              <Link href="/products">
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

      {product ? (
        <>
          <ProductCapabilitySummary product={product} />
          <ProductCapabilityDetails product={product} />
        </>
      ) : (
        <section className="vx-tenant-directory__header">
          <span>读取中</span>
        </section>
      )}
    </div>
  );
}
