# Admin Signing Isolation Workplan

> Status: planned
> Priority: low
> Created: 2026-06-02
> Type: security architecture backlog

## Background

The current platform keeps JWT and cookie issuance centralized in `auth-bff`.
`admin-bff` owns admin login decisions, rate limiting, operator account checks,
and admin Cloudflare Turnstile verification, then delegates session issuance to
`auth-bff` through `/auth/internal/sign`.

This is acceptable for the current phase because it preserves one token
lifecycle implementation while keeping admin login policy separate from tenant
login policy.

## Future Option

Split admin token issuance from tenant token issuance.

Target ownership:

- `auth-bff`: tenant login, tenant token issuance, tenant refresh, tenant logout,
  tenant revocation.
- `admin-bff`: admin login, admin token issuance, admin refresh, admin logout,
  admin revocation.

## Potential Benefits

- Stronger isolation between the tenant security domain and the admin security
  domain.
- Separate signing keys, refresh keys, rotation windows, and blast radius.
- Shorter admin login chain because `admin-bff` would no longer depend on
  `auth-bff` for operator session issuance.
- Admin audit, refresh, logout, and revocation behavior can evolve independently.

## Costs And Risks

- Token lifecycle logic would be duplicated or split across two services.
- Middleware, gateway checks, logout, refresh, Redis state, and blacklist logic
  must explicitly distinguish admin and tenant issuers.
- Operations would need separate key rotation and incident response procedures.
- Partial migration would increase ambiguity, so this must be handled as a
  dedicated architecture task rather than a small cleanup.

## Non-Goals For The Current Phase

- Do not split JWT signing now.
- Do not move admin account verification into `auth-bff` now.
- Do not introduce `JWT_ADMIN_SECRET` / `JWT_TENANT_SECRET` until the full
  lifecycle split is designed.

## Entry Criteria

- Admin security requirements require independent signing keys or independent
  revocation policy.
- Token incident blast-radius reduction becomes a production requirement.
- The team is ready to migrate middleware, refresh, logout, and Redis state in
  one coordinated change.

## Initial Task List

- [ ] Design admin token payload, issuer, audience, cookie names, and refresh
      token storage.
- [ ] Add separate admin signing and refresh secrets.
- [ ] Move admin token signing from `auth-bff` internal sign to `admin-bff`.
- [ ] Implement admin refresh, logout, blacklist, and subject revocation.
- [ ] Update admin middleware to verify admin issuer and secret.
- [ ] Update deployment env templates and key rotation documentation.
- [ ] Add migration and rollback plan.
