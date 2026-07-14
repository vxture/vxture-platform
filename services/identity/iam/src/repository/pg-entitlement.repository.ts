/**
 * pg-entitlement.repository.ts - per-product entitlement resolution
 * @package @vxture/service-iam
 * @layer Infrastructure
 * @category repository
 *
 * Resolves the effective entitlement for a (workspace, product) pair following the
 * reconciled chain (platform-data-architecture §7/§8 + entitlement spec 2026-07-02):
 *   subscription (workspace-scoped, trialing|active)
 *     -> pinned plan_version (is_locked = immutable)
 *     -> plan_component for the product (new DDL has no enabled flag)
 *     -> apply unexpired subscription_entitlement_override (tier upgrade)
 *     -> { plan_code, tier_code, status }
 * The platform emits {product, tier_code}; each product service interprets the
 * tier itself (no cross-service tier validation here). Usage metering is tracked
 * separately in metering.quota_pools (materialized from plan_component.quota).
 */
import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { IAM_PG_POOL } from "../tokens";

export interface EntitlementRow {
  planCode: string;
  /** effective tier after applying any unexpired override (upgrade-only) */
  tierCode: string;
  /** raw subscription.status: active|trialing|expired|cancelled|suspended (metering.subscriptions) */
  status: string;
  endAt: Date | null;
  trialEndAt: Date | null;
}

interface RawRow {
  plan_code: string;
  tier_code: string;
  status: string;
  end_at: Date | null;
  trial_end_at: Date | null;
}

@Injectable()
export class PgEntitlementRepository {
  constructor(@Inject(IAM_PG_POOL) private readonly pool: Pool) {}

  /**
   * Resolve the effective entitlement for (workspaceId, productCode). Returns null
   * when the product is unknown or the workspace has no trialing/active subscription
   * whose locked plan_version includes a component for it (→ "not subscribed").
   */
  async resolveEntitlement(
    workspaceId: string,
    productCode: string,
  ): Promise<EntitlementRow | null> {
    const result = await this.pool.query<RawRow>(
      `
        select p.plan_code,
               coalesce(o.override_tier_code, pc.tier) as tier_code,
               s.status, s.end_at, s.trial_end_at
          from metering.subscriptions s
          join product.plan_versions pv
            on pv.id = s.plan_version_id
           and pv.is_locked = true
          join product.plans p on p.id = pv.plan_id
          join product.plan_components pc
            on pc.plan_version_id = pv.id
          join product.products prod
            on prod.id = pc.product_id
           and prod.deleted_at is null
          left join metering.subscription_entitlement_overrides o
            on o.subscription_id = s.id
           and o.product_id = prod.id
           and (o.expires_at is null or o.expires_at > now())
         where s.workspace_id = $1
           and prod.product_code = $2
           and s.deleted_at is null
           and s.status in ('trialing', 'active')
         order by s.created_at desc
         limit 1
      `,
      [workspaceId, productCode],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      planCode: row.plan_code,
      tierCode: row.tier_code,
      status: row.status,
      endAt: row.end_at,
      trialEndAt: row.trial_end_at,
    };
  }
}
