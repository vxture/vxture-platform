import { describe, expect, it } from "vitest";
import {
  centsToYuan,
  computeDiscountOffCents,
  computeSettlement,
  parseCreditVoucherEffect,
  parseDiscountEffect,
  yuanToCents,
} from "./settlement-math";

// product_321 §5.3 / PR1 verification: money boundary cases. The invariants
// under test: percent floors to the cent, caps stack (max_off then list),
// voucherOff anchors at the OUTSTANDING balance (payable - paid), cashDue
// floors at zero, and a discount that would push payable below the already
// collected amount is unusable (P5 partial-order anchor rule).

describe("yuan/cents conversion", () => {
  it("round-trips NUMERIC(12,2) strings", () => {
    expect(yuanToCents("1200.00")).toBe(120000);
    expect(yuanToCents("0.01")).toBe(1);
    expect(yuanToCents(499)).toBe(49900);
    expect(centsToYuan(96000)).toBe("960.00");
    expect(centsToYuan(1)).toBe("0.01");
  });

  it("rejects garbage input", () => {
    expect(() => yuanToCents("not-a-number")).toThrow();
    expect(() => centsToYuan(12.5)).toThrow();
    expect(() => centsToYuan(-1)).toThrow();
  });
});

describe("computeDiscountOffCents", () => {
  it("percent floors to the cent", () => {
    // 33% off 9.99 = 3.2967 -> 3.29, floored not rounded
    expect(
      computeDiscountOffCents(999, {
        discountType: "percent",
        value: 33,
        maxOffCents: null,
      }),
    ).toBe(329);
  });

  it("applies max_off_cents cap", () => {
    expect(
      computeDiscountOffCents(120000, {
        discountType: "percent",
        value: 20,
        maxOffCents: 5000,
      }),
    ).toBe(5000);
  });

  it("fixed discount never exceeds list price", () => {
    expect(
      computeDiscountOffCents(3000, {
        discountType: "fixed",
        value: 5000,
        maxOffCents: null,
      }),
    ).toBe(3000);
  });

  it("rejects percent outside 0-100", () => {
    expect(() =>
      computeDiscountOffCents(1000, {
        discountType: "percent",
        value: 120,
        maxOffCents: null,
      }),
    ).toThrow();
  });
});

describe("computeSettlement — doc P5 worked example", () => {
  it("1200 - 20% discount - 100 voucher => cashDue 860", () => {
    const q = computeSettlement({
      listPriceCents: 120000,
      paidCents: 0,
      discountEffect: { discountType: "percent", value: 20, maxOffCents: null },
      creditVoucherCents: 10000,
    });
    expect(q.discountOffCents).toBe(24000);
    expect(q.payableCents).toBe(96000);
    expect(q.voucherOffCents).toBe(10000);
    expect(q.cashDueCents).toBe(86000);
    expect(q.discountApplicable).toBe(true);
  });
});

describe("computeSettlement — partial-order anchors (round-3 findings)", () => {
  it("voucherOff caps at outstanding, not payable (paid > 0)", () => {
    // payable 960, already collected 500 -> outstanding 460; voucher face 500
    const q = computeSettlement({
      listPriceCents: 96000,
      paidCents: 50000,
      creditVoucherCents: 50000,
    });
    expect(q.voucherOffCents).toBe(46000);
    expect(q.cashDueCents).toBe(0);
  });

  it("discount pushing payable below collected money is unusable", () => {
    // list 1200, paid 900, 40% off would give payable 720 < 900
    const q = computeSettlement({
      listPriceCents: 120000,
      paidCents: 90000,
      discountEffect: { discountType: "percent", value: 40, maxOffCents: null },
    });
    expect(q.discountApplicable).toBe(false);
    expect(q.discountOffCents).toBe(0);
    expect(q.payableCents).toBe(120000);
    expect(q.cashDueCents).toBe(30000);
  });

  it("cashDue never goes negative", () => {
    const q = computeSettlement({
      listPriceCents: 96000,
      paidCents: 96000,
      creditVoucherCents: 10000,
    });
    expect(q.voucherOffCents).toBe(0);
    expect(q.cashDueCents).toBe(0);
  });

  it("legacy partial order without vouchers: cashDue = true outstanding", () => {
    const q = computeSettlement({ listPriceCents: 96000, paidCents: 50000 });
    expect(q.cashDueCents).toBe(46000);
  });
});

describe("effect parsers", () => {
  it("parses discount effect and tolerates missing cap", () => {
    expect(
      parseDiscountEffect({ discount_type: "percent", value: 20 }),
    ).toEqual({ discountType: "percent", value: 20, maxOffCents: null });
  });

  it("rejects malformed discount effect", () => {
    expect(
      parseDiscountEffect({ discount_type: "bogus", value: 20 }),
    ).toBeNull();
    expect(parseDiscountEffect({ value: 20 })).toBeNull();
  });

  it("rejects out-of-range configs at parse time (dirty batch != 500 at quote)", () => {
    expect(
      parseDiscountEffect({ discount_type: "percent", value: 150 }),
    ).toBeNull();
    expect(
      parseDiscountEffect({ discount_type: "fixed", value: -100 }),
    ).toBeNull();
    expect(
      parseDiscountEffect({
        discount_type: "percent",
        value: 20,
        max_off_cents: -1,
      }),
    ).toBeNull();
  });

  it("parses credit voucher effect, rejects non-positive face", () => {
    expect(parseCreditVoucherEffect({ amount_cents: 10000 })).toEqual({
      amountCents: 10000,
    });
    expect(parseCreditVoucherEffect({ amount_cents: 0 })).toBeNull();
    expect(parseCreditVoucherEffect({})).toBeNull();
  });
});
