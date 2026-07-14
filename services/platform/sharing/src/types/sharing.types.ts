/**
 * sharing.types.ts — sharing domain contracts (product_310 P4.3).
 *
 * Semantics authority: product_110_sharing-isolation.md §8 (grant model,
 * hit predicate, scope merge); storage: data_sharing_200_schema.md.
 */

export type ResourceType = "dataset" | "knowledge_base" | "skill";
export type GranteeType = "workspace" | "product" | "org_all";
export type GrantScope = "read" | "retrieve" | "apply" | "use";
export type ActorType = "system" | "customer" | "operator";

export interface GrantRecord {
  id: string;
  tenantId: string;
  resourceType: ResourceType;
  resourceProductId: string;
  resourceWorkspaceId: string;
  resourceRef: string;
  granteeType: GranteeType;
  granteeWorkspaceId: string | null;
  granteeProductId: string | null;
  scope: GrantScope;
  status: "active" | "revoked";
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface CreateGrantInput {
  tenantId: string;
  resourceType: ResourceType;
  resourceProductId: string;
  resourceWorkspaceId: string;
  resourceRef: string;
  granteeType: GranteeType;
  granteeWorkspaceId?: string | null;
  granteeProductId?: string | null;
  scope: GrantScope;
  expiresAt?: Date | null;
  createdByType: ActorType;
  createdById?: string | null;
}

export interface RevokeGrantInput {
  grantId: string;
  revokedByType: ActorType;
  revokedById?: string | null;
}

/** One row of the resolved visible set (grant-hit portion only — the owned /
 *  P-level components are assembled at the L2 entry, data_sharing_100 §2). */
export interface VisibleResource {
  resource_type: ResourceType;
  /** products.product_code of the asset-hosting product */
  resource_product: string;
  resource_workspace_id: string;
  resource_ref: string;
  /** strongest scope across all hitting grants (§8.3 merge) */
  scope: GrantScope;
  /** earliest expiry among contributing grants; null = no expiry */
  expires_at: string | null;
}

export interface VisibleSetResult {
  workspace_id: string;
  product: string;
  resources: VisibleResource[];
  refreshed_at: string;
}

export interface SharingConfig {
  /** visible-set anchor freshness window (seconds). */
  ttlSeconds: number;
  /** max expired grants processed per sweep pass. */
  sweepBatch: number;
}
