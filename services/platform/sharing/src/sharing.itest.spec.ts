/**
 * sharing.itest.spec.ts — sharing domain integration test (product_310 P4.3).
 * Real repositories against a local Postgres with the 19-schema DDL applied.
 * Gated by SHARING_ITEST so CI (no DB) skips it. Run locally:
 *   SHARING_ITEST=1 DATABASE_URL=postgresql://... pnpm test
 *
 * Creates its own tenant/workspace/product/webhook fixture rows (idempotent).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import {
  PgProvisioningRepository,
  ProvisioningService,
} from "@vxture/service-provisioning";
import { PgSharingRepository } from "./repository/pg-sharing.repository";
import { SharingService } from "./service/sharing.service";

const RUN = process.env.SHARING_ITEST === "1";
const USER = "00000000-0000-4000-aaaa-000000000431";
const TENANT = "00000000-0000-4000-bbbb-000000000431";
const WS_OWNER = "00000000-0000-4000-cccc-000000000431";
const WS_GRANTEE = "00000000-0000-4000-cccc-000000000432";
const PRODUCT = "00000000-0000-4000-dddd-000000000431"; // fixture asset-plane product

describe.skipIf(!RUN)(
  "sharing grants → visible set → invalidate (live DB)",
  () => {
    let pool: Pool;
    let service: SharingService;
    let repo: PgSharingRepository;

    beforeAll(async () => {
      pool = new Pool({ connectionString: process.env.DATABASE_URL });
      repo = new PgSharingRepository(pool);
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
      service = new SharingService(repo, provisioning, {
        ttlSeconds: 30,
        sweepBatch: 100,
      });

      await pool.query(
        `insert into account.users (id, account, phone, phone_verified_at, source)
       values ($1, 'p43-itest', '+8613800000431', now(), 'web')
       on conflict (id) do nothing`,
        [USER],
      );
      await pool.query(
        `insert into tenancy.tenants (id, name, type, owner_user_id)
       values ($1, 'P43 Org', 'organization', $2) on conflict (id) do nothing`,
        [TENANT, USER],
      );
      await pool.query(
        `insert into tenancy.workspaces (id, tenant_id, name, is_default) values
         ($1, $3, 'P43 Owner WS', true),
         ($2, $3, 'P43 Grantee WS', false)
       on conflict (id) do nothing`,
        [WS_OWNER, WS_GRANTEE, TENANT],
      );
      await pool.query(
        `insert into product.product_categories (id, code, name, sort)
       values (43, 'p43-cat', 'P43', 43) on conflict (id) do nothing`,
      );
      await pool.query(
        `insert into product.products
         (id, product_code, product_type, category_id, product_name, product_nick,
          description, description_key, status, created_by)
       values ($1, 'p43data', 'data_platform', 43, 'P43', 'P43', 'd', 'k', 'active', $2)
       on conflict (id) do nothing`,
        [PRODUCT, USER],
      );
      await pool.query(
        `insert into product.product_webhooks (product_id, home_url, webhook_url, webhook_secret_ref)
       values ($1, 'https://p43.example', 'https://p43.example/provisioning/webhook', 'P43_SECRET')
       on conflict (product_id) do nothing`,
        [PRODUCT],
      );
      // clean any residue from prior runs
      await pool.query(`delete from sharing.grants where tenant_id = $1`, [
        TENANT,
      ]);
      await pool.query(
        `delete from sharing.visible_set_current where tenant_id = $1`,
        [TENANT],
      );
      await pool.query(
        `delete from sharing.visible_set_refresh where tenant_id = $1`,
        [TENANT],
      );
      await pool.query(
        `delete from provisioning.webhook_deliveries where tenant_id = $1`,
        [TENANT],
      );
    });

    afterAll(async () => {
      await pool.end();
    });

    it("empty visible set materializes a fresh empty anchor", async () => {
      const res = await service.resolveVisibleSet(WS_GRANTEE, "p43data");
      expect(res.resources).toEqual([]);
      const anchor = await repo.readAnchor(WS_GRANTEE, PRODUCT);
      expect(anchor).not.toBeNull();
    });

    it("a new grant invalidates the anchor and shows up on the next resolve", async () => {
      await service.createGrant({
        tenantId: TENANT,
        resourceType: "dataset",
        resourceProductId: PRODUCT,
        resourceWorkspaceId: WS_OWNER,
        resourceRef: "ds-alpha",
        granteeType: "workspace",
        granteeWorkspaceId: WS_GRANTEE,
        scope: "read",
        createdByType: "customer",
        createdById: USER,
      });
      // anchor was deleted synchronously with the grant write
      expect(await repo.readAnchor(WS_GRANTEE, PRODUCT)).toBeNull();
      const res = await service.resolveVisibleSet(WS_GRANTEE, "p43data");
      expect(res.resources).toEqual([
        {
          resource_type: "dataset",
          resource_product: "p43data",
          resource_workspace_id: WS_OWNER,
          resource_ref: "ds-alpha",
          scope: "read",
          expires_at: null,
        },
      ]);
    });

    it("a fresh anchor serves the materialized rows (no recompute)", async () => {
      const first = await service.resolveVisibleSet(WS_GRANTEE, "p43data");
      const second = await service.resolveVisibleSet(WS_GRANTEE, "p43data");
      expect(second.refreshed_at).toBe(first.refreshed_at);
    });

    it("org_all grants hit any caller workspace in the org", async () => {
      await service.createGrant({
        tenantId: TENANT,
        resourceType: "dataset",
        resourceProductId: PRODUCT,
        resourceWorkspaceId: WS_OWNER,
        resourceRef: "ds-orgwide",
        granteeType: "org_all",
        scope: "read",
        createdByType: "customer",
      });
      const res = await service.resolveVisibleSet(WS_GRANTEE, "p43data");
      const refs = res.resources.map((r) => r.resource_ref).sort();
      expect(refs).toEqual(["ds-alpha", "ds-orgwide"]);
    });

    it("revoke removes visibility synchronously and enqueues grant.invalidated", async () => {
      const grants = await pool.query<{ id: string }>(
        `select id from sharing.grants
        where tenant_id = $1 and resource_ref = 'ds-alpha' and status = 'active'`,
        [TENANT],
      );
      const record = await service.revokeGrant({
        grantId: grants.rows[0]!.id,
        revokedByType: "customer",
        revokedById: USER,
      });
      expect(record.status).toBe("revoked");
      // next resolve recomputes (anchor gone) and no longer sees ds-alpha
      const res = await service.resolveVisibleSet(WS_GRANTEE, "p43data");
      expect(res.resources.map((r) => r.resource_ref)).toEqual(["ds-orgwide"]);
      // the push landed on the delivery queue with the deterministic key
      const delivery = await pool.query<{
        event_type: string;
        payload: { data: { reason: string; grant_id: string } };
      }>(
        `select event_type, payload from provisioning.webhook_deliveries
        where idempotency_key = $1`,
        [`${record.id}:grant.invalidated:revoked`],
      );
      expect(delivery.rows).toHaveLength(1);
      expect(delivery.rows[0]!.event_type).toBe("grant.invalidated");
      expect(delivery.rows[0]!.payload.data.reason).toBe("revoked");
    });

    it("expiry sweep emits grant.invalidated once and converges", async () => {
      const expired = await service.createGrant({
        tenantId: TENANT,
        resourceType: "dataset",
        resourceProductId: PRODUCT,
        resourceWorkspaceId: WS_OWNER,
        resourceRef: "ds-expiring",
        granteeType: "workspace",
        granteeWorkspaceId: WS_GRANTEE,
        scope: "read",
        expiresAt: new Date(Date.now() - 1000),
        createdByType: "customer",
      });
      // expired grants never enter the visible set
      const res = await service.resolveVisibleSet(WS_GRANTEE, "p43data");
      expect(res.resources.map((r) => r.resource_ref)).toEqual(["ds-orgwide"]);

      expect(await service.sweepExpired()).toBe(1);
      expect(await service.sweepExpired()).toBe(0); // converged

      const delivery = await pool.query(
        `select id from provisioning.webhook_deliveries where idempotency_key = $1`,
        [`${expired.id}:grant.invalidated:expired`],
      );
      expect(delivery.rows).toHaveLength(1);
    });
  },
);
