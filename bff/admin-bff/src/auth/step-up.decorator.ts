/**
 * step-up.decorator.ts — mark a high-risk operator route as requiring step-up.
 * @package @vxture/bff-admin
 *
 * Apply @RequireStepUp() to high-risk WRITE handlers (change permissions, enable/
 * disable accounts, reset credentials). The global OperatorStepUpGuard enforces a
 * fresh second-factor step-up credential on decorated routes; read-only routes are
 * never gated (identity-platform-operator.md §2.3).
 */
import { SetMetadata } from "@nestjs/common";

export const REQUIRE_STEP_UP = "operator:require-step-up";

export const RequireStepUp = () => SetMetadata(REQUIRE_STEP_UP, true);

/** Host-only step-up credential cookie (Secure in prod; prefix dropped on http). */
export function stepUpCookieName(secure: boolean): string {
  return secure ? "__Host-vx_op_stepup" : "vx_op_stepup";
}
