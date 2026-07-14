/**
 * pg-sharing.repository.ts — sharing.grants (SoT) + visible_set_current /
 * visible_set_refresh (lazy-TTL materialization), data_sharing_200.
 * @package @vxture/service-sharing
 * @layer Infrastructure
 *
 * Write-path invalidation is synchronous and transactional with the grant
 * write (data_sharing_200 §2.3): deleting the freshness anchors of affected
 * callers is what makes revocation take effect on the next read.
 */
import { Inject, Injectable } from "@nestjs/common";
import type { Pool, PoolClient } from "pg";
import { SHARING_PG_POOL } from "../tokens";
import type { HitGrant, MergedVisibleRow } from "../visible-set";
import type {
  CreateGrantInput,
  GrantRecord,
  RevokeGrantInput,
} from "../types/sharing.types";

interface GrantRow {
  id: string;
  tenant_id: string;
  resource_type: GrantRecord["resourceType"];
  resource_product_id: string;
  resource_workspace_id: string;
  resource_ref: string;
  grantee_type: GrantRecord["granteeType"];
  grantee_workspace_id: string | null;
  grantee_product_id: string | null;
  scope: GrantRecord["scope"];
  status: GrantRecord["status"];
  expires_at: Date | null;
  created_at: Date;
  revoked_at: Date | null;
}

const toRecord = (r: GrantRow): GrantRecord => ({
  id: r.id,
  tenantId: r.tenant_id,
  resourceType: r.resource_type,
  resourceProductId: r.resource_product_id,
  resourceWorkspaceId: r.resource_workspace_id,
  resourceRef: r.resource_ref,
  granteeType: r.grantee_type,
  granteeWorkspaceId: r.grantee_workspace_id,
  granteeProductId: r.grantee_product_id,
  scope: r.scope,
  status: r.status,
  expiresAt: r.expires_at,
  createdAt: r.created_at,
  revokedAt: r.revoked_at,
});

/** An expired grant that still needs its grant.invalidated event. */
export interface ExpiredGrantCandidate {
  record: GrantRecord;
  resourceProductCode: string;
}

@Injectable()
export class PgSharingRepository {
  constructor(@Inject(SHARING_PG_POOL) private readonly pool: Pool) {}

  /** Resolve the caller context; null when the workspace/product is unknown. */
  async resolveCaller(
    workspaceId: string,
    productCode: string,
  ): Promise<{ tenantId: string; productId: string } | null> {
    const res = await this.pool.query<{
      tenant_id: string;
      product_id: string;
    }>(
      `select w.tenant_id, p.id as product_id
         from tenancy.workspaces w
        cross join product.products p
        where w.id = $1 and p.product_code = $2`,
      [workspaceId, productCode],
    );
    const row = res.rows[0];
    return row ? { tenantId: row.tenant_id, productId: row.product_id } : null;
  }

  /** All active, unexpired grants hitting the caller (§8.3 three hit paths). */
  async listHits(
    tenantId: string,
    workspaceId: string,
    productId: string,
  ): Promise<HitGrant[]> {
    const res = await this.pool.query<{
      resource_type: HitGrant["resourceType"];
      resource_product_id: string;
      resource_product_code: string;
      resource_workspace_id: string;
      resource_ref: string;
      scope: HitGrant["scope"];
      expires_at: Date | null;
    }>(
      `select g.resource_type, g.resource_product_id,
              p.product_code as resource_product_code,
              g.resource_workspace_id, g.resource_ref, g.scope, g.expires_at
         from sharing.grants g
         join product.products p on p.id = g.resource_product_id
        where g.tenant_id = $1
          and g.status = 'active'
          and (g.expires_at is null or g.expires_at > now())
          and (   (g.grantee_type = 'workspace' and g.grantee_workspace_id = $2)
               or (g.grantee_type = 'product'   and g.grantee_product_id   = $3)
               or  g.grantee_type = 'org_all')`,
      [tenantId, workspaceId, productId],
    );
    return res.rows.map((r) => ({
      resourceType: r.resource_type,
      resourceProductId: r.resource_product_id,
      resourceProductCode: r.resource_product_code,
      resourceWorkspaceId: r.resource_workspace_id,
      resourceRef: r.resource_ref,
      scope: r.scope,
      expiresAt: r.expires_at,
    }));
  }

  /** The caller's freshness anchor, or null when never materialized / invalidated. */
  async readAnchor(
    workspaceId: string,
    productId: string,
  ): Promise<Date | null> {
    const res = await this.pool.query<{ refreshed_at: Date }>(
      `select refreshed_at from sharing.visible_set_refresh
        where workspace_id = $1 and product_id = $2`,
      [workspaceId, productId],
    );
    return res.rows[0]?.refreshed_at ?? null;
  }

  /** Materialized rows for the caller; expired rows filtered at read (§2.1). */
  async readRows(
    workspaceId: string,
    productId: string,
  ): Promise<MergedVisibleRow[]> {
    const res = await this.pool.query<{
      resource_type: MergedVisibleRow["resourceType"];
      resource_product_id: string;
      resource_product_code: string;
      resource_workspace_id: string;
      resource_ref: string;
      scope: MergedVisibleRow["scope"];
      expires_at: Date | null;
    }>(
      `select v.resource_type, v.resource_product_id,
              p.product_code as resource_product_code,
              v.resource_workspace_id, v.resource_ref, v.scope, v.expires_at
         from sharing.visible_set_current v
         join product.products p on p.id = v.resource_product_id
        where v.workspace_id = $1 and v.product_id = $2
          and (v.expires_at is null or v.expires_at > now())`,
      [workspaceId, productId],
    );
    return res.rows.map((r) => ({
      resourceType: r.resource_type,
      resourceProductId: r.resource_product_id,
      resourceProductCode: r.resource_product_code,
      resourceWorkspaceId: r.resource_workspace_id,
      resourceRef: r.resource_ref,
      scope: r.scope,
      expiresAt: r.expires_at,
    }));
  }

  /** Replace the caller's materialized set + refresh the anchor (one tx). */
  async materialize(
    tenantId: string,
    workspaceId: string,
    productId: string,
    rows: MergedVisibleRow[],
  ): Promise<Date> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `delete from sharing.visible_set_current
          where workspace_id = $1 and product_id = $2`,
        [workspaceId, productId],
      );
      for (const r of rows) {
        await client.query(
          `insert into sharing.visible_set_current
             (tenant_id, workspace_id, product_id, resource_type,
              resource_product_id, resource_workspace_id, resource_ref,
              scope, expires_at, refreshed_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
          [
            tenantId,
            workspaceId,
            productId,
            r.resourceType,
            r.resourceProductId,
            r.resourceWorkspaceId,
            r.resourceRef,
            r.scope,
            r.expiresAt,
          ],
        );
      }
      const anchor = await client.query<{ refreshed_at: Date }>(
        `insert into sharing.visible_set_refresh
           (tenant_id, workspace_id, product_id, refreshed_at)
         values ($1, $2, $3, now())
         on conflict (workspace_id, product_id)
           do update set refreshed_at = now(), updated_at = now()
         returning refreshed_at`,
        [tenantId, workspaceId, productId],
      );
      await client.query("commit");
      return anchor.rows[0]!.refreshed_at;
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  /** Insert a grant + synchronously invalidate affected callers' anchors. */
  async createGrant(input: CreateGrantInput): Promise<GrantRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const res = await client.query<GrantRow>(
        `insert into sharing.grants
           (tenant_id, resource_type, resource_product_id, resource_workspace_id,
            resource_ref, grantee_type, grantee_workspace_id, grantee_product_id,
            scope, expires_at, created_by_type, created_by_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         returning *`,
        [
          input.tenantId,
          input.resourceType,
          input.resourceProductId,
          input.resourceWorkspaceId,
          input.resourceRef,
          input.granteeType,
          input.granteeWorkspaceId ?? null,
          input.granteeProductId ?? null,
          input.scope,
          input.expiresAt ?? null,
          input.createdByType,
          input.createdById ?? null,
        ],
      );
      const record = toRecord(res.rows[0]!);
      await this.invalidateAnchors(client, record);
      await client.query("commit");
      return record;
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  /** Revoke (keep the row) + synchronously invalidate; null if not active. */
  async revokeGrant(input: RevokeGrantInput): Promise<GrantRecord | null> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const res = await client.query<GrantRow>(
        `update sharing.grants
            set status = 'revoked', revoked_at = now(),
                revoked_by_type = $2, revoked_by_id = $3, updated_at = now()
          where id = $1 and status = 'active'
          returning *`,
        [input.grantId, input.revokedByType, input.revokedById ?? null],
      );
      if (res.rows.length === 0) {
        await client.query("rollback");
        return null;
      }
      const record = toRecord(res.rows[0]!);
      await this.invalidateAnchors(client, record);
      await client.query("commit");
      return record;
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Delete the freshness anchors of every caller the grant can hit — the next
   * read recomputes (data_sharing_200 §2.3: anchor deletion IS the invalidation;
   * stale current-rows are swept by that recompute's delete+insert).
   */
  private async invalidateAnchors(
    client: PoolClient,
    g: GrantRecord,
  ): Promise<void> {
    if (g.granteeType === "workspace") {
      await client.query(
        `delete from sharing.visible_set_refresh where workspace_id = $1`,
        [g.granteeWorkspaceId],
      );
    } else if (g.granteeType === "product") {
      await client.query(
        `delete from sharing.visible_set_refresh
          where tenant_id = $1 and product_id = $2`,
        [g.tenantId, g.granteeProductId],
      );
    } else {
      await client.query(
        `delete from sharing.visible_set_refresh where tenant_id = $1`,
        [g.tenantId],
      );
    }
  }

  /**
   * Expired active grants still owing a grant.invalidated event. "Already
   * handled" = the deterministic idempotency key exists in the delivery queue
   * (data_sharing_200 §6 decision: query deliveries, no marker column on the
   * SoT). Grants whose resource product has no webhook registration are not
   * candidates (nothing to notify; read-side expiry filtering already applies).
   */
  async sweepExpiredCandidates(
    batch: number,
  ): Promise<ExpiredGrantCandidate[]> {
    const res = await this.pool.query<
      GrantRow & { resource_product_code: string }
    >(
      `select g.*, p.product_code as resource_product_code
         from sharing.grants g
         join product.products p on p.id = g.resource_product_id
        where g.status = 'active'
          and g.expires_at is not null and g.expires_at <= now()
          and exists (select 1 from product.product_webhooks pw
                       where pw.product_id = g.resource_product_id)
          and not exists (select 1 from provisioning.webhook_deliveries d
                           where d.idempotency_key = g.id::text || ':grant.invalidated:expired')
        order by g.expires_at asc
        limit $1`,
      [batch],
    );
    return res.rows.map((r) => ({
      record: toRecord(r),
      resourceProductCode: r.resource_product_code,
    }));
  }

  /** products.product_code for a product id (event payload enrichment). */
  async productCode(productId: string): Promise<string | null> {
    const res = await this.pool.query<{ product_code: string }>(
      `select product_code from product.products where id = $1`,
      [productId],
    );
    return res.rows[0]?.product_code ?? null;
  }
}
