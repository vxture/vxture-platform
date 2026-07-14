import { Inject, Injectable } from "@nestjs/common";
import { PlatformAuthService } from "../auth/auth.service";
import type {
  ConsoleTenantPermission,
  ConsoleTenantRole,
  ConsoleUserProfile,
  MemberRecord,
} from "../types/console.types";

@Injectable()
export class SessionAggregator {
  constructor(
    @Inject(PlatformAuthService)
    private readonly platformAuthService: PlatformAuthService,
  ) {}

  async getCurrentUser(accountId: string) {
    return this.platformAuthService.getCurrentUser(accountId);
  }

  async getCapabilities(accountId: string) {
    return this.platformAuthService.getCapabilities(accountId);
  }

  async getCurrentUserProfile(
    accountId: string,
  ): Promise<ConsoleUserProfile | null> {
    const user = await this.platformAuthService.getCurrentUser(accountId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username ?? user.name,
      displayName: user.displayName ?? user.name,
      avatarUrl: null,
      headline: user.roleNameEn,
      bio: null,
      email: user.email,
      phone: user.phone ?? null,
      timezone: "Asia/Shanghai",
      language: "zh-CN",
      profileUpdatedAt: null,
    };
  }

  async updateCurrentUserProfile(): Promise<ConsoleUserProfile | null> {
    return null;
  }

  async changeCurrentUserPassword(): Promise<void> {
    return undefined;
  }

  async getIamSummary() {
    return {
      totalMembers: 0,
      activeMembers: 0,
      primaryOwners: 0,
      activeRoles: 0,
    };
  }

  async listMembers(): Promise<MemberRecord[]> {
    return [];
  }

  async getMember(): Promise<MemberRecord | null> {
    return null;
  }

  async listTenantRoles(): Promise<ConsoleTenantRole[]> {
    return [];
  }

  async listTenantPermissions(): Promise<ConsoleTenantPermission[]> {
    return [];
  }

  async createRole(): Promise<ConsoleTenantRole | null> {
    return null;
  }

  async updateRole(): Promise<ConsoleTenantRole | null> {
    return null;
  }

  async deleteRole(): Promise<boolean> {
    return false;
  }

  async createMember(): Promise<MemberRecord | null> {
    return null;
  }

  async inviteMember(): Promise<MemberRecord | null> {
    return null;
  }

  async updateMember(): Promise<MemberRecord | null> {
    return null;
  }

  async disableMember(): Promise<MemberRecord | null> {
    return null;
  }

  async resetMemberPassword(): Promise<boolean> {
    return false;
  }

  async removeMember(): Promise<boolean> {
    return false;
  }
}
