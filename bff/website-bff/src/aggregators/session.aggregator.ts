/**
 * session.aggregator.ts - current-user session aggregator (Identity Platform).
 * @package @vxture/bff-website
 *
 * Aggregates the logged-in user's account info for the /api/me routes. Reads from
 * @vxture/service-account (identity-core User). The new minimal model has no rich
 * profile table yet (headline/bio/avatar/timezone/language) — those fields are
 * stubbed null until a profile store lands; name/email are the live editable bits.
 */

import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { VxConfigService } from "@vxture/core-config";
import { AccountService } from "@vxture/service-account";
import {
  ActiveContextService,
  OrganizationService,
  type OrgRole,
} from "@vxture/service-organization";
import type {
  AccountProfileDto,
  AuthUserDto,
  UpdateProfileDto,
} from "../types/auth.types";

const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  manager: "Manager",
  member: "Member",
};

@Injectable()
export class SessionAggregator {
  constructor(
    @Inject(AccountService)
    private readonly account: AccountService,
    @Inject(OrganizationService)
    private readonly org: OrganizationService,
    @Inject(ActiveContextService)
    private readonly active: ActiveContextService,
    @Inject(VxConfigService)
    private readonly config: VxConfigService,
  ) {}

  /** Versioned platform avatar URL for a user, or null when no custom avatar. */
  private pictureFor(user: {
    id: string;
    avatarHash: string | null;
  }): string | null {
    if (!user.avatarHash) return null;
    const issuer = this.config.auth.OIDC_ISSUER.replace(/\/$/, "");
    return `${issuer}/avatar/usr_${user.id}?v=${user.avatarHash}`;
  }

  /**
   * Resolve the caller's active-org role + tenant type for the header badges.
   * Falls back to a personal/member view when the user has no membership or an
   * org lookup fails — /api/me must never break on org-context errors.
   */
  private async resolveOrgBadges(userId: string): Promise<{
    role: OrgRole;
    tenantType: "individual" | "company";
    organizationName: string | null;
  }> {
    const fallback = {
      role: "member" as OrgRole,
      tenantType: "individual" as const,
      organizationName: null,
    };
    try {
      const ctx = await this.active.resolveActiveContext(userId);
      if (!ctx?.activeOrg) return fallback;
      const org = await this.org.getOrgById(ctx.activeOrg);
      if (!org) return fallback;
      const member = await this.org.getOrgMemberDetail(ctx.activeOrg, userId);
      const role = (member?.role as OrgRole) ?? "member";
      const tenantType = org.type === "organization" ? "company" : "individual";
      return {
        role,
        tenantType,
        organizationName: org.type === "organization" ? org.name : null,
      };
    } catch {
      return fallback;
    }
  }

  /** Basic info for GET /api/me (header menu: identity + avatar + role/tenant badges). */
  async getCurrentUser(userId: string): Promise<AuthUserDto | null> {
    const user = await this.account.getUserById(userId);
    if (!user) return null;
    const badges = await this.resolveOrgBadges(userId);
    return {
      id: user.id,
      name: user.name ?? user.account,
      displayName: user.name ?? null,
      username: user.account,
      email: user.email ?? `${user.account}@local.vxture`,
      phone: user.phone,
      picture: this.pictureFor(user),
      role: badges.role,
      roleLabel: ORG_ROLE_LABELS[badges.role],
      tenantType: badges.tenantType,
      organizationName: badges.organizationName,
      // "Verified" in the minimal model = an active account (logged-in via the
      // central IdP). Drives the header auth-status tag (已认证 / 未认证).
      personalVerified: user.status === "active",
      organizationVerified: badges.tenantType === "company",
    };
  }

  /** Full profile for GET /api/me/profile (rich fields stubbed in the MVP model). */
  async getCurrentUserProfile(
    userId: string,
  ): Promise<AccountProfileDto | null> {
    const user = await this.account.getUserById(userId);
    if (!user) return null;
    return {
      id: user.id,
      username: user.account,
      displayName: user.name,
      avatarUrl: this.pictureFor(user),
      headline: null,
      bio: null,
      email: user.email,
      phone: user.phone,
      timezone: null,
      language: null,
      profileUpdatedAt: null,
    };
  }

  /**
   * Update profile for PUT /api/me/profile. Only name (displayName) and email are
   * persisted in the minimal model; other fields are accepted but ignored.
   */
  async updateCurrentUserProfile(
    userId: string,
    input: UpdateProfileDto,
  ): Promise<AccountProfileDto | null> {
    const patch: { name?: string | null; email?: string | null } = {};
    if (input.displayName !== undefined) patch.name = input.displayName;
    if (input.email !== undefined) patch.email = input.email;
    if (patch.name !== undefined || patch.email !== undefined) {
      const updated = await this.account.updateProfile(userId, patch);
      if (!updated) return null;
    }
    return this.getCurrentUserProfile(userId);
  }

  /**
   * Change password for PUT /api/me/password. Throws 401 when the current
   * password is wrong (preserving the previous router contract).
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    nextPassword: string,
  ): Promise<void> {
    const ok = await this.account.changePassword(
      userId,
      currentPassword,
      nextPassword,
    );
    if (!ok) {
      throw new UnauthorizedException("Current password is incorrect");
    }
  }
}
