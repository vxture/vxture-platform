/**
 * platform-entitlements.service.itest.spec.ts — live-DB proof for
 * PlatformEntitlementsService.resolve(), the C2 hot path (had zero test
 * coverage of any kind before this — added alongside the post-review D10
 * live-coverage-gate dedup, 2026-07-12, specifically to de-risk restructuring
 * queryPools/queryPlatformPools around a shared queryLiveSubscriptionIds()).
 *
 * Fixtures are inserted directly via SQL (not through SubscriptionService)
 * to avoid a cross-package deep import into
 * services/commerce/subscription's unexported PgSubscriptionRepository —
 * and because this test targets the read-side gate specifically, direct
 * control over exactly which pool rows exist is more precise anyway.
 *
 * Gated (needs a seeded platform DB):
 *   PLATFORM_ENTITLEMENTS_ITEST=1 DATABASE_URL=postgresql://... pnpm test
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { PlatformEntitlementsService } from "./platform-entitlements.service";

const RUN = process.env.PLATFORM_ENTITLEMENTS_ITEST === "1";

const USER = "00000000-0000-4000-8000-0000000c0001";
const TENANT = "00000000-0000-4000-8000-0000000c0002";
const WORKSPACE = "00000000-0000-4000-8000-0000000c0003";
const SUBSCRIPTION = "00000000-0000-4000-8000-0000000c0004";

describe.runIf(RUN)(
  "PlatformEntitlementsService.resolve() — D10 live-coverage gate (live DB)",
  () => {
    let pool: Pool;
    let entitlements: PlatformEntitlementsService;

    beforeAll(async () => {
      pool = new Pool({ connectionString: process.env.DATABASE_URL });
      entitlements = new PlatformEntitlementsService(pool);

      await pool.query(
        `insert into account.users (id, account, phone, phone_verified_at, source)
         values ($1, 'c2-itest', '+8613800000497', now(), 'web')
         on conflict (id) do nothing`,
        [USER],
      );
      await pool.query(
        `insert into tenancy.tenants (id, name, type, owner_user_id)
         values ($1, 'C2 Org', 'organization', $2) on conflict (id) do nothing`,
        [TENANT, USER],
      );
      await pool.query(
        `insert into tenancy.workspaces (id, tenant_id, name, is_default)
         values ($1, $2, 'C2 WS', true) on conflict (id) do nothing`,
        [WORKSPACE, TENANT],
      );
      // clean prior-run state
      await pool.query(
        `delete from metering.quota_pools where subscription_id = $1`,
        [SUBSCRIPTION],
      );
      await pool.query(`delete from metering.subscriptions where id = $1`, [
        SUBSCRIPTION,
      ]);

      const pv = await pool.query<{ id: string; product_id: string }>(
        `select pv.id, pc.product_id from product.plan_versions pv
           join product.plans p on p.id = pv.plan_id
           join product.plan_components pc on pc.plan_version_id = pv.id
          where p.plan_code = 'arda-pro' and pv.is_locked = true
            and pc.component_role = 'primary'
          limit 1`,
      );
      const ardaProductId = pv.rows[0]!.product_id;

      await pool.query(
        `insert into metering.subscriptions
           (id, tenant_id, workspace_id, plan_version_id, subscription_kind, cycle_unit, cycle_count,
            status, auto_renew, start_at, currency, created_by_type, created_by_id)
         values ($1, $2, $3, $4, 'paid', 'month', 1, 'active', true, now(), 'CNY', 'customer', $5)`,
        [SUBSCRIPTION, TENANT, WORKSPACE, pv.rows[0]!.id, USER],
      );
      // one product-scoped pool + one L0 platform pool, both contributed by
      // this subscription — exactly the two query paths (queryPools /
      // queryPlatformPools) the dedup fix touches.
      await pool.query(
        `insert into metering.quota_pools
           (workspace_id, subscription_id, product_id, metric_key, quota_limit, quota_used,
            component_role, pool_source, reset_period, period_anchor, current_period_start, status)
         values
           ($1, $2, $3, 'service.api.call', 1000, 0, 'primary', 'subscription', 'month', now(), now(), 'active'),
           ($1, $2, $3, 'ai.credit',        5000, 0, 'primary', 'subscription', 'month', now(), now(), 'active')`,
        [WORKSPACE, SUBSCRIPTION, ardaProductId],
      );
    });

    afterAll(async () => {
      await pool.end();
    });

    it("active subscription: product pool AND L0 platform pool (ai.credit) are both visible", async () => {
      const view = await entitlements.resolve(WORKSPACE, ["arda"]);
      const metrics = view["arda"]!.quota_pools.map((p) => p.metric);
      expect(metrics).toContain("service.api.call");
      expect(metrics).toContain("ai.credit");
      expect(view["arda"]!.status).toBe("active");
    });

    it("after the subscription lapses (cancelled): both pool kinds drop out of resolve()", async () => {
      await pool.query(
        `update metering.subscriptions set status = 'cancelled', updated_at = now() where id = $1`,
        [SUBSCRIPTION],
      );

      const view = await entitlements.resolve(WORKSPACE, ["arda"]);
      const metrics = view["arda"]!.quota_pools.map((p) => p.metric);
      expect(metrics).not.toContain("service.api.call");
      expect(metrics).not.toContain("ai.credit");

      // the pool rows themselves are NOT retired (read-side gating, per the
      // code's own comment) — confirms this is the live-coverage GATE
      // filtering them out, not a data-mutation side effect.
      const raw = await pool.query(
        `select 1 from metering.quota_pools where subscription_id = $1 and status = 'active'`,
        [SUBSCRIPTION],
      );
      expect(raw.rows.length).toBe(2);
    });
  },
);
