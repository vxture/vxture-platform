/**
 * sharing.service.ts — SharingGrant writes + lazy-TTL visible-set resolution +
 * grant.invalidated event production (product_310 P4.3).
 * @package @vxture/service-sharing
 *
 * Evaluation stays at the L2 product entry (product_110 §8.4#2): this service
 * only stores policy, serves the grant-hit set, and invalidates. Events ride
 * the provisioning delivery queue (data_sharing_100 §1 — no second channel).
 */
import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ProvisioningService } from "@vxture/service-provisioning";
import { PgSharingRepository } from "../repository/pg-sharing.repository";
import { SHARING_CONFIG } from "../tokens";
import {
  isFresh,
  mergeVisibleSet,
  toVisibleResource,
  type MergedVisibleRow,
} from "../visible-set";
import type {
  CreateGrantInput,
  GrantRecord,
  RevokeGrantInput,
  SharingConfig,
  VisibleSetResult,
} from "../types/sharing.types";

@Injectable()
export class SharingService {
  private readonly logger = new Logger(SharingService.name);

  // Explicit tokens: bff bundles (esbuild) emit no decorator metadata, so an
  // implicit constructor type silently injects undefined (repo-wide pattern).
  constructor(
    @Inject(PgSharingRepository)
    private readonly repo: PgSharingRepository,
    @Inject(ProvisioningService)
    private readonly provisioning: ProvisioningService,
    @Inject(SHARING_CONFIG)
    private readonly cfg: SharingConfig,
  ) {}

  /**
   * Resolve the caller's grant-hit visible set (C2 §3.2). Lazy materialization:
   * a fresh anchor serves the materialized rows; a missing/stale anchor
   * recomputes from the SoT. Concurrent recomputes are idempotent (delete +
   * insert converges), so no advisory lock.
   */
  async resolveVisibleSet(
    workspaceId: string,
    productCode: string,
  ): Promise<VisibleSetResult> {
    const caller = await this.repo.resolveCaller(workspaceId, productCode);
    if (!caller) {
      throw new NotFoundException(
        `unknown workspace ${workspaceId} or product ${productCode}`,
      );
    }
    const anchor = await this.repo.readAnchor(workspaceId, caller.productId);
    let rows: MergedVisibleRow[];
    let refreshedAt: Date;
    if (anchor && isFresh(anchor, this.cfg.ttlSeconds)) {
      rows = await this.repo.readRows(workspaceId, caller.productId);
      refreshedAt = anchor;
    } else {
      const hits = await this.repo.listHits(
        caller.tenantId,
        workspaceId,
        caller.productId,
      );
      rows = mergeVisibleSet(hits);
      refreshedAt = await this.repo.materialize(
        caller.tenantId,
        workspaceId,
        caller.productId,
        rows,
      );
    }
    return {
      workspace_id: workspaceId,
      product: productCode,
      resources: rows.map(toVisibleResource),
      refreshed_at: refreshedAt.toISOString(),
    };
  }

  /**
   * Create a grant. Materialization anchors are invalidated in the same tx;
   * no push on create (product_110 §8.5 pushes on revoke/expiry — new
   * visibility converges via the short TTL).
   */
  async createGrant(input: CreateGrantInput): Promise<GrantRecord> {
    return this.repo.createGrant(input);
  }

  /**
   * Revoke a grant (row kept, re-grant = new row). The SoT write + anchor
   * invalidation commit first; the grant.invalidated push is best-effort on
   * top (same doctrine as the subscription provisioning hooks — the queue
   * insert is idempotent on `${id}:grant.invalidated:revoked`, and the expiry
   * sweep does not cover revocations, so a failure here is logged loudly for
   * manual replay).
   */
  async revokeGrant(input: RevokeGrantInput): Promise<GrantRecord> {
    const record = await this.repo.revokeGrant(input);
    if (!record) {
      throw new NotFoundException(`grant ${input.grantId} not active`);
    }
    try {
      await this.enqueueInvalidated(record, "revoked");
    } catch (err) {
      this.logger.error(
        `grant.invalidated enqueue failed (grant=${record.id}) — ` +
          `revocation committed without push, needs manual replay: ${String(err)}`,
      );
    }
    return record;
  }

  /**
   * One expiry sweep pass (admin-bff interval job): emit grant.invalidated for
   * active grants whose expires_at has passed. Deterministic key = one event
   * per grant lifetime (expires_at is set at create and rows are re-granted,
   * never re-armed), so the pass converges.
   */
  async sweepExpired(): Promise<number> {
    const candidates = await this.repo.sweepExpiredCandidates(
      this.cfg.sweepBatch,
    );
    for (const c of candidates) {
      await this.enqueueInvalidated(c.record, "expired", c.resourceProductCode);
    }
    return candidates.length;
  }

  private async enqueueInvalidated(
    g: GrantRecord,
    reason: "revoked" | "expired",
    knownProductCode?: string,
  ): Promise<void> {
    const appCode =
      knownProductCode ?? (await this.repo.productCode(g.resourceProductId));
    if (!appCode) return;
    await this.provisioning.enqueueEvent({
      workspaceId: g.resourceWorkspaceId,
      tenantId: g.tenantId,
      applicationId: g.resourceProductId,
      appCode,
      event: "grant.invalidated",
      idempotencyKey: `${g.id}:grant.invalidated:${reason}`,
      data: {
        grant_id: g.id,
        tenant_id: g.tenantId,
        resource: {
          type: g.resourceType,
          product: appCode,
          workspace_id: g.resourceWorkspaceId,
          ref: g.resourceRef,
        },
        grantee: {
          type: g.granteeType,
          workspace_id: g.granteeWorkspaceId,
          product_id: g.granteeProductId,
        },
        scope: g.scope,
        reason,
      },
    });
  }
}
