/**
 * Paths that carry only the authenticated-user context and deliberately skip
 * tenant + permission resolution (the active-org switch runs before a tenant is
 * established, so it must not require one).
 *
 * TenantMiddleware and PermissionMiddleware both key off this single set. Keeping
 * it as one source of truth preserves the invariant PermissionMiddleware relies
 * on: any /api/* request that reaches PermissionMiddleware with a user has, by
 * then, already had its tenant resolved (or been 401/403-gated) by
 * TenantMiddleware — which is why capabilities can be derived from
 * `req.tenant` without re-resolving the org. Two drifting copies could break
 * that invariant silently.
 */
export const AUTH_CONTEXT_ONLY_PATHS = new Set(["/api/auth/tenant/switch"]);
