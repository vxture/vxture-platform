/**
 * current-user.ts — caller context derived from a verified access token.
 * Pure mapping (claimsToCurrentUser) + the @CurrentUser() param decorator.
 */
import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export interface CurrentUserCtx {
  /** identity-core user id (sub without the usr_ prefix). */
  userId: string;
  /** raw sub (usr_<id>). */
  sub: string;
  /** active organization id from the token, if present. */
  activeOrg: string | null;
  /** governance role codes, scope-prefixed (e.g. org:owner). */
  roles: string[];
}

/**
 * Map verified access-token claims to the caller context. Returns null when the
 * token is not a tenant-user token (operator tokens are not callers of the
 * tenant-realm governance API).
 */
export function claimsToCurrentUser(
  claims: Record<string, unknown>,
): CurrentUserCtx | null {
  const sub = String(claims.sub ?? "");
  if (!sub.startsWith("usr_")) return null;
  return {
    userId: sub.slice(sub.indexOf("_") + 1),
    sub,
    activeOrg: claims.active_org != null ? String(claims.active_org) : null,
    roles: Array.isArray(claims.roles) ? claims.roles.map(String) : [],
  };
}

/** Inject the authenticated caller (populated by AccessTokenGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserCtx =>
    (ctx.switchToHttp().getRequest() as { currentUser: CurrentUserCtx })
      .currentUser,
);
