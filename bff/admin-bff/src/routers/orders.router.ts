/**
 * orders.router.ts - 订单运营路由（只读）
 * @package @vxture/bff-admin
 *
 * Description: 平台无独立 order 表（18-schema）。以 metering.subscriptions.order_no 为“订单”主概念，
 *   left join billing.invoices（按 subscription_id 关联最近一张账单）与 billing.payments（按 bill_id
 *   关联该账单最近一笔支付）合成订单视图；套餐名取 product.plan_versions → plans。
 *   支付与订阅无直接列关联（payments 无 subscription_id / order_no 亦非 pay_order_no），
 *   走 subscriptions → invoices(subscription_id) → payments(bill_id) 链路合成。
 *   详情附账单明细 billing.invoice_items、全部支付记录 billing.payments、变更时间线
 *   metering.subscription_histories。写路径（核销/关单等）不在本读 router。
 *
 * @author AI-Generated
 * @date 2026-07-04
 * @version 1.0
 *
 * @copyright Vxture Team
 *
 * @layer Application
 * @category Router
 */

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request } from "express";
import type { Pool, PoolClient } from "pg";
import { extractClientIp } from "@vxture/core-utils";
import { assertAnyCapability } from "../auth/capability";
import { RequireStepUp } from "../auth/step-up.decorator";
import { ADMIN_BFF_RO_POOL, ADMIN_BFF_RW_POOL } from "../tokens";
import type {
  OrderInvoiceItemRecord,
  OrderOfflinePaymentType,
  OrderOperationDetailRecord,
  OrderOperationEvent,
  OrderOperationRecord,
  OrderOperationStatus,
  OrderPaymentRecord,
  OrderPaymentStatus,
  OrderPaySource,
  RequestContext,
  SubscriptionOperationCycle,
  SubscriptionOperationStatus,
  TenantOperationType,
} from "../types/console.types";

@Controller("api/orders")
export class OrdersRouter {
  constructor(
    @Inject(ADMIN_BFF_RO_POOL) private readonly pool: Pool,
    @Inject(ADMIN_BFF_RW_POOL) private readonly rwPool: Pool,
  ) {}

  @Get()
  async listOrders(
    @Req() req: Request & RequestContext,
  ): Promise<OrderOperationRecord[]> {
    assertCanReadOrders(req);

    const { rows } = await this.pool.query<OrderRow>(`${ORDER_BASE_SQL}
      order by sub.created_at desc
      limit 500`);
    return rows.map(mapOrderRow);
  }

  @Get(":orderId")
  async getOrder(
    @Req() req: Request & RequestContext,
    @Param("orderId") orderId: string,
  ): Promise<OrderOperationDetailRecord | null> {
    assertCanReadOrders(req);

    const { rows } = await this.pool.query<OrderRow>(
      `${ORDER_BASE_SQL} and sub.id = $1 limit 1`,
      [orderId],
    );
    const base = rows[0];
    if (!base) return null;

    const [items, payments, timeline] = await Promise.all([
      base.bill_id
        ? this.pool.query<InvoiceItemRow>(INVOICE_ITEMS_SQL, [base.bill_id])
        : Promise.resolve({ rows: [] as InvoiceItemRow[] }),
      base.bill_id
        ? this.pool.query<PaymentRow>(PAYMENTS_SQL, [base.bill_id])
        : Promise.resolve({ rows: [] as PaymentRow[] }),
      this.pool.query<HistoryRow>(HISTORY_SQL, [base.id]),
    ]);

    return {
      ...mapOrderRow(base),
      invoiceItems: items.rows.map(mapInvoiceItemRow),
      paymentRecords: payments.rows.map(mapPaymentRow),
      operationTimeline: timeline.rows.map(mapHistoryRow),
    };
  }

  // 线下支付确认（事务写）：payments(offline/paid) → invoices(累加 paid_amount、足额转 paid)
  //   → transactions(append-only 流水，pool 余额快照) → subscriptions(激活) + subscription_histories 审计行。
  //   orderId = metering.subscriptions.id（与 getOrder 一致）；账单经 subscription_id 定位最近未删账单。
  @Post(":orderId/offline-payment-confirm")
  @RequireStepUp()
  async confirmOfflinePayment(
    @Req() req: Request & RequestContext,
    @Param("orderId") orderId: string,
    @Body() body: OfflinePaymentConfirmBody,
  ): Promise<OrderOperationDetailRecord> {
    assertCanSettleOrderPayment(req);

    const actorId = requireOperatorId(req.user?.id);
    const subscriptionId = requireUuid(orderId, "Invalid order id");
    const input = normalizeOfflinePaymentBody(body);

    const client = await this.rwPool.connect();
    try {
      await client.query("begin");

      // ① 锁定订阅（订单主体）
      const subResult = await client.query<SubscriptionLockRow>(
        `select id, tenant_id, status, currency
         from metering.subscriptions
         where id = $1 and deleted_at is null
         for update`,
        [subscriptionId],
      );
      const sub = subResult.rows[0];
      if (!sub) {
        throw new NotFoundException("Order not found");
      }

      // ② 锁定该订阅最近一张未删账单（订单视图口径一致）
      const invoiceResult = await client.query<InvoiceLockRow>(
        `select id, tenant_id, payable_amount, paid_amount, bill_status, currency
         from billing.invoices
         where subscription_id = $1 and deleted_at is null
         order by created_at desc
         limit 1
         for update`,
        [subscriptionId],
      );
      const invoice = invoiceResult.rows[0];
      if (!invoice) {
        throw new BadRequestException(
          "Order has no billable invoice to settle",
        );
      }

      // 前置状态不变量：已支付不可重复确认；已取消不可确认
      if (invoice.bill_status === "paid") {
        throw new BadRequestException("Invoice is already fully paid");
      }
      if (invoice.bill_status === "cancelled") {
        throw new BadRequestException("Cancelled invoice cannot be settled");
      }

      const payable = toNumber(invoice.payable_amount);
      const alreadyPaid = toNumber(invoice.paid_amount);
      const remaining = round2(payable - alreadyPaid);
      if (remaining <= 0) {
        throw new BadRequestException("Invoice has no outstanding balance");
      }
      if (input.paidAmount > remaining) {
        throw new BadRequestException(
          "Confirmed amount exceeds the outstanding balance",
        );
      }

      const tenantId = invoice.tenant_id;
      const currency = invoice.currency ?? sub.currency ?? "CNY";
      const payOrderNo = billingCode("PAY");
      const transactionNo = billingCode("TXN");

      // ③ append-only 资金流水。线下账单结算不改动预付款池，快照 before==after（池余额不变）。
      const poolBalance = await currentCreditsBalance(client, tenantId);
      const transactionResult = await client.query<InsertedIdRow>(
        `insert into billing.transactions (
           tenant_id, bill_id, transaction_no, trade_type, amount, currency,
           balance_before, balance_after, trade_status, related_no, remark,
           actor_type, actor_id, client_ip
         ) values (
           $1, $2, $3, 'adjust', $4, $5,
           $6, $6, 'success', $7, $8,
           'operator', $9, $10
         )
         returning id`,
        [
          tenantId,
          invoice.id,
          transactionNo,
          input.paidAmount,
          currency,
          poolBalance,
          input.transactionNo ?? payOrderNo,
          input.reason,
          actorId,
          extractClientIp(req),
        ],
      );
      const transactionId = transactionResult.rows[0]?.id ?? null;

      // ④ 支付记录（线下已收）。关联本笔流水。
      await client.query(
        `insert into billing.payments (
           tenant_id, bill_id, transaction_id, pay_order_no, pay_source,
           offline_pay_type, offline_payer_name, offline_pay_time, offline_evidence_url,
           total_amount, paid_amount, currency, pay_status, paid_at,
           actor_type, actor_id, operate_remark
         ) values (
           $1, $2, $3, $4, 'offline',
           $5, $6, $7, $8,
           $9, $9, $10, 'paid', $7,
           'operator', $11, $12
         )`,
        [
          tenantId,
          invoice.id,
          transactionId,
          payOrderNo,
          input.offlinePayType,
          input.payerName,
          input.paidAt,
          input.evidenceUrl,
          input.paidAmount,
          currency,
          actorId,
          input.reason,
        ],
      );

      // ⑤ 回写账单：累加实收，足额转 paid（并落 paid_at），否则 partial。
      const newPaid = round2(alreadyPaid + input.paidAmount);
      const fullySettled = newPaid >= payable;
      await client.query(
        `update billing.invoices
         set paid_amount = $2,
             bill_status = case when $3 then 'paid' else 'partial' end,
             paid_at = case when $3 then $4 else paid_at end,
             payment_method = 'offline',
             transaction_no = $5,
             updated_at = now()
         where id = $1`,
        [invoice.id, newPaid, fullySettled, input.paidAt, transactionNo],
      );

      // ⑥ 账单足额结清后激活订阅（cancelled 不复活）；记录一条 append-only 审计。
      if (
        fullySettled &&
        sub.status !== "active" &&
        sub.status !== "cancelled"
      ) {
        await client.query(
          `update metering.subscriptions
           set status = 'active', updated_at = now()
           where id = $1`,
          [subscriptionId],
        );
        await client.query(
          `insert into metering.subscription_histories (
             tenant_id, subscription_id, change_type, from_status, to_status,
             actor_type, actor_id, remark, client_ip
           ) values ($1, $2, 'offline_payment_confirmed', $3, 'active', 'operator', $4, $5, $6)`,
          [
            sub.tenant_id,
            subscriptionId,
            sub.status,
            actorId,
            input.reason,
            extractClientIp(req),
          ],
        );
      } else {
        await client.query(
          `insert into metering.subscription_histories (
             tenant_id, subscription_id, change_type, from_status, to_status,
             actor_type, actor_id, remark, client_ip
           ) values ($1, $2, 'offline_payment_confirmed', $3, $3, 'operator', $4, $5, $6)`,
          [
            sub.tenant_id,
            subscriptionId,
            sub.status,
            actorId,
            input.reason,
            extractClientIp(req),
          ],
        );
      }

      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }

    // 复用只读链路合成最新订单详情返回（前端期望 OrderOperationDetailRecord）。
    const detail = await this.getOrder(req, subscriptionId);
    if (!detail) {
      throw new NotFoundException("Order not found after confirmation");
    }
    return detail;
  }
}

// 读取租户预付款池当前余额（无池视为 0）——供流水 balance 快照。
async function currentCreditsBalance(
  client: PoolClient,
  tenantId: string,
): Promise<number> {
  const { rows } = await client.query<{ balance: string | number | null }>(
    `select balance from billing.credits where tenant_id = $1`,
    [tenantId],
  );
  return round2(toNumber(rows[0]?.balance ?? 0));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// 可视码：{PREFIX}-{YYYYMM}-{10位}。唯一约束（uq_payments_pay_order_no / uq_transactions_transaction_no）兜底防重。
function billingCode(prefix: string): string {
  const now = new Date();
  const ym = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const suffix = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `${prefix}-${ym}-${suffix}`;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(value: string | undefined, message: string): string {
  if (!value || !UUID_RE.test(value)) {
    throw new BadRequestException(message);
  }
  return value;
}

function requireOperatorId(value: string | undefined): string {
  if (!value || !UUID_RE.test(value)) {
    throw new UnauthorizedException("Invalid platform admin principal");
  }
  return value;
}

const OFFLINE_PAY_TYPES: ReadonlySet<OrderOfflinePaymentType> = new Set([
  "bank_transfer",
  "cash",
  "other",
]);

function normalizeOfflinePaymentBody(
  body: OfflinePaymentConfirmBody,
): NormalizedOfflinePayment {
  if (!body || typeof body !== "object") {
    throw new BadRequestException("Request body is required");
  }

  const paidAmount = round2(Number(body.paidAmount));
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    throw new BadRequestException("paidAmount must be a positive number");
  }

  const offlinePayType = body.offlinePayType;
  if (!OFFLINE_PAY_TYPES.has(offlinePayType)) {
    throw new BadRequestException("Invalid offlinePayType");
  }

  const payerName =
    typeof body.payerName === "string" ? body.payerName.trim() : "";
  if (!payerName) {
    throw new BadRequestException("payerName is required");
  }

  const paidAt = parseTimestamp(body.paidAt);
  if (!paidAt) {
    throw new BadRequestException("paidAt must be a valid timestamp");
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    throw new BadRequestException("reason is required");
  }

  return {
    paidAmount,
    offlinePayType,
    payerName,
    paidAt,
    transactionNo: trimOrNull(body.transactionNo),
    evidenceUrl: trimOrNull(body.evidenceUrl),
    reason,
  };
}

function trimOrNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

interface OfflinePaymentConfirmBody {
  paidAmount: number;
  offlinePayType: OrderOfflinePaymentType;
  payerName: string;
  paidAt: string;
  transactionNo?: string | null;
  evidenceUrl?: string | null;
  reason: string;
}

interface NormalizedOfflinePayment {
  paidAmount: number;
  offlinePayType: OrderOfflinePaymentType;
  payerName: string;
  paidAt: string;
  transactionNo: string | null;
  evidenceUrl: string | null;
  reason: string;
}

interface SubscriptionLockRow {
  id: string;
  tenant_id: string;
  status: string;
  currency: string | null;
}

interface InvoiceLockRow {
  id: string;
  tenant_id: string;
  payable_amount: string | number | null;
  paid_amount: string | number | null;
  bill_status: string;
  currency: string | null;
}

interface InsertedIdRow {
  id: string;
}

// TD-027: order is a read-only synthetic view (no order table) — order.read.
// Its one write (offline-payment-confirm) is money-in confirmation, gated as the
// 危 commerce:payment.settle (same class as payments verify) + @RequireStepUp.
function assertCanReadOrders(req: Request & RequestContext): void {
  assertAnyCapability(req, ["commerce:order.read"]);
}

function assertCanSettleOrderPayment(req: Request & RequestContext): void {
  assertAnyCapability(req, ["commerce:payment.settle"]);
}

// ── 合成主 SELECT：订阅为订单主体，横向取最近账单/支付（LATERAL），套餐名取 plan_versions→plans。
//   region 无 province/city 源列 → 空态兜底；operatorName 按 created_by_type 解 admin.operator_account。
const ORDER_BASE_SQL = `
select
  sub.id,
  sub.order_no,
  sub.status                       as subscription_status,
  sub.cycle_unit,
  sub.pay_amount,
  sub.currency,
  sub.created_by_type,
  sub.created_at,
  sub.updated_at,
  tenant.id                        as tenant_id,
  tenant.tenant_no::text           as tenant_code,
  tenant.name                      as tenant_name,
  tenant.type                      as tenant_type,
  profile.industry                 as industry,
  plan.plan_code                   as plan_code,
  plan.plan_name                   as plan_name,
  op.display_name                  as operator_name,
  inv.id                           as bill_id,
  inv.bill_no                      as bill_no,
  inv.bill_status                  as bill_status,
  inv.payable_amount               as bill_payable_amount,
  inv.paid_amount                  as bill_paid_amount,
  inv.paid_at                      as bill_paid_at,
  pay.id                           as payment_id,
  pay.pay_order_no                 as payment_no,
  pay.pay_source                   as pay_source,
  pay.pay_method                   as pay_method,
  pay.pay_status                   as pay_status,
  pay.paid_amount                  as payment_paid_amount,
  pay.paid_at                      as payment_paid_at
from metering.subscriptions sub
join tenancy.tenants tenant on tenant.id = sub.tenant_id
left join tenancy.tenant_profiles profile on profile.tenant_id = tenant.id
left join product.plan_versions pv on pv.id = sub.plan_version_id
left join product.plans plan on plan.id = pv.plan_id
left join admin.operator_account op
  on op.id = sub.created_by_id and sub.created_by_type = 'operator'
left join lateral (
  select i.id, i.bill_no, i.bill_status, i.payable_amount, i.paid_amount, i.paid_at
  from billing.invoices i
  where i.subscription_id = sub.id and i.deleted_at is null
  order by i.created_at desc
  limit 1
) inv on true
left join lateral (
  select p.id, p.pay_order_no, p.pay_source, p.pay_method, p.pay_status, p.paid_amount, p.paid_at
  from billing.payments p
  where p.bill_id = inv.id
  order by p.created_at desc
  limit 1
) pay on true
where sub.deleted_at is null
`;

const INVOICE_ITEMS_SQL = `
select
  id,
  item_name,
  item_type,
  item_unit,
  quantity,
  unit_price,
  total_amount,
  remark
from billing.invoice_items
where bill_id = $1 and deleted_at is null
order by created_at asc
`;

const PAYMENTS_SQL = `
select
  pay.id,
  pay.pay_order_no,
  pay.pay_source,
  pay.pay_method,
  pay.offline_pay_type,
  pay.offline_payer_name,
  pay.paid_amount,
  pay.currency,
  pay.pay_status,
  pay.paid_at,
  pay.actor_type,
  op.display_name as operator_name
from billing.payments pay
left join admin.operator_account op
  on op.id = pay.actor_id and pay.actor_type = 'operator'
where pay.bill_id = $1
order by pay.created_at desc
`;

const HISTORY_SQL = `
select
  id,
  change_type,
  from_status,
  to_status,
  remark,
  actor_type,
  actor_id,
  created_at
from metering.subscription_histories
where subscription_id = $1
order by created_at desc
limit 200
`;

// ────────────────────────────── 映射器 ──────────────────────────────

function toIso(value: Date | string | null): string {
  if (!value) return new Date(0).toISOString();
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function toIsoOrNull(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function toNumber(value: string | number | null): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapTenantType(type: string): TenantOperationType {
  return type === "personal" ? "individual" : "company";
}

function mapSubscriptionStatus(status: string): SubscriptionOperationStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trial";
    case "expired":
      return "overdue";
    case "cancelled":
      return "cancelled";
    case "suspended":
      return "suspended";
    default:
      return "active";
  }
}

function mapCycle(cycleUnit: string): SubscriptionOperationCycle {
  if (cycleUnit === "month") return "monthly";
  if (cycleUnit === "year") return "yearly";
  return "once";
}

function mapPaySource(source: string | null): OrderPaySource {
  if (source === "online") return "online";
  if (source === "offline") return "offline";
  return "none";
}

function mapPaymentStatus(
  payStatus: string | null,
  hasInvoice: boolean,
): OrderPaymentStatus {
  switch (payStatus) {
    case "paid":
      return "paid";
    case "pending_verify":
      return "pending_verify";
    case "pending":
      return "pending";
    case "failed":
      return "failed";
    case "closed":
      return "closed";
    case "refunding":
      return "refunding";
    default:
      // 无支付行：有账单=待支付，无账单=无需支付
      return hasInvoice ? "unpaid" : "not_required";
  }
}

// 订单态由“支付态优先，账单态兜底”派生。
function deriveOrderStatus(
  payStatus: string | null,
  billStatus: string | null,
): OrderOperationStatus {
  if (payStatus === "paid" || billStatus === "paid") return "confirmed";
  if (payStatus === "pending_verify") return "pending_verify";
  if (payStatus === "failed") return "abnormal";
  if (payStatus === "closed" || billStatus === "cancelled") return "closed";
  if (billStatus === "overdue") return "overdue";
  if (billStatus === "partial") return "confirmed";
  return "pending";
}

function operatorDisplay(
  operatorName: string | null,
  createdByType: string | null,
): string {
  if (operatorName) return operatorName;
  if (createdByType === "system") return "系统";
  if (createdByType === "customer") return "客户";
  return "未设置";
}

function mapOrderRow(row: OrderRow): OrderOperationRecord {
  const hasInvoice = Boolean(row.bill_id);
  const amount = toNumber(row.pay_amount ?? row.bill_payable_amount);
  const paidAmount = toNumber(row.payment_paid_amount ?? row.bill_paid_amount);
  return {
    id: row.id,
    orderNo: row.order_no ?? row.id,
    tenantId: row.tenant_id,
    tenantCode: row.tenant_code,
    tenantName: row.tenant_name,
    tenantType: mapTenantType(row.tenant_type),
    region: "未设置",
    industry: row.industry ?? "未设置",
    solutionCode: null,
    solutionName: "未设置",
    servicePlanCode: row.plan_code ?? "",
    servicePlanName: row.plan_name ?? "未设置",
    tierName: "未设置",
    subscriptionId: row.id,
    subscriptionStatus: mapSubscriptionStatus(row.subscription_status),
    cycleType: mapCycle(row.cycle_unit),
    orderStatus: deriveOrderStatus(row.pay_status, row.bill_status),
    paymentStatus: mapPaymentStatus(row.pay_status, hasInvoice),
    paySource: mapPaySource(row.pay_source),
    payMethod: row.pay_method,
    billId: row.bill_id,
    billNo: row.bill_no,
    billStatus: row.bill_status,
    paymentId: row.payment_id,
    paymentNo: row.payment_no,
    amount,
    paidAmount,
    currency: row.currency ?? "CNY",
    operatorName: operatorDisplay(row.operator_name, row.created_by_type),
    operationHint:
      deriveOrderStatus(row.pay_status, row.bill_status) === "pending"
        ? "待客户完成支付"
        : "",
    createdAt: toIso(row.created_at),
    confirmedAt: toIsoOrNull(row.payment_paid_at ?? row.bill_paid_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapInvoiceItemRow(row: InvoiceItemRow): OrderInvoiceItemRecord {
  return {
    id: row.id,
    itemName: row.item_name,
    itemType: row.item_type,
    itemUnit: row.item_unit,
    quantity: toNumber(row.quantity),
    unitPrice: toNumber(row.unit_price),
    totalAmount: toNumber(row.total_amount),
    remark: row.remark,
  };
}

function mapOfflinePayType(
  value: string | null,
): OrderOfflinePaymentType | null {
  if (value === "bank_transfer") return "bank_transfer";
  if (value === "cash") return "cash";
  if (!value) return null;
  return "other";
}

function mapPaymentRow(row: PaymentRow): OrderPaymentRecord {
  return {
    id: row.id,
    paymentNo: row.pay_order_no,
    paySource: mapPaySource(row.pay_source),
    payMethod: row.pay_method,
    offlinePayType: mapOfflinePayType(row.offline_pay_type),
    offlinePayerName: row.offline_payer_name,
    paidAmount: toNumber(row.paid_amount),
    currency: row.currency ?? "CNY",
    paymentStatus: mapPaymentStatus(row.pay_status, true),
    paidAt: toIsoOrNull(row.paid_at),
    operatorName: operatorDisplay(row.operator_name, row.actor_type),
    remark: null,
  };
}

function mapHistoryRow(row: HistoryRow): OrderOperationEvent {
  const tone: OrderOperationEvent["tone"] =
    row.change_type === "cancelled"
      ? "danger"
      : row.change_type === "created" || row.change_type === "renewed"
        ? "success"
        : row.change_type === "downgraded"
          ? "warning"
          : "neutral";
  return {
    id: row.id,
    title: row.change_type,
    description:
      row.remark ??
      [row.from_status, row.to_status].filter(Boolean).join(" → "),
    actor: row.actor_type,
    at: toIso(row.created_at),
    tone,
  };
}

// ────────────────────────────── 行接口 ──────────────────────────────

interface OrderRow {
  id: string;
  order_no: string | null;
  subscription_status: string;
  cycle_unit: string;
  pay_amount: string | number | null;
  currency: string | null;
  created_by_type: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  tenant_id: string;
  tenant_code: string;
  tenant_name: string;
  tenant_type: string;
  industry: string | null;
  plan_code: string | null;
  plan_name: string | null;
  operator_name: string | null;
  bill_id: string | null;
  bill_no: string | null;
  bill_status: string | null;
  bill_payable_amount: string | number | null;
  bill_paid_amount: string | number | null;
  bill_paid_at: Date | string | null;
  payment_id: string | null;
  payment_no: string | null;
  pay_source: string | null;
  pay_method: string | null;
  pay_status: string | null;
  payment_paid_amount: string | number | null;
  payment_paid_at: Date | string | null;
}

interface InvoiceItemRow {
  id: string;
  item_name: string;
  item_type: string;
  item_unit: string | null;
  quantity: string | number | null;
  unit_price: string | number | null;
  total_amount: string | number | null;
  remark: string | null;
}

interface PaymentRow {
  id: string;
  pay_order_no: string;
  pay_source: string | null;
  pay_method: string | null;
  offline_pay_type: string | null;
  offline_payer_name: string | null;
  paid_amount: string | number | null;
  currency: string | null;
  pay_status: string | null;
  paid_at: Date | string | null;
  actor_type: string | null;
  operator_name: string | null;
}

interface HistoryRow {
  id: string;
  change_type: string;
  from_status: string | null;
  to_status: string | null;
  remark: string | null;
  actor_type: string;
  actor_id: string | null;
  created_at: Date | string | null;
}
