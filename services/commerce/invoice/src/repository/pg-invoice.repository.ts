import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { COMMERCE_PG_POOL } from "../tokens";
import type {
  InvoiceReceiptRecord,
  BillingAddressRecord,
  ListReceiptsParams,
  ListReceiptsResult,
  ApplyInvoiceReceiptInput,
  AuditInvoiceReceiptInput,
  ShipInvoiceReceiptInput,
  UpsertBillingAddressInput,
} from "../types/invoice.types";

interface ReceiptRow {
  id: string;
  tenant_id: string;
  bill_id: string;
  invoice_no: string;
  invoice_type: string;
  invoice_tax_type: string;
  invoice_title: string;
  tax_no: string | null;
  company_info: Record<string, unknown>;
  bank_info: Record<string, unknown> | null;
  address_info: Record<string, unknown> | null;
  invoice_amount: string;
  tax_amount: string;
  currency: string;
  invoice_status: string;
  status_remark: string | null;
  invoice_code: string | null;
  invoice_electronic_no: string | null;
  invoice_file_url: string | null;
  issued_at: Date | null;
  express_company: string | null;
  express_no: string | null;
  send_at: Date | null;
  created_by_type: string;
  created_by_id: string;
  auditor_id: string | null;
  audit_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

interface AddressRow {
  id: string;
  tenant_id: string;
  invoice_tax_type: string;
  title: string;
  tax_no: string | null;
  phone: string | null;
  address: string | null;
  bank_name: string | null;
  bank_account: string | null;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

@Injectable()
export class PgInvoiceRepository {
  constructor(@Inject(COMMERCE_PG_POOL) private readonly pool: Pool) {}

  async listReceipts(params: ListReceiptsParams): Promise<ListReceiptsResult> {
    const conditions: string[] = ["deleted_at is null"];
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
    if (params.invoiceStatus) {
      conditions.push(`invoice_status = $${idx++}`);
      values.push(params.invoiceStatus);
    }

    const where = conditions.join(" and ");
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const [countResult, rowsResult] = await Promise.all([
      this.pool.query<{ count: string }>(
        `select count(*) as count from billing.invoice_receipts where ${where}`,
        values,
      ),
      this.pool.query<ReceiptRow>(
        `select * from billing.invoice_receipts where ${where}
         order by created_at desc limit $${idx} offset $${idx + 1}`,
        [...values, pageSize, offset],
      ),
    ]);

    return {
      total: parseInt(countResult.rows[0]?.count ?? "0", 10),
      items: rowsResult.rows.map(this.mapReceipt),
    };
  }

  async getReceiptById(id: string): Promise<InvoiceReceiptRecord | null> {
    const result = await this.pool.query<ReceiptRow>(
      `select * from billing.invoice_receipts where id = $1 and deleted_at is null limit 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? this.mapReceipt(row) : null;
  }

  async applyReceipt(
    input: ApplyInvoiceReceiptInput,
  ): Promise<InvoiceReceiptRecord> {
    const invoiceNo = generateInvoiceNo();
    const result = await this.pool.query<ReceiptRow>(
      `insert into billing.invoice_receipts (
        tenant_id, bill_id, invoice_no,
        invoice_type, invoice_tax_type, invoice_title, tax_no,
        company_info, bank_info, address_info,
        invoice_amount, tax_amount, currency,
        invoice_status, created_by_type, created_by_id, created_at, updated_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13,
        'applying', 'customer', $14, now(), now()
      ) returning *`,
      [
        input.tenantId,
        input.billId,
        invoiceNo,
        input.invoiceType,
        input.invoiceTaxType,
        input.invoiceTitle,
        input.taxNo ?? null,
        JSON.stringify(input.companyInfo),
        input.bankInfo ? JSON.stringify(input.bankInfo) : null,
        input.addressInfo ? JSON.stringify(input.addressInfo) : null,
        input.invoiceAmount,
        input.taxAmount ?? 0,
        input.currency ?? "CNY",
        input.createdBy,
      ],
    );
    return this.mapReceipt(result.rows[0]!);
  }

  async auditReceipt(
    id: string,
    input: AuditInvoiceReceiptInput,
  ): Promise<InvoiceReceiptRecord | null> {
    const result = await this.pool.query<ReceiptRow>(
      `update billing.invoice_receipts set
        invoice_status       = $2,
        status_remark        = coalesce($3, status_remark),
        auditor_id           = $4,
        audit_at             = now(),
        invoice_code         = coalesce($5, invoice_code),
        invoice_electronic_no = coalesce($6, invoice_electronic_no),
        invoice_file_url     = coalesce($7, invoice_file_url),
        issued_at            = coalesce($8, issued_at),
        updated_at           = now()
       where id = $1 and deleted_at is null
       returning *`,
      [
        id,
        input.invoiceStatus,
        input.statusRemark ?? null,
        input.auditorId,
        input.invoiceCode ?? null,
        input.invoiceElectronicNo ?? null,
        input.invoiceFileUrl ?? null,
        input.issuedAt ?? null,
      ],
    );
    const row = result.rows[0];
    return row ? this.mapReceipt(row) : null;
  }

  async shipReceipt(
    id: string,
    input: ShipInvoiceReceiptInput,
  ): Promise<InvoiceReceiptRecord | null> {
    const result = await this.pool.query<ReceiptRow>(
      `update billing.invoice_receipts set
        express_company = $2,
        express_no      = $3,
        send_at         = now(),
        invoice_status  = 'sent',
        updated_at      = now()
       where id = $1 and deleted_at is null
       returning *`,
      [id, input.expressCompany, input.expressNo],
    );
    const row = result.rows[0];
    return row ? this.mapReceipt(row) : null;
  }

  async listBillingAddresses(
    tenantId: string,
  ): Promise<BillingAddressRecord[]> {
    const result = await this.pool.query<AddressRow>(
      `select * from billing.billing_addresses
       where tenant_id = $1 and deleted_at is null
       order by is_default desc, created_at desc`,
      [tenantId],
    );
    return result.rows.map(this.mapAddress);
  }

  async upsertBillingAddress(
    id: string | null,
    input: UpsertBillingAddressInput,
  ): Promise<BillingAddressRecord> {
    if (id) {
      const result = await this.pool.query<AddressRow>(
        `update billing.billing_addresses set
          invoice_tax_type = $2, title = $3, tax_no = $4,
          phone = $5, address = $6, bank_name = $7, bank_account = $8,
          is_default = coalesce($9, is_default),
          updated_at = now()
         where id = $1 and tenant_id = $10 and deleted_at is null
         returning *`,
        [
          id,
          input.invoiceType,
          input.title,
          input.taxNo ?? null,
          input.phone ?? null,
          input.address ?? null,
          input.bankName ?? null,
          input.bankAccount ?? null,
          input.isDefault ?? null,
          input.tenantId,
        ],
      );
      return this.mapAddress(result.rows[0]!);
    }

    const result = await this.pool.query<AddressRow>(
      `insert into billing.billing_addresses (
        tenant_id, invoice_tax_type, title, tax_no,
        phone, address, bank_name, bank_account,
        is_default, created_at, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())
      returning *`,
      [
        input.tenantId,
        input.invoiceType,
        input.title,
        input.taxNo ?? null,
        input.phone ?? null,
        input.address ?? null,
        input.bankName ?? null,
        input.bankAccount ?? null,
        input.isDefault ?? false,
      ],
    );
    return this.mapAddress(result.rows[0]!);
  }

  private mapReceipt(row: ReceiptRow): InvoiceReceiptRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      billId: row.bill_id,
      invoiceNo: row.invoice_no,
      invoiceType: row.invoice_type,
      invoiceTaxType: row.invoice_tax_type,
      invoiceTitle: row.invoice_title,
      taxNo: row.tax_no,
      companyInfo: row.company_info,
      bankInfo: row.bank_info,
      addressInfo: row.address_info,
      invoiceAmount: row.invoice_amount,
      taxAmount: row.tax_amount,
      currency: row.currency,
      invoiceStatus: row.invoice_status,
      statusRemark: row.status_remark,
      invoiceCode: row.invoice_code,
      invoiceElectronicNo: row.invoice_electronic_no,
      invoiceFileUrl: row.invoice_file_url,
      issuedAt: row.issued_at,
      expressCompany: row.express_company,
      expressNo: row.express_no,
      sendAt: row.send_at,
      createdBy: row.created_by_id,
      auditorId: row.auditor_id,
      auditAt: row.audit_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  private mapAddress(row: AddressRow): BillingAddressRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      invoiceType: row.invoice_tax_type,
      title: row.title,
      taxNo: row.tax_no,
      phone: row.phone,
      address: row.address,
      bankName: row.bank_name,
      bankAccount: row.bank_account,
      isDefault: row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }
}

function generateInvoiceNo(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `FP-${ts}${rand}`;
}
