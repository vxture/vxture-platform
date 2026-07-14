import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { COMMERCE_PG_POOL } from "../tokens";
import type {
  PaymentRecord,
  RefundRecord,
  TransactionRecord,
  ListPaymentsParams,
  ListPaymentsResult,
  ListRefundsParams,
  ListRefundsResult,
  CreatePaymentInput,
  UpdatePaymentStatusInput,
  CreateRefundInput,
  AuditRefundInput,
} from "../types/payment.types";

interface PaymentRow {
  id: string;
  tenant_id: string;
  bill_id: string;
  transaction_id: string;
  pay_order_no: string;
  pay_source: string;
  pay_channel: string | null;
  pay_method: string | null;
  total_amount: string;
  paid_amount: string;
  currency: string;
  pay_status: string;
  status_msg: string | null;
  channel_order_no: string | null;
  channel_transaction_no: string | null;
  pay_expire_at: Date | null;
  paid_at: Date | null;
  closed_at: Date | null;
  actor_type: string;
  actor_id: string | null;
  operate_remark: string | null;
  created_at: Date;
  updated_at: Date;
}

interface RefundRow {
  id: string;
  tenant_id: string;
  bill_id: string;
  pay_record_id: string;
  transaction_id: string;
  refund_no: string;
  refund_amount: string;
  currency: string;
  refund_reason: string | null;
  refund_type: string | null;
  audit_status: string;
  audit_remark: string | null;
  auditor_id: string | null;
  audit_at: Date | null;
  channel_refund_no: string | null;
  refund_status: string;
  refund_at: Date | null;
  created_by_type: string;
  created_by_id: string;
  created_at: Date;
  updated_at: Date;
}

interface TransactionRow {
  id: string;
  tenant_id: string;
  bill_id: string | null;
  transaction_no: string;
  trade_type: string;
  amount: string;
  currency: string;
  balance_before: string;
  balance_after: string;
  trade_status: string;
  related_no: string | null;
  remark: string | null;
  actor_type: string;
  actor_id: string | null;
  client_ip: string | null;
  created_at: Date;
}

@Injectable()
export class PgPaymentRepository {
  constructor(@Inject(COMMERCE_PG_POOL) private readonly pool: Pool) {}

  // ── Payments ──────────────────────────────────────────────────

  async listPayments(params: ListPaymentsParams): Promise<ListPaymentsResult> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.tenantId) {
      conditions.push(`tenant_id = $${idx++}`);
      values.push(params.tenantId);
    }
    if (params.billId) {
      conditions.push(`bill_id = $${idx++}`);
      values.push(params.billId);
    }
    if (params.payStatus) {
      conditions.push(`pay_status = $${idx++}`);
      values.push(params.payStatus);
    }

    const where = conditions.length ? conditions.join(" and ") : "true";
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const [countResult, rowsResult] = await Promise.all([
      this.pool.query<{ count: string }>(
        `select count(*) as count from billing.payments where ${where}`,
        values,
      ),
      this.pool.query<PaymentRow>(
        `select * from billing.payments where ${where}
         order by created_at desc limit $${idx} offset $${idx + 1}`,
        [...values, pageSize, offset],
      ),
    ]);

    return {
      total: parseInt(countResult.rows[0]?.count ?? "0", 10),
      items: rowsResult.rows.map(this.mapPayment),
    };
  }

  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    const result = await this.pool.query<PaymentRow>(
      `select * from billing.payments where id = $1 limit 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? this.mapPayment(row) : null;
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentRecord> {
    const result = await this.pool.query<PaymentRow>(
      `insert into billing.payments (
        tenant_id, bill_id, transaction_id, pay_order_no,
        pay_source, pay_channel, pay_method,
        total_amount, paid_amount, currency,
        pay_status, pay_expire_at, created_at, updated_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, 0, $9,
        'pending', $10, now(), now()
      ) returning *`,
      [
        input.tenantId,
        input.billId,
        input.transactionId,
        input.payOrderNo,
        input.paySource ?? "online",
        input.payChannel ?? null,
        input.payMethod ?? null,
        input.totalAmount,
        input.currency ?? "CNY",
        input.payExpireAt ?? null,
      ],
    );
    return this.mapPayment(result.rows[0]!);
  }

  async updatePaymentStatus(
    id: string,
    input: UpdatePaymentStatusInput,
  ): Promise<PaymentRecord | null> {
    const result = await this.pool.query<PaymentRow>(
      `update billing.payments set
        pay_status              = $2,
        paid_amount             = coalesce($3, paid_amount),
        status_msg              = coalesce($4, status_msg),
        channel_order_no        = coalesce($5, channel_order_no),
        channel_transaction_no  = coalesce($6, channel_transaction_no),
        paid_at                 = coalesce($7, paid_at),
        closed_at               = coalesce($8, closed_at),
        actor_type              = case when $9::uuid is not null then 'operator' else actor_type end,
        actor_id                = coalesce($9, actor_id),
        operate_remark          = coalesce($10, operate_remark),
        updated_at              = now()
       where id = $1
       returning *`,
      [
        id,
        input.payStatus,
        input.paidAmount ?? null,
        input.statusMsg ?? null,
        input.channelOrderNo ?? null,
        input.channelTransactionNo ?? null,
        input.paidAt ?? null,
        input.closedAt ?? null,
        input.operatorId ?? null,
        input.operateRemark ?? null,
      ],
    );
    const row = result.rows[0];
    return row ? this.mapPayment(row) : null;
  }

  // ── Refunds ───────────────────────────────────────────────────

  async listRefunds(params: ListRefundsParams): Promise<ListRefundsResult> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.tenantId) {
      conditions.push(`tenant_id = $${idx++}`);
      values.push(params.tenantId);
    }
    if (params.billId) {
      conditions.push(`bill_id = $${idx++}`);
      values.push(params.billId);
    }
    if (params.auditStatus) {
      conditions.push(`audit_status = $${idx++}`);
      values.push(params.auditStatus);
    }
    if (params.refundStatus) {
      conditions.push(`refund_status = $${idx++}`);
      values.push(params.refundStatus);
    }

    const where = conditions.length ? conditions.join(" and ") : "true";
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const [countResult, rowsResult] = await Promise.all([
      this.pool.query<{ count: string }>(
        `select count(*) as count from billing.refunds where ${where}`,
        values,
      ),
      this.pool.query<RefundRow>(
        `select * from billing.refunds where ${where}
         order by created_at desc limit $${idx} offset $${idx + 1}`,
        [...values, pageSize, offset],
      ),
    ]);

    return {
      total: parseInt(countResult.rows[0]?.count ?? "0", 10),
      items: rowsResult.rows.map(this.mapRefund),
    };
  }

  async getRefundById(id: string): Promise<RefundRecord | null> {
    const result = await this.pool.query<RefundRow>(
      `select * from billing.refunds where id = $1 limit 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? this.mapRefund(row) : null;
  }

  async createRefund(input: CreateRefundInput): Promise<RefundRecord> {
    const result = await this.pool.query<RefundRow>(
      `insert into billing.refunds (
        tenant_id, bill_id, pay_record_id, transaction_id, refund_no,
        refund_amount, currency, refund_reason, refund_type,
        audit_status, refund_status, created_by_type, created_by_id, created_at, updated_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        'pending', 'pending', 'customer', $10, now(), now()
      ) returning *`,
      [
        input.tenantId,
        input.billId,
        input.payRecordId,
        input.transactionId,
        input.refundNo,
        input.refundAmount,
        input.currency ?? "CNY",
        input.refundReason ?? null,
        input.refundType ?? "normal",
        input.createdBy,
      ],
    );
    return this.mapRefund(result.rows[0]!);
  }

  async auditRefund(
    id: string,
    input: AuditRefundInput,
  ): Promise<RefundRecord | null> {
    const result = await this.pool.query<RefundRow>(
      `update billing.refunds set
        audit_status = $2,
        audit_remark = coalesce($3, audit_remark),
        auditor_id   = $4,
        audit_at     = now(),
        updated_at   = now()
       where id = $1
       returning *`,
      [id, input.auditStatus, input.auditRemark ?? null, input.auditorId],
    );
    const row = result.rows[0];
    return row ? this.mapRefund(row) : null;
  }

  // ── Transactions (read-only for app, append via insert) ───────

  async listTransactionsByTenantId(
    tenantId: string,
    limit = 50,
  ): Promise<TransactionRecord[]> {
    const result = await this.pool.query<TransactionRow>(
      `select * from billing.transactions
       where tenant_id = $1
       order by created_at desc
       limit $2`,
      [tenantId, limit],
    );
    return result.rows.map(this.mapTransaction);
  }

  async appendTransaction(
    input: Omit<TransactionRecord, "id" | "createdAt">,
  ): Promise<TransactionRecord> {
    const result = await this.pool.query<TransactionRow>(
      `insert into billing.transactions (
        tenant_id, bill_id, transaction_no, trade_type, amount, currency,
        balance_before, balance_after, trade_status,
        related_no, remark, actor_type, actor_id, client_ip, created_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())
      returning *`,
      [
        input.tenantId,
        input.billId ?? null,
        input.transactionNo,
        input.tradeType,
        input.amount,
        input.currency,
        input.balanceBefore,
        input.balanceAfter,
        input.tradeStatus,
        input.relatedNo ?? null,
        input.remark ?? null,
        input.operatorId ? "operator" : "system",
        input.operatorId ?? input.createdBy,
        input.clientIp ?? null,
      ],
    );
    return this.mapTransaction(result.rows[0]!);
  }

  private mapPayment(row: PaymentRow): PaymentRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      billId: row.bill_id,
      transactionId: row.transaction_id,
      payOrderNo: row.pay_order_no,
      paySource: row.pay_source,
      payChannel: row.pay_channel,
      payMethod: row.pay_method,
      totalAmount: row.total_amount,
      paidAmount: row.paid_amount,
      currency: row.currency,
      payStatus: row.pay_status,
      statusMsg: row.status_msg,
      channelOrderNo: row.channel_order_no,
      channelTransactionNo: row.channel_transaction_no,
      payExpireAt: row.pay_expire_at,
      paidAt: row.paid_at,
      closedAt: row.closed_at,
      operatorId: row.actor_type === "operator" ? row.actor_id : null,
      operateRemark: row.operate_remark,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRefund(row: RefundRow): RefundRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      billId: row.bill_id,
      payRecordId: row.pay_record_id,
      transactionId: row.transaction_id,
      refundNo: row.refund_no,
      refundAmount: row.refund_amount,
      currency: row.currency,
      refundReason: row.refund_reason,
      refundType: row.refund_type,
      auditStatus: row.audit_status,
      auditRemark: row.audit_remark,
      auditorId: row.auditor_id,
      auditAt: row.audit_at,
      channelRefundNo: row.channel_refund_no,
      refundStatus: row.refund_status,
      refundAt: row.refund_at,
      createdBy: row.created_by_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTransaction(row: TransactionRow): TransactionRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      billId: row.bill_id,
      transactionNo: row.transaction_no,
      tradeType: row.trade_type,
      amount: row.amount,
      currency: row.currency,
      balanceBefore: row.balance_before,
      balanceAfter: row.balance_after,
      tradeStatus: row.trade_status,
      relatedNo: row.related_no,
      remark: row.remark,
      operatorId: row.actor_type === "operator" ? row.actor_id : null,
      clientIp: row.client_ip,
      createdBy: row.actor_id ?? "",
      createdAt: row.created_at,
    };
  }
}
