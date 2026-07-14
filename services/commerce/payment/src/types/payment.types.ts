export interface PaymentRecord {
  id: string;
  tenantId: string;
  billId: string;
  transactionId: string;
  payOrderNo: string;
  paySource: string;
  payChannel: string | null;
  payMethod: string | null;
  totalAmount: string;
  paidAmount: string;
  currency: string;
  payStatus: string;
  statusMsg: string | null;
  channelOrderNo: string | null;
  channelTransactionNo: string | null;
  payExpireAt: Date | null;
  paidAt: Date | null;
  closedAt: Date | null;
  operatorId: string | null;
  operateRemark: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefundRecord {
  id: string;
  tenantId: string;
  billId: string;
  payRecordId: string;
  transactionId: string;
  refundNo: string;
  refundAmount: string;
  currency: string;
  refundReason: string | null;
  refundType: string | null;
  auditStatus: string;
  auditRemark: string | null;
  auditorId: string | null;
  auditAt: Date | null;
  channelRefundNo: string | null;
  refundStatus: string;
  refundAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionRecord {
  id: string;
  tenantId: string;
  billId: string | null;
  transactionNo: string;
  tradeType: string;
  amount: string;
  currency: string;
  balanceBefore: string;
  balanceAfter: string;
  tradeStatus: string;
  relatedNo: string | null;
  remark: string | null;
  operatorId: string | null;
  clientIp: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface PaymentMethodRecord {
  id: string;
  tenantId: string;
  methodType: string;
  status: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ListPaymentsParams {
  tenantId?: string;
  billId?: string;
  payStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ListPaymentsResult {
  items: PaymentRecord[];
  total: number;
}

export interface ListRefundsParams {
  tenantId?: string;
  billId?: string;
  auditStatus?: string;
  refundStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ListRefundsResult {
  items: RefundRecord[];
  total: number;
}

export interface CreatePaymentInput {
  tenantId: string;
  billId: string;
  transactionId: string;
  payOrderNo: string;
  paySource?: string;
  payChannel?: string;
  payMethod?: string;
  totalAmount: number;
  currency?: string;
  payExpireAt?: Date;
}

export interface UpdatePaymentStatusInput {
  payStatus: string;
  paidAmount?: number;
  statusMsg?: string;
  channelOrderNo?: string;
  channelTransactionNo?: string;
  paidAt?: Date;
  closedAt?: Date;
  operatorId?: string;
  operateRemark?: string;
}

export interface CreateRefundInput {
  tenantId: string;
  billId: string;
  payRecordId: string;
  transactionId: string;
  refundNo: string;
  refundAmount: number;
  currency?: string;
  refundReason?: string;
  refundType?: string;
  createdBy: string;
}

export interface AuditRefundInput {
  auditStatus: string;
  auditRemark?: string;
  auditorId: string;
}
