export interface InvoiceRecord {
  id: string;
  tenantId: string;
  billNo: string;
  subscriptionId: string | null;
  billCycle: string;
  cycleStartDate: Date;
  cycleEndDate: Date;
  totalAmount: string;
  discountAmount: string;
  payableAmount: string;
  paidAmount: string;
  currency: string;
  billStatus: string;
  billType: string | null;
  paidAt: Date | null;
  paymentMethod: string | null;
  transactionNo: string | null;
  operatorId: string | null;
  operateRemark: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface InvoiceItemRecord {
  id: string;
  billId: string;
  tenantId: string;
  workspaceId: string | null;
  productId: string | null;
  metricKey: string | null;
  subscriptionId: string | null;
  itemName: string;
  itemType: string;
  itemUnit: string | null;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  usageSummaryRef: string | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface InvoiceDetail extends InvoiceRecord {
  items: InvoiceItemRecord[];
}

export interface CreditRecord {
  id: string;
  tenantId: string;
  currency: string;
  balance: string;
  totalGranted: string;
  totalConsumed: string;
  version: number;
  updatedAt: Date;
}

export interface ListInvoicesParams {
  tenantId?: string;
  billStatus?: string;
  billCycle?: string;
  billType?: string;
  page?: number;
  pageSize?: number;
}

export interface ListInvoicesResult {
  items: InvoiceRecord[];
  total: number;
}

export interface CreateInvoiceItemInput {
  workspaceId?: string;
  productId?: string;
  metricKey?: string;
  subscriptionId?: string;
  itemName: string;
  itemType: string;
  itemUnit?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  usageSummaryRef?: string;
  remark?: string;
}

export interface CreateInvoiceInput {
  tenantId: string;
  subscriptionId?: string;
  billCycle: string;
  cycleStartDate: Date;
  cycleEndDate: Date;
  currency?: string;
  billType?: string;
  createdBy?: string;
  items: CreateInvoiceItemInput[];
}

export interface UpdateInvoiceStatusInput {
  billStatus: string;
  paidAt?: Date;
  paymentMethod?: string;
  transactionNo?: string;
  operatorId?: string;
  operateRemark?: string;
  paidAmount?: number;
  updatedBy?: string;
}
