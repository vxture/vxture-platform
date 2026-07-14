/**
 * arda-catalog.itest.spec.ts — arda five-tier catalog materialization
 * (product_310 P2.5 precondition; catalog = arda-biz-260 §3 via seed-catalog).
 * Live DB with the current DDL + seed applied; gated like the wire itest:
 *   SUBSCRIPTION_ITEST=1 DATABASE_URL=postgresql://... pnpm test
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import {
  PgProvisioningRepository,
  ProvisioningService,
} from "@vxture/service-provisioning";
import { PgSubscriptionRepository } from "../repository/pg-subscription.repository";
import { PgConsumeRepository } from "../repository/pg-consume.repository";
import { SubscriptionService } from "./subscription.service";

const RUN = process.env.SUBSCRIPTION_ITEST === "1";
const USER = "00000000-0000-4000-aaaa-000000000451";
const TENANT = "00000000-0000-4000-bbbb-000000000451";
const WORKSPACE = "00000000-0000-4000-cccc-000000000451";

describe.skipIf(!RUN)("arda catalog → pool materialization (live DB)", () => {
  let pool: Pool;
  let service: SubscriptionService;

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const provisioning = new ProvisioningService(
      new PgProvisioningRepository(pool),
      // enqueue-only usage: dispatch config/secrets/alerts never exercised
      {
        maxAttempts: 1,
        backoffBaseSec: 1,
        backoffCapSec: 1,
        leaseSeconds: 1,
        batchSize: 1,
        timeoutMs: 1000,
      },
      { resolve: () => null },
      { deliveryFailed: () => {} },
    );
    service = new SubscriptionService(
      new PgSubscriptionRepository(pool),
      provisioning,
    );

    await pool.query(
      `insert into account.users (id, account, phone, phone_verified_at, source)
       values ($1, 'p45-itest', '+8613800000451', now(), 'web')
       on conflict (id) do nothing`,
      [USER],
    );
    await pool.query(
      `insert into tenancy.tenants (id, name, type, owner_user_id)
       values ($1, 'P45 Org', 'organization', $2) on conflict (id) do nothing`,
      [TENANT, USER],
    );
    await pool.query(
      `insert into tenancy.workspaces (id, tenant_id, name, is_default)
       values ($1, $2, 'P45 WS', true) on conflict (id) do nothing`,
      [WORKSPACE, TENANT],
    );
    // clean prior-run state (subscriptions have append-only histories; neutralize)
    await pool.query(
      `update metering.subscriptions set status = 'cancelled', updated_at = now()
        where workspace_id = $1 and status in ('active','trialing')`,
      [WORKSPACE],
    );
    await pool.query(
      `update metering.quota_pools set status = 'retired', retired_at = now()
        where workspace_id = $1 and status = 'active'`,
      [WORKSPACE],
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it("subscribing arda-pro materializes the four pools with monthly anchors", async () => {
    // current version = pricing v2 (product_320); v1 stays locked behind it.
    const pv = await pool.query<{ id: string }>(
      `select pv.id from product.plan_versions pv
         join product.plans p on p.current_version_id = pv.id
        where p.plan_code = 'arda-pro' and pv.is_locked = true`,
    );
    expect(pv.rows).toHaveLength(1);

    const record = await service.createSubscription({
      tenantId: TENANT,
      workspaceId: WORKSPACE,
      planVersionId: pv.rows[0]!.id,
      cycleType: "month",
      startAt: new Date(),
      createdBy: USER,
    });
    expect(record.status).toBe("active");

    const pools = await pool.query<{
      metric_key: string;
      quota_limit: string;
      reset_period: string;
      period_anchor: Date | null;
      current_period_start: Date | null;
    }>(
      `select metric_key, quota_limit, reset_period, period_anchor, current_period_start, component_role
         from metering.quota_pools
        where subscription_id = $1 order by metric_key`,
      [record.id],
    );
    const byMetric = Object.fromEntries(
      pools.rows.map((r) => [r.metric_key, r]),
    );
    // 2 product-scoped pools + 2 L0 platform-metric contributions (D7):
    // storage.bytes + ai.credit are platform metrics, contributed via quota keys.
    expect(Object.keys(byMetric).sort()).toEqual([
      "ai.credit",
      "quality.check.run",
      "service.api.call",
      "storage.bytes",
    ]);
    // biz-260 §3b pro presets, ai.credit re-calibrated by pricing v2 (product_320 §1.3)
    expect(byMetric["service.api.call"]!.quota_limit).toBe("200000");
    expect(byMetric["quality.check.run"]!.quota_limit).toBe("10000");
    expect(byMetric["ai.credit"]!.quota_limit).toBe("1000");
    expect(byMetric["storage.bytes"]!.quota_limit).toBe(
      String(100 * 1024 * 1024 * 1024),
    );
    // all pooled rows carry the contributing component's role (D6)
    for (const row of pools.rows) {
      expect(
        (row as { component_role?: string }).component_role ?? "primary",
      ).toBe("primary");
    }
    // counters are monthly and anchored at the subscription start (R5);
    // storage stays a non-resetting gauge-backed pool (D5)
    for (const key of ["service.api.call", "quality.check.run", "ai.credit"]) {
      expect(byMetric[key]!.reset_period).toBe("month");
      expect(byMetric[key]!.period_anchor).not.toBeNull();
      expect(byMetric[key]!.current_period_start).not.toBeNull();
    }
    expect(byMetric["storage.bytes"]!.reset_period).toBe("none");
    expect(byMetric["storage.bytes"]!.period_anchor).toBeNull();
  });

  it("pricing v2 is the current locked version with month+year price pairs (product_320 §1.2)", async () => {
    const rows = await pool.query<{
      plan_code: string;
      version_no: number;
      is_locked: boolean;
      prices: { cycle_unit: string; price: string }[];
      quota: Record<string, unknown>;
    }>(
      `select p.plan_code, pv.version_no, pv.is_locked,
              coalesce((select jsonb_agg(jsonb_build_object('cycle_unit', pp.cycle_unit, 'price', pp.price::text) order by pp.cycle_unit)
                          from product.plan_prices pp where pp.plan_version_id = pv.id), '[]'::jsonb) as prices,
              (select pc.quota from product.plan_components pc
                where pc.plan_version_id = pv.id and pc.component_role = 'primary' limit 1) as quota
         from product.plans p
         join product.plan_versions pv on pv.id = p.current_version_id
        where p.plan_code like 'arda-%' order by p.plan_code`,
    );
    const byCode = Object.fromEntries(rows.rows.map((r) => [r.plan_code, r]));
    // every current version is locked (queryPlanLadder precondition)
    for (const r of rows.rows) expect(r.is_locked).toBe(true);
    // paid tiers: v2 with the owner price pairs
    const priceMap = (code: string) =>
      Object.fromEntries(
        byCode[code]!.prices.map((x) => [x.cycle_unit, Number(x.price)]),
      );
    for (const [code, month, year] of [
      ["arda-starter", 199, 1999],
      ["arda-pro", 499, 4999],
      ["arda-business", 1999, 19999],
    ] as const) {
      expect(byCode[code]!.version_no).toBe(2);
      expect(priceMap(code)).toEqual({ month, year });
    }
    // enterprise: v2, contact-sales = zero price rows
    expect(byCode["arda-enterprise"]!.version_no).toBe(2);
    expect(byCode["arda-enterprise"]!.prices).toEqual([]);
    // free & beta stay on v1 (month@0)
    expect(byCode["arda-free"]!.version_no).toBe(1);
    expect(priceMap("arda-free")).toEqual({ month: 0 });
    expect(byCode["arda-beta-trial"]!.version_no).toBe(1);
    // v2 quota re-calibration (product_320 §1.3)
    expect(byCode["arda-starter"]!.quota["ai.credit"]).toBe(100);
    expect(byCode["arda-pro"]!.quota["member.max"]).toBe(3);
    expect(byCode["arda-business"]!.quota["member.max"]).toBe(5);
    expect(byCode["arda-business"]!.quota["ai.credit"]).toBe(10000);
    // untouched keys survive the jsonb patch copy
    expect(byCode["arda-business"]!.quota["datasource.max"]).toBe(100);
  });

  it("consume_mode split across catalogs per R5/D7", async () => {
    // product-scoped pool metrics (counters, divisible)
    const prod = await pool.query<{ metric_key: string; consume_mode: string }>(
      `select pm.metric_key, pm.consume_mode
         from product.product_metrics pm
         join product.products p on p.id = pm.product_id
        where p.product_code = 'arda' and pm.merge_strategy = 'pool'
        order by pm.metric_key`,
    );
    expect(
      Object.fromEntries(prod.rows.map((r) => [r.metric_key, r.consume_mode])),
    ).toEqual({
      "quality.check.run": "divisible",
      "service.api.call": "divisible",
    });
    // L0 platform metrics: ai.credit atomic counter, storage.bytes gauge
    const plat = await pool.query<{
      metric_key: string;
      kind: string;
      consume_mode: string | null;
    }>(
      `select metric_key, kind, consume_mode from product.platform_metrics
        where status = 'active' order by metric_key`,
    );
    expect(
      Object.fromEntries(
        plat.rows.map((r) => [r.metric_key, [r.kind, r.consume_mode]]),
      ),
    ).toEqual({
      "ai.credit": ["counter", "atomic"],
      "storage.bytes": ["gauge", null],
    });
    // the shadow guard forbids a product from redeclaring a platform key
    await expect(
      pool.query(
        `insert into product.product_metrics (product_id, metric_key, merge_strategy)
         select id, 'ai.credit', 'pool' from product.products where product_code='arda'`,
      ),
    ).rejects.toThrow(/platform metric key/);
  });
});

describe.skipIf(!RUN)("reserved vs shared pools (D8, live DB)", () => {
  const T = "00000000-0000-4000-bbbb-000000000452";
  const W = "00000000-0000-4000-cccc-000000000452";
  const U = "00000000-0000-4000-aaaa-000000000452";
  const ARDA_SUB = "00000000-0000-4000-9999-000000000452";
  const SECO = "00000000-0000-4000-dddd-000000000452";
  const SECO_SUB = "00000000-0000-4000-9999-000000000453";
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const q = (t: string, v: unknown[] = []) => pool.query(t, v);
    await q(
      `insert into account.users (id, account, phone, phone_verified_at, source) values ($1,'p452','+8613800000452',now(),'web') on conflict (id) do nothing`,
      [U],
    );
    await q(
      `insert into tenancy.tenants (id, name, type, owner_user_id) values ($1,'P452','organization',$2) on conflict (id) do nothing`,
      [T, U],
    );
    await q(
      `insert into tenancy.workspaces (id, tenant_id, name, is_default) values ($1,$2,'P452 WS',true) on conflict (id) do nothing`,
      [W, T],
    );
    await q(
      `insert into product.product_categories (id, code, name, sort) values (52,'p452cat','P452',52) on conflict (id) do nothing`,
    );
    await q(
      `insert into product.products (id, product_code, product_type, category_id, product_name, product_nick, description, description_key, status, created_by) values ($1,'seco2','data_platform',52,'Seco2','Seco2','d','k','active',$2) on conflict (id) do nothing`,
      [SECO, U],
    );
    await q(
      `delete from metering.resource_sharing_policies where workspace_id=$1`,
      [W],
    );
    await q(`delete from metering.quota_pools where workspace_id=$1`, [W]);
    const ardaId = (
      await pool.query<{ id: string }>(
        `select id from product.products where product_code='arda'`,
      )
    ).rows[0]!.id;
    for (const sub of [ARDA_SUB, SECO_SUB]) {
      await q(
        `insert into metering.subscriptions (id, tenant_id, workspace_id, plan_version_id, subscription_kind, cycle_unit, cycle_count, start_at, status, created_by_type, created_by_id) select $1,$2,$3, pv.id,'paid','month',1,now(),'active','system',$4 from product.plan_versions pv join product.plans p on p.current_version_id=pv.id where p.plan_code='arda-pro' on conflict (id) do nothing`,
        [sub, T, W, U],
      );
    }
    for (const [sub, pid, lim] of [
      [ARDA_SUB, ardaId, 500],
      [SECO_SUB, SECO, 300],
    ] as [string, string, number][]) {
      await q(
        `insert into metering.quota_pools (workspace_id, subscription_id, product_id, metric_key, quota_limit, quota_used, priority, component_role, pool_source, reset_period, period_anchor, current_period_start, status, effective_at) values ($1,$2,$3,'ai.credit',$4,0,100,'primary','subscription','month',now(),now(),'active',now())`,
        [W, sub, pid, lim],
      );
    }
  });
  afterAll(async () => {
    await pool.end();
  });

  it("reserved default: seco2 consuming 400 is insufficient (own 300 only, atomic)", async () => {
    const repo = new PgConsumeRepository(pool);
    const r = await repo.consume({
      workspaceId: W,
      productId: SECO,
      metricKey: "ai.credit",
      amount: 400,
      idempotencyKey: "d8-reserved-1",
    });
    expect(r.status).toBe("insufficient");
    expect(r.consumed).toBe("0"); // arda's 500 is not reachable without policy
  });

  it("shared policy: seco2 consuming 400 burns own 300 + arda 100, attributed to seco2", async () => {
    await pool.query(
      `insert into metering.resource_sharing_policies (workspace_id, tenant_id, metric_key, product_id, created_by_type) select $1,$2,'ai.credit', id,'customer' from product.products where product_code in ('arda','seco2') on conflict do nothing`,
      [W, T],
    );
    const repo = new PgConsumeRepository(pool);
    const r = await repo.consume({
      workspaceId: W,
      productId: SECO,
      metricKey: "ai.credit",
      amount: 400,
      idempotencyKey: "d8-shared-1",
    });
    expect(r.status).toBe("ok");
    expect(r.consumed).toBe("400");
    const arda = await pool.query<{ remaining: string }>(
      `select (quota_limit - quota_used)::text as remaining from metering.quota_pools qp join product.products p on p.id=qp.product_id where qp.workspace_id=$1 and qp.metric_key='ai.credit' and p.product_code='arda'`,
      [W],
    );
    expect(arda.rows[0]!.remaining).toBe("400");
    const ue = await pool.query<{ product_code: string; total_amount: string }>(
      `select p.product_code, ue.total_amount::text from metering.usage_events ue join product.products p on p.id=ue.product_id where ue.workspace_id=$1 and ue.metric_key='ai.credit'`,
      [W],
    );
    expect(ue.rows).toHaveLength(1);
    expect(ue.rows[0]!.product_code).toBe("seco2");
    expect(ue.rows[0]!.total_amount).toBe("400");
  });
});
