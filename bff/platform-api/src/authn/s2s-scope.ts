/**
 * s2s-scope.ts — binds a T2 S2S-authenticated request to the caller's own
 * identity (TD-035, product_210 §8 T2 residual gap).
 *
 * PlatformAuthGuard authenticates "this is a trusted caller" but the three
 * platform routers never bound that identity to the workspace/product the
 * request asks about — any valid S2S token could query any workspace/product
 * combination, since the guard's Bearer path and the legacy shared-secret
 * path were permission-equivalent. `s2sCaller.workspaceId` is already D2-
 * validated at mint time (TokenExchangeService, both OBO and service mode
 * always populate it), so when present it is safe to trust outright — the
 * request's own declared `workspace_id` is discarded rather than merely
 * cross-checked, which also saves a redundant coverage query.
 */
import { ForbiddenException } from "@nestjs/common";
import type { S2sCallerCtx } from "./s2s-caller";

/**
 * Resolve the workspace to actually use, and reject a request whose declared
 * product(s) don't match the caller's own product identity. No-op (echoes
 * the request-declared workspace unchanged) when `s2sCaller` is absent — the
 * legacy shared-secret path is a pre-existing trust model out of scope here.
 */
export function scopeToS2sCaller(
  s2sCaller: S2sCallerCtx | undefined,
  requested: { workspaceId: string; productCodes: readonly string[] },
): { workspaceId: string } {
  if (!s2sCaller) {
    return { workspaceId: requested.workspaceId };
  }
  if (!s2sCaller.workspaceId) {
    // Defensive: every token minted by TokenExchangeService carries
    // workspace_id (OBO derives it from active_workspace, service mode
    // requires it to mint at all) — this should be unreachable, but a token
    // whose scope can't be verified must fail closed, not fall back to
    // trusting the caller-declared workspace_id.
    throw new ForbiddenException("s2s_scope_missing_workspace");
  }
  if (requested.productCodes.some((code) => code !== s2sCaller.productCode)) {
    throw new ForbiddenException("s2s_product_mismatch");
  }
  return { workspaceId: s2sCaller.workspaceId };
}
