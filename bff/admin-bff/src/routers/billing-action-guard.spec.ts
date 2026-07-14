import { describe, it, expect, vi } from "vitest";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { Pool } from "pg";
import type { Request } from "express";
import { BillingRouter } from "./billing.router";
import type { RequestContext } from "../types/console.types";

// TD-027 security regression: the 危 actions (discount, red/void) were split onto
// dedicated @RequireStepUp endpoints. A billing.manage / invoice.manage holder must
// NOT be able to reach them via the shared multi-action endpoints (that would bypass
// step-up entirely — client-side routing is no defense against a crafted request).
// These tests also guard against a future refactor re-adding the removed switch cases.

const OPERATOR_ID = "11111111-1111-4111-8111-111111111111";

function makeReq(capabilities: string[]): Request & RequestContext {
  return {
    user: { id: OPERATOR_ID },
    capabilities,
  } as unknown as Request & RequestContext;
}

/** A pool whose connect/query throw if touched — proves no DB work happened. */
function noDbPool(): { pool: Pool; connect: ReturnType<typeof vi.fn> } {
  const connect = vi.fn(() => {
    throw new Error("DB must not be touched");
  });
  const query = vi.fn(() => {
    throw new Error("DB must not be touched");
  });
  return { pool: { connect, query } as unknown as Pool, connect };
}

type BillActionArg = Parameters<BillingRouter["runBillAction"]>[2];
type ReceiptActionArg = Parameters<BillingRouter["runInvoiceReceiptAction"]>[3];
type DiscountArg = Parameters<BillingRouter["discountBill"]>[2];
type VoidArg = Parameters<BillingRouter["voidInvoiceReceipt"]>[3];

describe("billing 危 actions cannot bypass step-up via shared endpoints", () => {
  it("POST :billId/actions rejects action=discount before any DB access", async () => {
    const ro = noDbPool();
    const rw = noDbPool();
    const router = new BillingRouter(ro.pool, rw.pool);

    await expect(
      router.runBillAction(makeReq(["commerce:billing.manage"]), "bill-1", {
        action: "discount",
        discountAmount: 100,
        reason: "crafted",
      } as unknown as BillActionArg),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(rw.connect).not.toHaveBeenCalled();
  });

  it("POST invoice-receipts/:id/actions rejects action=red before any DB access", async () => {
    const ro = noDbPool();
    const rw = noDbPool();
    const router = new BillingRouter(ro.pool, rw.pool);

    await expect(
      router.runInvoiceReceiptAction(
        makeReq(["commerce:invoice.manage"]),
        "bill-1",
        "rcpt-1",
        {
          action: "red",
          statusRemark: "crafted",
        } as unknown as ReceiptActionArg,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(rw.connect).not.toHaveBeenCalled();
  });

  it("dedicated /discount endpoint denies a billing.manage-only holder", async () => {
    const ro = noDbPool();
    const rw = noDbPool();
    const router = new BillingRouter(ro.pool, rw.pool);

    await expect(
      router.discountBill(makeReq(["commerce:billing.manage"]), "bill-1", {
        discountAmount: 100,
        reason: "x",
      } as unknown as DiscountArg),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(rw.connect).not.toHaveBeenCalled();
  });

  it("dedicated /void endpoint denies an invoice.manage-only holder", async () => {
    const ro = noDbPool();
    const rw = noDbPool();
    const router = new BillingRouter(ro.pool, rw.pool);

    await expect(
      router.voidInvoiceReceipt(
        makeReq(["commerce:invoice.manage"]),
        "bill-1",
        "rcpt-1",
        { statusRemark: "x" } as unknown as VoidArg,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(rw.connect).not.toHaveBeenCalled();
  });
});
