/**
 * status-tone.ts —— admin 独有业务状态 → 语气档的展示映射。
 *
 * @package @vxture/admin
 * @layer Presentation
 * @category Shared
 *
 * ── 为什么在 admin 而不在 @vxture/shared ──────────────────────────────────
 * `@vxture/shared` 的 `status-tone.constants.ts` 是这类映射的正确去处，它自己
 * 划了边界：**只映射 shared 已经拥有值域的状态**，其余"先有值域契约，再谈它的
 * 展示映射，否则等于让展示层先于契约定义业务词汇"。
 *
 * 下面这些（订单态、账单态、发票态、对账态、用量风险、能力发布态）在 shared 里
 * 都还没有值域，只存在于 admin 的 `entities/console.ts`。所以按那条边界留在这里。
 * 哪天它们进了 catalog-domains，这些表就该跟着搬过去。
 *
 * 订阅状态没有出现在下面：shared 已有 `SUBSCRIPTION_STATUS_TONE`，但它的值域是
 * `SubscriptionStatus`（trialing / expired…），与 admin 运营视角的
 * `SubscriptionOperationStatus`（trial / expiring…）不是同一个值集，直接套会错配。
 * 这里给的是运营视角那一份，等两边值域合并再谈复用。
 *
 * ── 取值来源 ──────────────────────────────────────────────────────────────
 * 逐条抄自 `styles/admin-management-models-shared-row-tones.css` 的
 * `--tenant-row-tone` 声明——那是这套映射此前的唯一记录处：
 *   --tenant-green → success   --tenant-amber → warning
 *   --tenant-rose  → danger    --tenant-blue  → brand
 *   --vx-color-gray-400 → neutral
 *
 * CSS 那份有三处缺档（状态存在于类型里，却没有对应规则，卡片因此没有语气）。
 * 缺的三档在下面按语义补齐并各自注明——`Record` 要求全覆盖，这正好把缺口逼出来。
 */

import type { StatusTone } from "@vxture/shared";
import type {
  BillingBillStatus,
  BillingInvoiceStatus,
  OrderOperationStatus,
  OrderPaymentStatus,
  PaymentReconciliationStatus,
  ProductCapabilityStatus,
  SubscriptionOperationQuotaRisk,
  SubscriptionOperationStatus,
  UsageMeteringRisk,
} from "@/entities/console";

/** 订单运营态。 */
export const ORDER_STATUS_TONE: Record<OrderOperationStatus, StatusTone> = {
  confirmed: "success",
  pending: "warning",
  pending_verify: "warning",
  overdue: "danger",
  abnormal: "danger",
  closed: "neutral",
  // CSS 无规则。已付款但未开通权益，是需要运营跟进的挂起态，与 pending 同档。
  paid_unprovisioned: "warning",
  // CSS 无规则。部分收款待处理，与 billing 的 partial 同档。
  partial_pending: "warning",
};

/** 账单态。 */
export const BILL_STATUS_TONE: Record<BillingBillStatus, StatusTone> = {
  paid: "success",
  unpaid: "warning",
  paying: "warning",
  partial: "warning",
  overdue: "danger",
  cancelled: "neutral",
};

/** 发票态。 */
export const INVOICE_STATUS_TONE: Record<BillingInvoiceStatus, StatusTone> = {
  finished: "success",
  issued: "warning",
  sending: "warning",
  applying: "warning",
  auditing: "warning",
  red: "danger",
  rejected: "danger",
  // CSS 无规则。"未开票"是尚未开始，不是异常，取中性。
  none: "neutral",
};

/** 收款对账态。 */
export const RECONCILIATION_TONE: Record<
  PaymentReconciliationStatus,
  StatusTone
> = {
  normal: "success",
  pending_verify: "warning",
  partial: "warning",
  overpaid: "danger",
  bill_cancelled: "danger",
  failed: "danger",
  unlinked: "neutral",
};

/** 订阅运营态。 */
export const SUBSCRIPTION_OPERATION_TONE: Record<
  SubscriptionOperationStatus,
  StatusTone
> = {
  active: "success",
  trial: "warning",
  expiring: "warning",
  overdue: "danger",
  suspended: "danger",
  cancelled: "neutral",
};

/**
 * 用量风险。
 *
 * `anomaly` CSS 无规则，取 danger：页面自己的 `riskTone()` 一直把 normal /
 * warning 之外的一律归 danger，这里与它一致。
 */
export const USAGE_RISK_TONE: Record<UsageMeteringRisk, StatusTone> = {
  normal: "success",
  warning: "warning",
  danger: "danger",
  anomaly: "danger",
};

/** 产品能力 / 解决方案的发布态。draft 是工作副本，不该有"正常"的绿。 */
export const CAPABILITY_STATUS_TONE: Record<
  ProductCapabilityStatus,
  StatusTone
> = {
  active: "brand",
  draft: "warning",
  archived: "neutral",
};

/**
 * 支付态。订单与收款两页共用一个值域（`OrderPaymentStatus`）。
 *
 * 取自 `.vx-payment-pill--*`：paid 绿；pending / pending_verify / partial 黄；
 * failed / refunding 红；not_required / unpaid / closed 灰。`unpaid` 是灰不是黄
 * ——"还没开始付"与"付了一半"不是同一件事，前者不需要催。
 */
export const PAYMENT_STATUS_TONE: Record<OrderPaymentStatus, StatusTone> = {
  paid: "success",
  pending: "warning",
  pending_verify: "warning",
  partial: "warning",
  failed: "danger",
  refunding: "danger",
  not_required: "neutral",
  unpaid: "neutral",
  closed: "neutral",
};

/** 订阅配额风险。三档与 `.vx-subscription-pill--quota-*` 一一对应。 */
export const QUOTA_RISK_TONE: Record<
  SubscriptionOperationQuotaRisk,
  StatusTone
> = {
  normal: "success",
  warning: "warning",
  danger: "danger",
};
