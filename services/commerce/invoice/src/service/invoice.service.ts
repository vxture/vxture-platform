import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PgInvoiceRepository } from "../repository/pg-invoice.repository";
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

@Injectable()
export class InvoiceService {
  constructor(private readonly repo: PgInvoiceRepository) {}

  async listReceipts(params: ListReceiptsParams): Promise<ListReceiptsResult> {
    return this.repo.listReceipts(params);
  }

  async getReceipt(id: string): Promise<InvoiceReceiptRecord> {
    const record = await this.repo.getReceiptById(id);
    if (!record) throw new NotFoundException(`发票申请 ${id} 不存在`);
    return record;
  }

  async applyReceipt(
    input: ApplyInvoiceReceiptInput,
  ): Promise<InvoiceReceiptRecord> {
    return this.repo.applyReceipt(input);
  }

  async auditReceipt(
    id: string,
    input: AuditInvoiceReceiptInput,
  ): Promise<InvoiceReceiptRecord> {
    const receipt = await this.getReceipt(id);
    if (receipt.invoiceStatus !== "applying") {
      throw new ConflictException("只有申请中的发票可以审核");
    }
    const result = await this.repo.auditReceipt(id, input);
    return result!;
  }

  async shipReceipt(
    id: string,
    input: ShipInvoiceReceiptInput,
  ): Promise<InvoiceReceiptRecord> {
    const receipt = await this.getReceipt(id);
    if (receipt.invoiceStatus !== "issued") {
      throw new ConflictException("只有已开票的发票可以填写快递信息");
    }
    const result = await this.repo.shipReceipt(id, input);
    return result!;
  }

  async listBillingAddresses(
    tenantId: string,
  ): Promise<BillingAddressRecord[]> {
    return this.repo.listBillingAddresses(tenantId);
  }

  async saveBillingAddress(
    id: string | null,
    input: UpsertBillingAddressInput,
  ): Promise<BillingAddressRecord> {
    return this.repo.upsertBillingAddress(id, input);
  }
}
