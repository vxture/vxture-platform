import type {
  TenantOperationAuditEvent,
  TenantOperationMember,
  TenantOperationModelPolicy,
  TenantOperationRecord,
  TenantOperationSubscription,
  TenantOperationTicket,
  TenantOperationUsageMetric,
} from "@/entities/console";

export function joinClasses(
  ...values: Array<string | false | null | undefined>
) {
  return values.filter(Boolean).join(" ");
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(
    value,
  );
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | null) {
  if (!value) return "未设置";
  return new Date(value).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function statusLabel(status: TenantOperationRecord["status"]) {
  if (status === "active") return "正常";
  if (status === "trial") return "试用";
  if (status === "suspended") return "暂停";
  return "注销";
}

export function typeLabel(type: TenantOperationRecord["tenantType"]) {
  return type === "company" ? "企业租户" : "个人租户";
}

type TenantRiskValue = TenantOperationRecord["riskLevel"] | "low" | "medium";

const tenantRiskLabels: Record<TenantOperationRecord["riskLevel"], string> = {
  normal: "正常",
  follow_up: "需跟进",
  high: "高风险",
};

export const tenantRiskOptions = [
  { value: "normal", label: tenantRiskLabels.normal },
  { value: "follow_up", label: tenantRiskLabels.follow_up },
  { value: "high", label: tenantRiskLabels.high },
] satisfies Array<{ value: TenantOperationRecord["riskLevel"]; label: string }>;

export function normalizeTenantRiskLevel(
  risk: TenantRiskValue,
): TenantOperationRecord["riskLevel"] {
  if (risk === "high") return "high";
  if (risk === "medium" || risk === "follow_up") return "follow_up";
  return "normal";
}

export function riskLabel(risk: TenantRiskValue) {
  return tenantRiskLabels[normalizeTenantRiskLevel(risk)];
}

export function verifiedLabel(status: TenantOperationRecord["verifiedStatus"]) {
  if (status === "verified") return "已认证";
  if (status === "pending") return "待审核";
  if (status === "rejected") return "已驳回";
  return "未认证";
}

export function memberStatusLabel(status: TenantOperationMember["status"]) {
  if (status === "active") return "正常";
  if (status === "invited") return "邀请中";
  return "停用";
}

export function subscriptionStatusLabel(
  status: TenantOperationSubscription["status"],
) {
  if (status === "active") return "生效";
  if (status === "trial") return "试用";
  if (status === "past_due") return "逾期";
  return "取消";
}

export function modelPolicyStateLabel(
  state: TenantOperationModelPolicy["state"],
) {
  if (state === "effective") return "生效";
  if (state === "limited") return "临界";
  if (state === "disabled") return "停用";
  return "未定义";
}

export function policySourceLabel(
  source: TenantOperationModelPolicy["source"],
) {
  if (source === "product") return "产品策略";
  if (source === "tenant") return "租户覆盖";
  return "默认策略";
}

export function ticketStatusLabel(status: TenantOperationTicket["status"]) {
  if (status === "open") return "待处理";
  if (status === "processing") return "处理中";
  if (status === "blocked") return "搁置";
  return "完成";
}

export function auditResultLabel(result: TenantOperationAuditEvent["result"]) {
  if (result === "success") return "完成";
  if (result === "warning") return "关注";
  return "风险";
}

export function usagePercent(metric: TenantOperationUsageMetric) {
  if (metric.quota === null) return 100;
  if (metric.quota <= 0) return metric.used > 0 ? 100 : 0;
  return Math.min(100, Math.round((metric.used / metric.quota) * 100));
}

export function tenantSearchText(tenant: TenantOperationRecord) {
  return [
    tenant.id,
    tenant.tenantCode,
    tenant.tenantName,
    tenant.displayName,
    tenant.region,
    tenant.industry,
    tenant.ownerName,
    tenant.ownerEmail,
    tenant.contactName,
    tenant.contactPhone,
    tenant.status,
    tenant.verifiedStatus,
    tenant.riskLevel,
    ...tenant.tags,
    ...tenant.subscriptions.map(
      (item) => `${item.productName} ${item.releaseName} ${item.planName}`,
    ),
  ]
    .join(" ")
    .toLowerCase();
}
