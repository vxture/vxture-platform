// 增值税发票（开票申请 + 状态流转）
export interface InvoiceReceiptRecord {
  id: string;
  tenantId: string;
  billId: string;
  invoiceNo: string;
  invoiceType: string;
  invoiceTaxType: string;
  invoiceTitle: string;
  taxNo: string | null;
  companyInfo: Record<string, unknown>;
  bankInfo: Record<string, unknown> | null;
  addressInfo: Record<string, unknown> | null;
  invoiceAmount: string;
  taxAmount: string;
  currency: string;
  invoiceStatus: string;
  statusRemark: string | null;
  invoiceCode: string | null;
  invoiceElectronicNo: string | null;
  invoiceFileUrl: string | null;
  issuedAt: Date | null;
  expressCompany: string | null;
  expressNo: string | null;
  sendAt: Date | null;
  createdBy: string;
  auditorId: string | null;
  auditAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface BillingAddressRecord {
  id: string;
  tenantId: string;
  invoiceType: string;
  title: string;
  taxNo: string | null;
  phone: string | null;
  address: string | null;
  bankName: string | null;
  bankAccount: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ListReceiptsParams {
  tenantId?: string;
  billId?: string;
  invoiceStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface ListReceiptsResult {
  items: InvoiceReceiptRecord[];
  total: number;
}

export interface ApplyInvoiceReceiptInput {
  tenantId: string;
  billId: string;
  invoiceType: string;
  invoiceTaxType: string;
  invoiceTitle: string;
  taxNo?: string;
  companyInfo: Record<string, unknown>;
  bankInfo?: Record<string, unknown>;
  addressInfo?: Record<string, unknown>;
  invoiceAmount: number;
  taxAmount?: number;
  currency?: string;
  createdBy: string;
}

export interface AuditInvoiceReceiptInput {
  invoiceStatus: string;
  statusRemark?: string;
  auditorId: string;
  invoiceCode?: string;
  invoiceElectronicNo?: string;
  invoiceFileUrl?: string;
  issuedAt?: Date;
}

export interface ShipInvoiceReceiptInput {
  expressCompany: string;
  expressNo: string;
}

export interface UpsertBillingAddressInput {
  tenantId: string;
  invoiceType: string;
  title: string;
  taxNo?: string;
  phone?: string;
  address?: string;
  bankName?: string;
  bankAccount?: string;
  isDefault?: boolean;
}
