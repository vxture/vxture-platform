import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { ORGANIZATION_REPOSITORY } from "../tokens";
import type { OrganizationReadRepository } from "../types/organization.types";

/** Governance scope for a permission check: an org, optionally narrowed to a workspace. */
export interface GovernanceContext {
  orgId: string;
  workspaceId?: string;
}

/**
 * GovernanceService — two-level RBAC enforcement (docs/design/identity-platform-architecture.md §5).
 * Resolves a user's EFFECTIVE governance permissions in an org/workspace from the
 * global role catalog (membership.role_id → access.roles → role_permissions → permissions),
 * and provides can/assert for callers (BFFs wire these in later batches).
 *
 * Governance only ("who can manage this org/space"). Business-resource authorization
 * is OUT (each business domain). No entitlement (that is commerce, queried live).
 */
@Injectable()
export class GovernanceService {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly repo: OrganizationReadRepository,
  ) {}

  /**
   * Effective permission codes for a user in a context: union of the org-role grants
   * and (when a workspace is given) the workspace-role grants, deduped.
   */
  async getEffectivePermissions(
    userId: string,
    ctx: GovernanceContext,
  ): Promise<string[]> {
    const orgPerms = await this.repo.getEffectiveOrgPermissions(
      userId,
      ctx.orgId,
    );
    const wsPerms = ctx.workspaceId
      ? await this.repo.getEffectiveWorkspacePermissions(
          userId,
          ctx.workspaceId,
        )
      : [];
    return [...new Set([...orgPerms, ...wsPerms])];
  }

  /** True if the user holds `permissionCode` in the given context. */
  async can(
    userId: string,
    ctx: GovernanceContext,
    permissionCode: string,
  ): Promise<boolean> {
    const perms = await this.getEffectivePermissions(userId, ctx);
    return perms.includes(permissionCode);
  }

  /** Throw ForbiddenException unless the user holds `permissionCode` in the context. */
  async assertCan(
    userId: string,
    ctx: GovernanceContext,
    permissionCode: string,
  ): Promise<void> {
    if (!(await this.can(userId, ctx, permissionCode))) {
      throw new ForbiddenException(`missing permission: ${permissionCode}`);
    }
  }
}
