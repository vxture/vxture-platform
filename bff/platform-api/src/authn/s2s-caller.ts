/**
 * s2s-caller.ts — the calling product's identity, derived from a verified
 * T2 S2S token (product_210 §3.5/§8). Populated by PlatformAuthGuard (the
 * platform-face C2/C3 self-service routers ONLY — NOT InternalAuthGuard,
 * which protects operator/account admin-internal routers and must never
 * accept this token type) when the request authenticates via
 * `Authorization: Bearer <token>` instead of the legacy
 * `x-vxture-internal-auth` header; absent on the legacy path.
 *
 * Mirrors current-user.ts's shape/decorator pattern (populated by
 * AccessTokenGuard) — same idiom, different guard, different token type.
 */
import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export interface S2sCallerCtx {
  /** act.sub — the calling product's product_code. */
  productCode: string;
  mode: "obo" | "service";
  orgId: string | null;
  workspaceId: string | null;
}

/**
 * Inject the S2S caller identity (populated by PlatformAuthGuard's Bearer
 * path). `undefined` when the request authenticated via the legacy shared
 * secret instead — handlers that need to distinguish must check for that.
 */
export const S2sCaller = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): S2sCallerCtx | undefined =>
    (ctx.switchToHttp().getRequest() as { s2sCaller?: S2sCallerCtx }).s2sCaller,
);
