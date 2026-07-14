/**
 * access-token.guard.ts — authenticate protected identity-server endpoints by
 * verifying the RS256 access token with the authority's own active key
 * (OidcKeyService). Attaches the caller (CurrentUserCtx) to the request.
 *
 * Authentication only — authorization (who can do what in an org) is enforced
 * per-handler via GovernanceService.assertCan (Task 6.2).
 */
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { OidcKeyService } from "../oidc/oidc-key.service";
import { claimsToCurrentUser, type CurrentUserCtx } from "./current-user";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(@Inject(OidcKeyService) private readonly keys: OidcKeyService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, unknown>;
      currentUser?: CurrentUserCtx;
    }>();
    const header = req.headers["authorization"];
    const token =
      typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice("Bearer ".length)
        : null;
    if (!token) {
      throw new UnauthorizedException("missing_token");
    }
    let claims: Record<string, unknown>;
    try {
      claims = this.keys.verify(token);
    } catch {
      throw new UnauthorizedException("invalid_token");
    }
    const user = claimsToCurrentUser(claims);
    if (!user) {
      throw new UnauthorizedException("invalid_token");
    }
    req.currentUser = user;
    return true;
  }
}
