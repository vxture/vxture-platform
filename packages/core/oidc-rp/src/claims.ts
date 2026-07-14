/**
 * claims.ts - map verified access-token claims to the canonical RpUser.
 *
 * Identity Platform §6.3: access claims = sub + active_org + active_workspace +
 * roles (no entitlement). The IdP also releases human-identity claims into the
 * tenant access_token (name/preferred_username/email/phone/account_status, per
 * the RP contract §8) so cross-domain RPs — which cannot read the IdP DB — can
 * render the user. This is the single mapping RP BFFs share, replacing the old
 * per-BFF active_tenant/active_tenant_role/tenantId translation.
 */
import type { RpUser } from "./types";

/** Strip the realm prefix (usr_<id> / opr_<id>) → <id>. */
export function stripSubPrefix(sub: string): string {
  const i = sub.indexOf("_");
  return i >= 0 ? sub.slice(i + 1) : sub;
}

/** Map verified access-token claims to an RpUser (tolerant of missing fields). */
export function mapAccessClaims(claims: Record<string, unknown>): RpUser {
  const sub = String(claims.sub ?? "");
  return {
    sub,
    userId: stripSubPrefix(sub),
    activeOrg: claims.active_org != null ? String(claims.active_org) : null,
    activeOrgType:
      claims.active_org_type != null ? String(claims.active_org_type) : null,
    activeOrgName:
      claims.active_org_name != null ? String(claims.active_org_name) : null,
    activeWorkspace:
      claims.active_workspace != null ? String(claims.active_workspace) : null,
    activeWorkspaceName:
      claims.active_workspace_name != null
        ? String(claims.active_workspace_name)
        : null,
    roles: Array.isArray(claims.roles) ? claims.roles.map(String) : [],
    userType: claims.userType != null ? String(claims.userType) : null,
    name: claims.name != null ? String(claims.name) : null,
    preferredUsername:
      claims.preferred_username != null
        ? String(claims.preferred_username)
        : null,
    email: claims.email != null ? String(claims.email) : null,
    emailVerified:
      typeof claims.email_verified === "boolean" ? claims.email_verified : null,
    phone: claims.phone != null ? String(claims.phone) : null,
    phoneVerified:
      typeof claims.phone_verified === "boolean" ? claims.phone_verified : null,
    accountStatus:
      claims.account_status != null ? String(claims.account_status) : null,
    picture: claims.picture != null ? String(claims.picture) : null,
  };
}
