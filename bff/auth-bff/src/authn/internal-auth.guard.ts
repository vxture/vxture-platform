/**
 * internal-auth.guard.ts — server-to-server internal endpoint guard.
 * @package @vxture/bff-auth
 *
 * Protects IdP endpoints meant only for trusted backend callers (e.g.
 * admin-bff requesting an operator step-up credential, or admin-bff acting
 * on operator/tenant accounts via the internal admin routers). Requires the
 * shared AUTH_INTERNAL_TOKEN in the `x-vxture-internal-auth` header;
 * fail-closed when the token is unconfigured. Constant-time compare to
 * avoid leaking via timing.
 *
 * **Scope note (post-review correction, 2026-07-12)**: this guard does
 * NOT accept T1/T2 S2S bearer tokens. It originally did (T2), but several
 * of its consumers — `operator-admin-internal.router.ts`,
 * `account-admin-internal.router.ts` — perform operator/account admin
 * actions gated only by a caller-declared `actorOperatorId` in the request
 * body, with no cryptographic binding to the caller's identity. Accepting
 * any product's S2S token here would let any confidential OIDC client
 * mint itself access to those admin actions by simply declaring a
 * high-rank operator's id. The S2S bearer-token path now lives ONLY in
 * `PlatformAuthGuard` (`platform-auth.guard.ts`), applied to the three
 * platform-face C2/C3 self-service routers it was actually designed for.
 */
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { VxConfigService } from "@vxture/core-config";
import type { Request } from "express";

export const INTERNAL_AUTH_HEADER = "x-vxture-internal-auth";

@Injectable()
export class InternalAuthGuard implements CanActivate {
  constructor(
    @Inject(VxConfigService) private readonly config: VxConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.auth.AUTH_INTERNAL_TOKEN;
    if (!expected) {
      throw new UnauthorizedException("internal_auth_unavailable");
    }
    const req = context.switchToHttp().getRequest<Request>();
    const presented = req.header(INTERNAL_AUTH_HEADER) ?? "";
    if (!safeEqual(presented, expected)) {
      throw new UnauthorizedException("invalid_internal_auth");
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
