import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PgPaymentRepository } from "../repository/pg-payment.repository";
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

@Injectable()
export class PaymentService {
  constructor(private readonly repo: PgPaymentRepository) {}

  async listPayments(params: ListPaymentsParams): Promise<ListPaymentsResult> {
    return this.repo.listPayments(params);
  }

  async getPayment(id: string): Promise<PaymentRecord> {
    const record = await this.repo.getPaymentById(id);
    if (!record) throw new NotFoundException(`支付记录 ${id} 不存在`);
    return record;
  }

  async createPayment(input: CreatePaymentInput): Promise<PaymentRecord> {
    return this.repo.createPayment(input);
  }

  async confirmPayment(
    id: string,
    data: {
      channelOrderNo?: string;
      channelTransactionNo?: string;
      paidAmount: number;
      operatorId?: string;
    },
  ): Promise<PaymentRecord> {
    const payment = await this.getPayment(id);
    if (payment.payStatus === "paid") throw new ConflictException("支付已完成");
    if (payment.payStatus === "closed")
      throw new ConflictException("支付订单已关闭");

    const result = await this.repo.updatePaymentStatus(id, {
      payStatus: "paid",
      paidAmount: data.paidAmount,
      channelOrderNo: data.channelOrderNo,
      channelTransactionNo: data.channelTransactionNo,
      paidAt: new Date(),
      operatorId: data.operatorId,
    });
    return result!;
  }

  async closePayment(
    id: string,
    operatorId?: string,
    remark?: string,
  ): Promise<PaymentRecord> {
    const payment = await this.getPayment(id);
    if (payment.payStatus === "paid")
      throw new ConflictException("已支付订单不可关闭");
    if (payment.payStatus === "closed")
      throw new ConflictException("支付订单已关闭");

    const result = await this.repo.updatePaymentStatus(id, {
      payStatus: "closed",
      closedAt: new Date(),
      operatorId,
      operateRemark: remark,
    });
    return result!;
  }

  async updatePaymentStatus(
    id: string,
    input: UpdatePaymentStatusInput,
  ): Promise<PaymentRecord> {
    await this.getPayment(id);
    const result = await this.repo.updatePaymentStatus(id, input);
    return result!;
  }

  async listRefunds(params: ListRefundsParams): Promise<ListRefundsResult> {
    return this.repo.listRefunds(params);
  }

  async getRefund(id: string): Promise<RefundRecord> {
    const record = await this.repo.getRefundById(id);
    if (!record) throw new NotFoundException(`退款记录 ${id} 不存在`);
    return record;
  }

  async applyRefund(input: CreateRefundInput): Promise<RefundRecord> {
    return this.repo.createRefund(input);
  }

  async auditRefund(
    id: string,
    input: AuditRefundInput,
  ): Promise<RefundRecord> {
    await this.getRefund(id);
    const result = await this.repo.auditRefund(id, input);
    return result!;
  }

  async listTransactions(
    tenantId: string,
    limit?: number,
  ): Promise<TransactionRecord[]> {
    return this.repo.listTransactionsByTenantId(tenantId, limit);
  }

  async appendTransaction(
    input: Omit<TransactionRecord, "id" | "createdAt">,
  ): Promise<TransactionRecord> {
    return this.repo.appendTransaction(input);
  }
}
