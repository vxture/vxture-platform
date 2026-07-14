/**
 * account-admin-internal.router.ts — internal IdP endpoints for admin-delegated
 * customer account management (C12: disable / enable / force-logout).
 * @package @vxture/bff-auth
 *
 * Server-to-server only (InternalAuthGuard / AUTH_INTERNAL_TOKEN). admin-bff, on
 * behalf of an authenticated operator, delegates customer account status/session
 * mutations here — the IdP owns customer credentials & sessions (realm=customer).
 * Realm-isolated: AccountService resolves targets via account.users only, so an
 * operator id yields 404. NEVER exposed publicly (nginx must not route /internal/*).
 *
 * Unlike the operator router there is no rank gate (operators managing customers is
 * not a cross-peer action) and no anti-lockout (an operator may fully disable an
 * abusive customer). Credential reset for customers (out-of-band; social-only vs
 * verified-email semantics) is a deferred follow-up, not in this router.
 */
import {
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AccountService } from "@vxture/service-account";
import { InternalAuthGuard } from "../authn/internal-auth.guard";

@Controller("internal/account/users")
@UseGuards(InternalAuthGuard)
export class AccountAdminInternalRouter {
  constructor(
    @Inject(AccountService) private readonly accounts: AccountService,
  ) {}

  // POST /internal/account/users/:id/disable — status='disabled' + revoke all sessions.
  @Post(":id/disable")
  @HttpCode(HttpStatus.OK)
  async disable(
    @Param("id") id: string,
  ): Promise<{ ok: true; status: string; revoked: number }> {
    const { user, revoked } = await this.accounts.adminDisableAccount(id);
    return { ok: true, status: user.status, revoked };
  }

  // POST /internal/account/users/:id/enable — status='active'.
  @Post(":id/enable")
  @HttpCode(HttpStatus.OK)
  async enable(@Param("id") id: string): Promise<{ ok: true; status: string }> {
    const user = await this.accounts.adminEnableAccount(id);
    return { ok: true, status: user.status };
  }

  // POST /internal/account/users/:id/sessions/revoke — revoke all active customer sessions.
  @Post(":id/sessions/revoke")
  @HttpCode(HttpStatus.OK)
  async revokeSessions(
    @Param("id") id: string,
  ): Promise<{ ok: true; revoked: number }> {
    const { revoked } = await this.accounts.adminForceLogout(id);
    return { ok: true, revoked };
  }
}
