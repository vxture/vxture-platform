import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { RequestContext } from "../types/console.types";

/**
 * Shared operator authorization helpers for the finance/commerce routers
 * (TD-027 domain re-gate). Capability codes are the three-segment perm_codes
 * from the seed catalog (data_admin_200 §4.2); `.manage` implies `.read`, so a
 * read guard accepts either. Step-up on 危 (high-risk) writes is enforced
 * separately via @RequireStepUp on the dedicated endpoint.
 */
export function assertSession(req: Request & RequestContext): void {
  if (!req.user) {
    throw new UnauthorizedException("No active session");
  }
}

/** Require at least one of `codes`; 401 without a session, 403 without a code. */
export function assertAnyCapability(
  req: Request & RequestContext,
  codes: readonly string[],
): void {
  assertSession(req);
  const caps = req.capabilities ?? [];
  if (!codes.some((code) => caps.includes(code))) {
    throw new ForbiddenException(`Missing capability: ${codes.join(" | ")}`);
  }
}
