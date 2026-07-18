import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import { PgPromotionRepository } from "./pg-promotion.repository";

// SQL-contract tests (product_321 P7/P8b): the availability predicate is the
// security boundary (ownership assertion) and the atomicity mechanism
// (rowCount=1 wins, 230 §5.2). We pin the predicate clauses and the guard
// behavior against a stubbed client — a live-DB race test lands with the PR2
// integration suite.

const SCOPE = { tenantId: "org-1", workspaceId: "ws-1", userId: "u-1" };

let poolQuery: ReturnType<typeof vi.fn>;
let clientQuery: ReturnType<typeof vi.fn>;
let repo: PgPromotionRepository;
let client: PoolClient;

beforeEach(() => {
  poolQuery = vi.fn();
  clientQuery = vi.fn();
  repo = new PgPromotionRepository({ query: poolQuery } as unknown as Pool);
  client = { query: clientQuery } as unknown as PoolClient;
});

const REQUIRED_PREDICATES = [
  "v.status = 'assigned'",
  "v.used_count < v.max_uses",
  "b.kind in ('discount','credit_voucher')",
  "b.tenant_id is null or b.tenant_id = $1",
  "v.assigned_user_id is null or v.assigned_user_id = $2",
  "v.assigned_workspace_id is null or v.assigned_workspace_id = $3",
  // platform-level batches must be targeted — no ownerless wildcard vouchers
  "b.tenant_id is not null",
  "b.status = 'active'",
  "now() >= b.valid_from and now() <= b.valid_until",
  "v.expires_at is null or v.expires_at > now()",
  // not-yet-implemented gate fields must exclude, not silently pass (P7)
  "not (b.effect ? 'applicable_plan_ids')",
  "not (b.effect ? 'min_user_level')",
];

describe("availability predicate (P7 — one predicate, three call sites)", () => {
  it("list, resolve and reserve all carry the full predicate", async () => {
    poolQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    clientQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await repo.listAvailableVouchers(SCOPE);
    await repo.resolveAvailableVoucher(SCOPE, "v-1", "discount");
    await repo.reserve(client, SCOPE, "v-1", "discount");

    const sqls = [
      poolQuery.mock.calls[0]?.[0],
      poolQuery.mock.calls[1]?.[0],
      clientQuery.mock.calls[0]?.[0],
    ] as string[];
    for (const sql of sqls) {
      for (const clause of REQUIRED_PREDICATES) {
        expect(sql).toContain(clause);
      }
    }
  });

  it("scope params bind tenant/user/workspace in fixed positions", async () => {
    poolQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    await repo.listAvailableVouchers(SCOPE);
    expect(poolQuery.mock.calls[0]?.[1]).toEqual(["org-1", "u-1", "ws-1"]);
  });
});

describe("reserve (230 §5.2 atomic contention)", () => {
  it("returns the batch effect when the single UPDATE wins (rowCount 1)", async () => {
    clientQuery.mockResolvedValue({
      rows: [{ effect: { amount_cents: 10000 } }],
      rowCount: 1,
    });
    const won = await repo.reserve(client, SCOPE, "v-1", "credit_voucher");
    expect(won).toEqual({ effect: { amount_cents: 10000 } });
    const sql = clientQuery.mock.calls[0]?.[0] as string;
    expect(sql).toContain("set status = 'reserved'");
    expect(sql).toContain("used_count = v.used_count + 1");
  });

  it("returns null when the race is lost (rowCount 0) — caller 409s", async () => {
    clientQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    expect(await repo.reserve(client, SCOPE, "v-1", "discount")).toBeNull();
  });
});

describe("finalize (idempotent, used_count NOT re-incremented)", () => {
  it("short-circuits when a redemption row already exists", async () => {
    clientQuery.mockResolvedValueOnce({ rows: [{ id: "r-old" }], rowCount: 1 });
    const result = await repo.finalize(client, {
      voucherId: "v-1",
      kind: "discount",
      scope: SCOPE,
      effectSnapshot: {},
      invoiceItemId: "item-1",
    });
    expect(result).toEqual({ redemptionId: "r-old", already: true });
    expect(clientQuery).toHaveBeenCalledTimes(1); // no update, no insert
  });

  it("refuses to redeem a voucher that was never reserved (guard)", async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // no existing redemption
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // flip misses: not reserved
    await expect(
      repo.finalize(client, {
        voucherId: "v-1",
        kind: "discount",
        scope: SCOPE,
        effectSnapshot: {},
        invoiceItemId: "item-1",
      }),
    ).rejects.toThrow(/未处于 reserved/);
    expect(clientQuery).toHaveBeenCalledTimes(2); // no redemption insert
  });

  it("flips reserved -> terminal and inserts the redemption with FK columns", async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // no existing redemption
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // voucher status flip
      .mockResolvedValueOnce({ rows: [{ id: "r-new" }], rowCount: 1 });
    const result = await repo.finalize(client, {
      voucherId: "v-1",
      kind: "credit_voucher",
      scope: SCOPE,
      effectSnapshot: { amount_cents: 10000 },
      paymentId: "pay-1",
    });
    expect(result).toEqual({ redemptionId: "r-new", already: false });

    const flipSql = clientQuery.mock.calls[1]?.[0] as string;
    expect(flipSql).toContain("when used_count >= max_uses");
    expect(flipSql).toContain("where id = $1 and status = 'reserved'");
    expect(flipSql).not.toContain("used_count = used_count + 1"); // taken at reserve

    const insertParams = clientQuery.mock.calls[2]?.[1] as unknown[];
    expect(insertParams[0]).toBe("v-1");
    expect(insertParams[4]).toBe("credit_voucher");
    expect(insertParams[6]).toBeNull(); // invoice_item_id
    expect(insertParams[7]).toBe("pay-1"); // payment_id
  });
});

describe("release (P8b/P10 guards)", () => {
  it("only touches vouchers still in reserved state", async () => {
    clientQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    expect(await repo.release(client, "v-1")).toBe(true);
    const sql = clientQuery.mock.calls[0]?.[0] as string;
    expect(sql).toContain(
      "set status = 'assigned', used_count = used_count - 1",
    );
    expect(sql).toContain("where id = $1 and status = 'reserved'");
  });

  it("reports false for stale credentials (redeemed / re-reserved elsewhere)", async () => {
    clientQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    expect(await repo.release(client, "v-1")).toBe(false);
  });
});
