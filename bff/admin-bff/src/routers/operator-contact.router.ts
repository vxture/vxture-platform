/**
 * operator-contact.router.ts — operator self-service contact change (TD-017 §③).
 * @package @vxture/bff-admin
 *
 * The operator changes their OWN email, verified by a code sent to the NEW
 * address. This is the ONLY path that sets email_verified=true, restoring
 * out-of-band-delivery (reset) eligibility after a staff metadata edit dropped
 * it. Acting operator = the RP session (req.user.id), NEVER the body — the IdP
 * additionally enforces target === actor (self-only). Credential/verification
 * work stays IdP-owned; admin-bff only delegates.
 */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { RequestContext } from "../types/console.types";
import { OperatorAdminService } from "../auth/operator-admin.service";

interface StartEmailChangeBody {
  newEmail?: unknown;
}
interface VerifyEmailChangeBody {
  code?: unknown;
}

@Controller("api/operator/contact")
export class OperatorContactRouter {
  constructor(private readonly operatorAdmin: OperatorAdminService) {}

  // POST /api/operator/contact/email/start { newEmail } — send a code to newEmail.
  @Post("email/start")
  @HttpCode(HttpStatus.OK)
  async startEmailChange(
    @Req() req: Request & RequestContext,
    @Body() body: StartEmailChangeBody,
  ): Promise<{ ok: true; sentTo: string }> {
    const operatorId = requireSelf(req);
    const newEmail = typeof body?.newEmail === "string" ? body.newEmail : "";
    return this.operatorAdmin.startEmailChange(operatorId, newEmail);
  }

  // POST /api/operator/contact/email/verify { code } — confirm → new email + verified.
  @Post("email/verify")
  @HttpCode(HttpStatus.OK)
  async verifyEmailChange(
    @Req() req: Request & RequestContext,
    @Body() body: VerifyEmailChangeBody,
  ): Promise<{ ok: true; email: string }> {
    const operatorId = requireSelf(req);
    const code = typeof body?.code === "string" ? body.code : "";
    return this.operatorAdmin.verifyEmailChange(operatorId, code);
  }
}

function requireSelf(req: Request & RequestContext): string {
  const id = req.user?.id;
  if (!id) throw new UnauthorizedException("No active session");
  return id;
}
