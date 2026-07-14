# Vxture Platform Open Tasks

> Version: 1.2.2 | Updated: 2026-06-10
> Priority: 🔴 P0 blocks launch / 🟠 P1 must be completed shortly after launch / 🟡 P2 can be iterated
> This file tracks platform-level functional tasks. Documentation system tasks are in the current conversation list.

---

## 🔴 P0 — Launch Blockers

### ~~T01 · Mail System~~ ✅ Completed on 2026-05-02 (basic version)

**Architecture:** Aliyun SMTP (DirectMail) + Nodemailer, standalone package `@vxture/service-mail`

**Completed:**

- [x] `@vxture/service-mail` package (`services/notification/mail/`)
- [x] `SmtpMailProvider` (Nodemailer, port 465 SSL) + `ConsoleMailProvider` (development fallback)
- [x] `MailService`: automatic retry once on send failure, supports verification code / password reset templates
- [x] `VerifyCodeService`: 6-digit verification code, Redis TTL 10 minutes, rate limit (1/minute · 5/hour · 10/day)
- [x] `POST /api/send-code` and `POST /api/verify-code` integrated into website-bff

**Environment variables:** For local development, fill in `runtime/secrets/platform-mail.env`; for VXTURE_DEPLOY_HOST production environment, fill in `/srv/vxture/runtime/secrets/platform-mail.env`, then Compose injects it into the BFF that actually sends emails.

```
SMTP_HOST=smtpdm.aliyun.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@mail.vxture.com
SMTP_PASS=(generated in Aliyun console)
SMTP_FROM="Vxture Studio <no-reply@mail.vxture.com>"
REDIS_URL=redis://localhost:6379
WEBSITE_BASE_URL=https://vxture.com
```

**All integration points completed:**

- [x] `requestPasswordReset` integrated with `MailService.sendPasswordReset` (`bff/website-bff/src/auth/auth.service.ts:81`)
- [x] `console-bff` subscription change notifications (upgrade / pause / resume / cancel) → recipient `req.user.email`
- [x] `admin-bff` offline payment settlement confirmation / rejection notification → recipient `org.contact_email`

**Code entry points:**

- `services/notification/mail/src/` — core service
- `bff/website-bff/src/routers/verifycode.router.ts` — verification code API route
- `bff/console-bff/src/routers/subscription.router.ts:117` — subscription change email (fire-and-forget)
- `bff/admin-bff/src/routers/payments.router.ts:134` — payment settlement/rejection email (fire-and-forget)

---

### ~~T02 · Password Reset Flow~~ ✅ Completed on 2026-05-02 (including email sending)

- [x] `POST /api/auth/forgot-password` → calls `MailService.sendPasswordReset` to send reset email
- [x] `POST /api/auth/reset-password` (consume token, reset password)
- [x] token stored in DB (`account.password_reset_token`, SHA-256 hash, 15-minute TTL, one-time use)
- [x] frontend `LoginForm` forgot password panel: displays "email sent" message after success (no longer exposes the link)
- [x] new `/reset-password` page (`ResetPasswordForm` component)

**Code entry point:** `bff/website-bff/src/auth/auth.service.ts` → `requestPasswordReset`

---

### ~~T03 · Tenant Initialization (bind tenant after registration)~~ ✅ Completed on 2026-05-02

- [x] `POST /api/auth/tenant/init` (parameter `{ type: 'individual' | 'organization' }`)
- [x] `OrganizationReadRepository.createTenant` — transaction: INSERT tenant + INSERT tenant_member(owner)
- [x] `OrganizationReadService.createTenantForAccount` — business layer wrapper
- [x] `WebsiteAuthService.initTenant` — idempotent creation + re-sign JWT (including tenantId + authScope.TENANT_CONSOLE)
- [x] frontend `VerifyForm.handleChoose` — after calling the API, `window.location.href` redirects to console
- [ ] ⚠️ Not yet implemented: assign default quota to tenant (depends on service-billing, to be added after T05)

**Code entry points:**

- `services/tenant/organization/src/repository/pg-organization.repository.ts` → `createTenant`
- `bff/website-bff/src/routers/auth.router.ts` → `POST api/auth/tenant/init`
- `portals/website/src/components/auth/VerifyForm.tsx` → `handleChoose`

---

### ~~T04 · website-bff tenant middleware~~ ✅ Completed on 2026-05-02

- [x] `TenantMiddleware` — reads JWT cookie, extracts `tenantId`, attaches to `req.tenantId`
- [x] `AppModule` — registered after `AuthMiddleware`, applies to all `api/*` routes

**Code entry point:** `bff/website-bff/src/middleware/tenant.middleware.ts`

---

### T05 · Third-party payment integration

**Impact:** The platform cannot collect payments online, and the subscription/upgrade flow cannot be closed.

- [ ] Determine payment channels (Alipay / WeChat Pay / Stripe)
- [ ] Integrate payment SDK in `bff/admin-bff`, implement order creation, callback, and reconciliation
- [ ] Frontend billing/orders page already has UI, just connect to the API
- [ ] If initial phase uses offline reconciliation (enterprise customers), this item can be deferred

**Code entry point:** `bff/admin-bff/src/routers/payments.router.ts` (currently pure internal data operation)

---

## 🟠 P1 — Short-term must-fix after launch

### ~~T06 · Varda AI Assistant~~ ✅ Phase 1 completed (three ends running)

- [x] `bff/varda-bff`: middleware + CallerContext + /varda/chat SSE passthrough
- [x] `agent-server/varda`: ToolRegistry + 9 read-only tools + Tool Use Loop + Prisma
- [x] `agent-studio/varda`: embedded in admin / console sidebar
- [x] Nginx SSE route configuration + environment variable template

**Specification document:** `docs/product/agents/varda/spec.md`
**Phase 2 pending:** See `docs/product/agents/varda/status.md` (execution tools / audit logs / jti blacklist)

---

### ~~T07 · Admin three placeholder pages~~ ✅ Completed on 2026-05-11

- [x] Audit logs page (`/audit-logs`) — `AuditLogsPage.tsx`, includes summary cards / filters / pagination
- [x] Announcement management page (`/announcements`) — `AnnouncementsPage.tsx`, list + card dual view
- [x] Skill management page (`/skills`) — `SkillsPage.tsx`, list + card dual view

**Note:** BFF routes (`audit-logs.router.ts` / `announcements.router.ts` / `skills.router.ts`) are registered, currently return empty lists; pages will take effect automatically after data layer (DB query) integration.

**Code entry points:**

- `portals/admin/src/modules/audit-logs/AuditLogsPage.tsx`
- `portals/admin/src/modules/announcements/AnnouncementsPage.tsx`
- `portals/admin/src/modules/skills/SkillsPage.tsx`

---

### ~~T08 · Social login integration~~ ✅ DingTalk/Feishu completed, WeChat pending

- [x] DingTalk OAuth2 integration (`bff/auth-bff/src/providers/dingtalk.provider.ts`)
- [x] Feishu OAuth2 integration (`bff/auth-bff/src/providers/feishu.provider.ts`)
- [x] auth-bff new OAuth route (`GET /auth/oauth/:provider/start` + `/auth/oauth/:provider/callback`)
- [ ] WeChat OAuth2 integration → consolidate into **T18** (table-driven + multi-provider completion)

**Completed architecture:**

- `GET /auth-api/auth/oauth/:provider/start` — generate state stored in Redis (10-minute TTL), redirect to third-party authorization page
- `GET /auth-api/auth/oauth/:provider/callback` — verify CSRF state, exchangeCode for token, getUserInfo to obtain user info, loginWithOAuth issues JWT, writes HttpOnly Cookie, redirects back to original page

**Code entry points:**

- `bff/auth-bff/src/routers/oauth.router.ts` — route (`startOAuth` L120 / `handleCallback` L145)
- `bff/auth-bff/src/providers/dingtalk.provider.ts` — DingTalk API wrapper (exchangeCode / getUserInfo)
- `bff/auth-bff/src/providers/feishu.provider.ts` — Feishu API wrapper (exchangeCode / getUserInfo)
- `bff/auth-bff/src/auth/auth.service.ts:298` — `loginWithOAuth` (query/auto-register user, issue JWT)
- `portals/website/src/components/auth/LoginForm.tsx:403` — `SocialLoginButtons` (frontend jump entry)

---

### ~~T09 · Deployment configuration documentation~~ ✅ Completed on 2026-05-11

- [x] Root `.env.example` (unified management of all shared variables)
- [x] `bff/admin-bff/.env.example` (package-level override: `ADMIN_BFF_PORT` / `MODEL_PLATFORM_URL`)
- [x] `bff/website-bff/.env.example` (package-level override: `WEBSITE_BFF_PORT` / OAuth credentials)
- [x] `bff/console-bff/.env.example` (package-level override: `CONSOLE_BFF_PORT`)
- [x] Required variables marked: `DATABASE_URL` / `JWT_SECRET` / `AUTH_COOKIE_DOMAIN` / `AUTH_BFF_URL` / `AUTH_INTERNAL_TOKEN` / `MODEL_PLATFORM_URL`

---

### ~~T10 · console-bff / portals/console interface integration verification~~ ✅ Completed on 2026-05-12

**Verification conclusion:** All BFF router and service interface signatures are fully aligned, no broken links.

| Module          | Router                              | Status                                                                                                                           |
| --------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Billing         | `billing.router.ts`                 | ✅ `queryInvoices` / `getBillingOverview` signatures match                                                                       |
| Subscription    | `subscription.router.ts`            | ✅ `getTenantSubscriptions` / `upgradePlan` / `pauseSubscription` / `resumeSubscription` / `cancelSubscription` signatures match |
| Members         | `iam.router.ts` → SessionAggregator | ✅ All CRUD methods fully aligned with OrganizationReadService                                                                   |
| Roles           | `iam.router.ts` → SessionAggregator | ✅ `createRole` / `updateRole` / `deleteRole` signatures match                                                                   |
| Personal info   | `me.router.ts`                      | ✅ Aligned with AccountAuthService                                                                                               |
| Tenant context  | `tenant-context.router.ts`          | ✅ `/api/tenant-context`                                                                                                         |
| Capability list | `capabilities.router.ts`            | ✅                                                                                                                               |

**Fixed:**

- Added `@Injectable()` decorator to `BillingService` / `SubscriptionService`
- Documentation `console-bff.md` path prefix `/api/tenant` → `/api/tenant-context`

**Technical debt (does not affect runtime):**

- billing / subscription still use in-memory mock data, need to switch Repository implementation after real DB integration
- Repository NestJS provider registered in BillingModule / SubscriptionModule is inconsistent with service internal singleton

**Code entry point:** `bff/console-bff/src/routers/`

---

### T17 · iam RBAC runtime end-to-end (permission source consolidation)

> Design basis see plan "runtime end-to-end" R1. Data layer is ready (iam roles/permissions/bindings/capability already seeded), missing **runtime consumption**.

**Problem:** auth-bff login/JWT issuance always sets `permissions: []` + hardcoded `role`, never queries iam; downstream `RolesGuard`/`jwt-auth.guard` trust JWT.payload.permissions, so guards relying on central JWT always see empty permissions. Tenant permissions are only covered by console-bff `session.aggregator` re-aggregating on its own, source is not unified and can drift.

- [ ] **Current-state audit (do first):** Inventory JWT.permissions consumers vs bypassers (console re-aggregate), relationship between admin/ops and tenant permission models, produce "single source" target state
- [ ] auth-bff integrates iam repository, resolves account→tenant_member→member_role_binding→role→role_permission effective role+permissions
- [ ] `loginWithOAuth` / password login / phone verification code paths all write to session/JWT uniformly (replace 5 empty permissions + hardcoded role)
- [ ] Align with console-bff `session.aggregator` wording, eliminate dual-source drift
- [ ] Confirm `plan_capability` runtime performs capability gating (add if missing)

**Code entry points:** `bff/auth-bff/src/auth/auth.service.ts` (234/304/376/502/571/677), `packages/core/auth/src/guards/`, `bff/console-bff/src/aggregators/session.aggregator.ts`

---

### T18 · SSO Provider table-driven + multi-provider completion

> Design basis see plan "runtime end-to-end" R2. Consolidate T08 "WeChat pending". Configuration side is table-driven (`oauth_provider` table + repo injection), missing **implementation-side dynamicization and provider completion**.

**Problem:** `oauth.router.ts:135-139` provider instantiation still hardcodes `switch` (only dingtalk/feishu); `providers/` has only 2 implementation classes; `OAuthProviderType` only has `PASSWORD/DINGTALK/FEISHU/WECHAT`.

- [ ] Expand `OAuthProviderType` with `WEWORK/GOOGLE/GITHUB` (WeChat enum already exists)
- [ ] Change `oauth.router.ts` provider factory from `switch` to dynamic construction based on `oauth_provider.provider_type` (oauth2/oidc)
- [ ] Extract common OAuth2/OIDC provider base class (authorize/exchangeCode/getUserInfo), align with feishu/dingtalk style (stable union/open id, fail-fast)
- [ ] Complete implementation classes: WeChat → WeWork → Google → GitHub (credentials projected through `oauth_provider`, `is_enabled` controls enablement; latter three are extensions, can be P2)
- [ ] Consolidate T08 "WeChat OAuth2 integration" leftover

**Code entry points:** `bff/auth-bff/src/routers/oauth.router.ts`, `bff/auth-bff/src/providers/`, `packages/core/auth/src/types/auth.types.ts:16`

---

## 🟡 P2 — Iterative

### T11 · Varda execution tool audit logs

- [ ] `VardaAuditLog` model in `agent-server/varda` is defined, execution flow not installed
- [ ] Must be completed before launching execution tools

**Code entry point:** `agent-server/varda/prisma/schema.prisma:45` (comment marked as phase 2)

---

### T12 · admin-bff products.router static mock data

- [ ] `capabilityProfiles` constant (lines 53-87) is static configuration, confirm whether to replace with database-driven
- [ ] Confirm product capability data management approach with product team

**Code entry point:** `bff/admin-bff/src/routers/products.router.ts:53`

---

### ~~T13 · BFF Lint configuration~~ ✅ Completed on 2026-05-11

- [x] Create `bff/eslint.config.mjs` (ESLint v9 flat config, TypeScript + NestJS rules)
- [x] Repository-internal BFF lint placeholders cleaned; after P7b Ruyin BFF has moved to `vxture/agentstudio-ruyin`
- [x] Root `pnpm lint` recursively covers all BFFs automatically

---

### T14 · Registration email verification (phase 2)

- [ ] Require email verification before using all features after registration
- [ ] Depends on T01 (mail system) and T03 (tenant initialization)
- [ ] Current registration flow does not require email verification; can be enabled later for compliance needs

---

### T15 · Personal / enterprise real-name verification admin (phase 2)

- [ ] `/verify` page currently takes effect directly after selecting tenant type, no review needed
- [ ] Later can integrate ID card OCR (personal) / business verification API (enterprise)
- [ ] Admin backend needs matching review management page

**Code entry point:** `portals/website/src/components/auth/VerifyForm.tsx` → `handleChoose`

---

### T16 · Umbra / ruyin.ai cross-domain SSO start entry

- [x] Vxture side completed SSO start endpoint corresponding to `VXTURE_SSO_URL`
- [x] SSO start endpoint reuses existing cross-portal `ctx` parameter, parses `from`, `returnTo`, `caller`, optional `state`
- [x] Vxture side validates allowed `ctx.returnTo` origin by `ctx.from`, compatible with cross-domain and same-domain applications
- [x] Start page calls auth-bff while in Vxture login state to generate crossdomain one-time token
- [x] auth-bff generates crossdomain token by `targetDomain` whitelist, avoiding hardcoded target domain
- [x] After generating token, automatically returns to `ctx.returnTo`, appending `token` and optional `state`
- [ ] After deployment, configure Umbra `VXTURE_SSO_URL` as `https://console.vxture.com/zh-CN/sso/start`

**Code entry points:** `portals/console/src/app/[locale]/sso/start/route.ts`, `bff/auth-bff/src/routers/crossdomain.router.ts`

---

## Appendix: Deployment pending items

> Architecture background see [`docs/deployment/00-overview.md`](deployment/00-overview.md) and [`docs/deployment/08-code-environment-map.md`](deployment/08-code-environment-map.md).

### 🔴 Infrastructure cleanup (priority)

- [ ] VXTURE_DEPLOY_HOST: rebuild `/data/platform/` directory structure according to spec
- [ ] VXTURE_DEPLOY_HOST: migrate `vxture-pg-prod` → `/data/platform/db/postgres/`, rename container
- [ ] VXTURE_DEPLOY_HOST: migrate `vxture-redis-prod` → `/data/platform/db/redis/`, rename container
- [ ] VXTURE_DEPLOY_HOST: clean up `vxture-pg-beta`, `vxture-redis-beta`, `ruyin-8443-test`
- [ ] VXTURE_DEPLOY_HOST: confirm whether historical business domains / test proxy configs still need to be retained; business domain configs should move out of this repository's deployment boundary

### 🟠 Platform service deployment (VXTURE_DEPLOY_HOST)

- [ ] Deploy website-bff / console-bff / admin-bff (connect to platform database)
- [ ] Nginx add subdomains: admin, console, api
- [ ] Confirm Cloudflare SSL mode is Full Strict

### 🟠 Platform beta environment (future)

- [ ] Evaluate whether temporary pay-as-you-go server `vxture-beta` is needed
- [ ] Design platform beta creation, deployment, verification, destruction, and cost control process
- [ ] Clarify platform beta database desensitization or test data strategy

### 🟠 Business service deployment (external business repositories)

- [x] vx-worker-02 business beta/prod deployment moved out of `vxture` repository plan, maintained by external business repository
- [x] Ruyin migration and vx-worker-02 deployment belong to `vxture/agentstudio-ruyin`
- [ ] In `vxture/agentstudio-ruyin`, stabilize beta/prod container isolation, ports, subdomains, secrets, deployment audit, rollback, and user acceptance process, and solidify into business workflow templates
- [ ] After Ruyin template is stable, plan Varda migration to `vxture/agentstudio-varda`
- [x] P7b deleted local Ruyin implementation directory, vx-worker-02 historical deployment assets, and related build matrix references in this repository
- [ ] This repository must not continue adding vx-worker-02 workflow, secrets, compose, or deployment scripts

### 🟡 Operations

- [x] P7a correction: removed this repository's vx-worker-02 beta/prod manual deployment entry, kept VXTURE_DEPLOY_HOST platform prod automatic deployment
- [x] vx-worker-02 historical compose/env/scripts files deleted (P7b)
- [ ] VXTURE_DEPLOY_HOST `/data/platform/backups/` automatic backup script (cron pg_dump → sync to Aliyun OSS)
- [ ] VXTURE_DEPLOY_HOST enable 2G swap (relieve memory pressure)
- [ ] `ruyin.ai` Cloudflare Geo routing (domestic redirect to ruyin.vxture.com)

---

## Appendix: Key code entry index

| No. | File                                                                        | Description                                  |
| --- | --------------------------------------------------------------------------- | -------------------------------------------- |
| T01 | `bff/website-bff/src/auth/auth.service.ts`                                  | Mail sending reservation point               |
| T02 | `portals/website/src/components/auth/LoginForm.tsx`                         | Forgot password UI ready                     |
| T03 | `bff/website-bff/src/routers/auth.router.ts` → `POST /api/auth/tenant/init` | ✅ Completed                                 |
| T04 | `bff/website-bff/src/middleware/tenant.middleware.ts`                       | ✅ Completed                                 |
| T05 | `bff/admin-bff/src/routers/payments.router.ts`                              | Pure internal data, no SDK                   |
| T06 | `docs/product/agents/varda/status.md`                                       | ✅ Phase 1 completed, phase 2 see status doc |
| T11 | `agent-server/varda/prisma/schema.prisma:45`                                | Comment marked as phase 2                    |
| T12 | `bff/admin-bff/src/routers/products.router.ts:53`                           | Static mock                                  |
| T17 | `bff/auth-bff/src/auth/auth.service.ts` (permissions:[] in multiple places) | iam RBAC runtime not end-to-end              |
| T18 | `bff/auth-bff/src/routers/oauth.router.ts:135`                              | provider hardcoded switch                    |
