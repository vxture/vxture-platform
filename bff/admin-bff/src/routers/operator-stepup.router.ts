/**
 * operator-stepup.router.ts — operator step-up re-auth (admin-bff, P4.2).
 * @package @vxture/bff-admin
 *
 * The authenticated operator submits a TOTP code; admin-bff verifies it via the
 * IdP and, on success, sets a short-lived host-only step-up cookie that the
 * OperatorStepUpGuard checks before high-risk writes. operatorId comes from the
 * RP session (AuthMiddleware), never the request body.
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
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { OperatorStepUpService } from "../auth/operator-stepup.service";
import { stepUpCookieName } from "../auth/step-up.decorator";
import { RP_RUNTIME, type RpRuntime } from "../oidc/oidc-rp.tokens";
import type { RequestContext } from "../types/console.types";

@Controller("api/operator/step-up")
export class OperatorStepUpRouter {
  constructor(
    @Inject(OperatorStepUpService)
    private readonly stepUp: OperatorStepUpService,
    @Inject(RP_RUNTIME) private readonly rpRuntime: RpRuntime,
  ) {}

  /** Verify TOTP → set a short-lived step-up cookie for high-risk writes. */
  @Post("totp")
  @HttpCode(HttpStatus.OK)
  async totp(
    @Body() body: { code?: string },
    @Req() req: Request & RequestContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true; expiresIn: number }> {
    if (!body.code) {
      throw new BadRequestException("invalid_request");
    }
    const operatorId = req.user?.id;
    if (!operatorId) {
      throw new BadRequestException("invalid_request");
    }
    const { stepUpToken, expiresIn } = await this.stepUp.requestTotpStepUp(
      operatorId,
      body.code,
    );
    const secure = this.rpRuntime.cookieSecure;
    res.cookie(stepUpCookieName(secure), stepUpToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn * 1000,
    });
    return { ok: true, expiresIn };
  }
}
