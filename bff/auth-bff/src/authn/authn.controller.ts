/**
 * authn.controller.ts — non-OIDC-protocol auth HTTP surface.
 * @package @vxture/bff-auth
 *
 * Registration (§13.1) and SMS-code issuance for phone-code login (§6.1). The
 * interactive login completions themselves live on the OIDC surface
 * (/oidc/authorize/login[/phone]); these endpoints feed those flows.
 */
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { extractClientIp } from "@vxture/core-utils";
import { PhoneCodeService } from "@vxture/service-sms";
import { AuthnService } from "./authn.service";
import { TenantLoginGuard } from "./tenant-login-guard.service";

@Controller("auth")
export class AuthnController {
  constructor(
    @Inject(AuthnService) private readonly authn: AuthnService,
    @Inject(PhoneCodeService) private readonly phoneCode: PhoneCodeService,
    @Inject(TenantLoginGuard) private readonly tenantGuard: TenantLoginGuard,
  ) {}

  /**
   * Register a user (§13.1): creates the User (Argon2id when a password is given)
   * + a personal Org + default Workspace + owner membership at both levels.
   * Phone is the mandatory verified anchor.
   */
  @Post("register")
  @HttpCode(HttpStatus.OK)
  async register(
    @Body()
    body: {
      account?: string;
      email?: string;
      phone?: string;
      password?: string;
      name?: string;
    },
  ): Promise<{
    userId: string;
    account: string;
    orgId: string;
    workspaceId: string;
  }> {
    if (!body.phone) {
      throw new BadRequestException("phone is required");
    }
    const result = await this.authn.register({
      account: body.account ?? null,
      email: body.email ?? null,
      phone: body.phone,
      password: body.password ?? null,
      name: body.name ?? null,
    });
    return {
      userId: result.user.id,
      account: result.user.account,
      orgId: result.org.id,
      workspaceId: result.workspace.id,
    };
  }

  /**
   * Send an SMS verification code for phone-code login (scope must match
   * verifyCode). Turnstile-gated (tenant surface, env-gated via
   * CF_TURNSTILE_ENABLED) ahead of the per-phone send rate-limit in
   * PhoneCodeService — the SMS-bombing gate.
   */
  @Post("send-phone-code")
  @HttpCode(HttpStatus.OK)
  async sendPhoneCode(
    @Body() body: { phone?: string; turnstile_token?: string },
    @Req() req: Request,
  ): Promise<{ sent: true }> {
    if (!body.phone) {
      throw new BadRequestException("phone is required");
    }
    await this.tenantGuard.verifyTurnstile(
      body.turnstile_token,
      extractClientIp(req),
    );
    await this.phoneCode.sendCode(body.phone, { scope: "tenant-auth" });
    return { sent: true };
  }

  /**
   * Send an email verification code for email-code login (D-CC). Same Turnstile
   * gate as the SMS path, ahead of the per-email send rate-limit in
   * VerifyCodeService. Email-code login is login-only (D-CB) — issuing a code
   * here does not create an account.
   */
  @Post("send-email-code")
  @HttpCode(HttpStatus.OK)
  async sendEmailCode(
    @Body() body: { email?: string; turnstile_token?: string },
    @Req() req: Request,
  ): Promise<{ sent: true }> {
    if (!body.email || !body.email.includes("@")) {
      throw new BadRequestException("a valid email is required");
    }
    await this.tenantGuard.verifyTurnstile(
      body.turnstile_token,
      extractClientIp(req),
    );
    await this.authn.sendEmailCode(body.email);
    return { sent: true };
  }

  /**
   * Request an email-link password reset (D-BE=A). Always returns 200 regardless
   * of whether the email maps to a user — the work (token issue + send) happens
   * only for a real account with an email, so the response can't reveal which
   * emails are registered.
   */
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() body: { email?: string },
  ): Promise<{ ok: true }> {
    if (body.email) await this.authn.requestPasswordReset(body.email);
    return { ok: true };
  }

  /**
   * Consume a reset token and set the new password. 400 on a missing field, a too
   * short password, or an unknown / expired / already-used token.
   */
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: { token?: string; password?: string },
  ): Promise<{ ok: true }> {
    if (!body.token || !body.password) {
      throw new BadRequestException("token and password are required");
    }
    if (body.password.length < 8) {
      throw new BadRequestException("password must be at least 8 characters");
    }
    const ok = await this.authn.resetPassword(body.token, body.password);
    if (!ok) throw new BadRequestException("invalid or expired token");
    return { ok: true };
  }
}
