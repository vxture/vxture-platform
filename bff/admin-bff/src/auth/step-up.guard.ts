/**
 * step-up.guard.ts — enforce a fresh step-up credential on high-risk routes.
 * @package @vxture/bff-admin
 *
 * Global guard, gated by the @RequireStepUp() metadata (operator-identity-
 * security.md §2.3). On a decorated route it requires a valid, unexpired step-up
 * credential (cookie), IdP-signed and BOUND TO THE SESSION operator: the JWT is
 * verified via the RP's JWKS client and its `sub` must equal the session
 * operator's `opr_<id>` — the request body is never trusted. Missing/expired/
 * mismatched → 403 step_up_required (the portal then runs the step-up ceremony).
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { ModuleRef, Reflector } from "@nestjs/core";
import type { OidcRpClient } from "@vxture/core-oidc-rp";
import type { Request } from "express";
import {
  RP_OIDC_CLIENT,
  RP_RUNTIME,
  type RpRuntime,
} from "../oidc/oidc-rp.tokens";
import type { RequestContext } from "../types/console.types";
import { REQUIRE_STEP_UP, stepUpCookieName } from "./step-up.decorator";

@Injectable()
export class OperatorStepUpGuard implements CanActivate {
  // RP deps (RP_OIDC_CLIENT / RP_RUNTIME) are NOT constructor-injected: a global
  // APP_GUARD whose constructor injects another module's useFactory providers
  // deadlocks Nest's instance loader at bootstrap (silent hang, no error). They
  // are resolved lazily via ModuleRef on first use instead — canActivate only
  // runs on @RequireStepUp routes, so this is off the hot path.
  private oidcClient?: OidcRpClient;
  private rpRuntime?: RpRuntime;

  // Explicit @Inject tokens: the bundle is built with esbuild, which does not
  // emit `design:paramtypes` metadata, so type-based DI does not work — every
  // constructor param must name its provider token or it is injected undefined.
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ModuleRef) private readonly moduleRef: ModuleRef,
  ) {}

  private resolveDeps(): { oidcClient: OidcRpClient; rpRuntime: RpRuntime } {
    this.oidcClient ??= this.moduleRef.get<OidcRpClient>(RP_OIDC_CLIENT, {
      strict: false,
    });
    this.rpRuntime ??= this.moduleRef.get<RpRuntime>(RP_RUNTIME, {
      strict: false,
    });
    return { oidcClient: this.oidcClient, rpRuntime: this.rpRuntime };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_STEP_UP,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const { oidcClient, rpRuntime } = this.resolveDeps();

    const req = context.switchToHttp().getRequest<Request & RequestContext>();
    const sessionOperatorId = req.user?.id;
    if (!sessionOperatorId) {
      // AuthMiddleware should have populated this; absence = no session.
      throw new ForbiddenException("step_up_required");
    }

    const token = req.cookies?.[stepUpCookieName(rpRuntime.cookieSecure)];
    if (!token || typeof token !== "string") {
      throw new ForbiddenException("step_up_required");
    }

    let claims: Record<string, unknown>;
    try {
      // Verifies RS256/JWKS + iss + exp + aud=admin (same signer as access tokens).
      claims = await oidcClient.verifyAccessToken(token);
    } catch {
      throw new ForbiddenException("step_up_required");
    }

    const boundToSession = claims.sub === `opr_${sessionOperatorId}`;
    if (claims.stepup !== true || !boundToSession) {
      throw new ForbiddenException("step_up_required");
    }
    return true;
  }
}
