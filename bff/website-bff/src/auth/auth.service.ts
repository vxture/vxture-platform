/**
 * auth.service.ts - Website BFF Authentication Service (Identity Platform).
 * @package @vxture/bff-website
 *
 * Login/token issuance live in the IdP (auth-bff, RS256) and are proxied by
 * AuthRouter; this service only resolves the current user from
 * @vxture/service-account for the AuthMiddleware. The legacy HS256 verify and the
 * local password-reset path (now handled by auth-bff) are retired.
 */

import { Inject, Injectable } from "@nestjs/common";
import { VxConfigService } from "@vxture/core-config";
import { AccountService } from "@vxture/service-account";
import type { AuthUserDto } from "../types/auth.types";

@Injectable()
export class WebsiteAuthService {
  constructor(
    @Inject(AccountService)
    private readonly account: AccountService,
    @Inject(VxConfigService)
    private readonly config: VxConfigService,
  ) {}

  async getCurrentUser(userId: string): Promise<AuthUserDto | null> {
    const user = await this.account.getUserById(userId);
    if (!user) return null;
    const issuer = this.config.auth.OIDC_ISSUER.replace(/\/$/, "");
    return {
      id: user.id,
      name: user.name ?? user.account,
      displayName: user.name ?? null,
      username: user.account,
      picture: user.avatarHash
        ? `${issuer}/avatar/usr_${user.id}?v=${user.avatarHash}`
        : null,
      email: user.email ?? `${user.account}@local.vxture`,
      phone: user.phone,
      role: "member",
      roleLabel: "Member",
      personalVerified: true,
      organizationVerified: false,
    };
  }
}
