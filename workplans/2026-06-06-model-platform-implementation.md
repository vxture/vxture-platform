# Model Platform Implementation Workplan

> Status: active
> Priority: high
> Created: 2026-06-06
> Type: branch / version / implementation plan

## Background

Legacy model gateway naming has been removed from the repository directionally and replaced by:

- `@vxture/service-model-platform` at `services/model/platform`
- `@vxture/model-runtime-client` at `packages/ai/model-runtime-client`
- runtime container / deploy identity `vx-model-platform`
- runtime env file `.env.model-platform`

This workplan tracks the next coding phase. Long-term architecture remains in `docs/30-design/model-platform.md`; this file is only the execution plan for branch, version, implementation order, validation, and merge checkpoints.

## Branch Strategy

Current foundation work starts from the production baseline but must not be merged directly into `main`. Feature branches enter `develop` first, then use the controlled promotion line `develop -> beta -> main`.

Recommended sequence:

| Step | Branch                                        | Purpose                                                                                                       | Merge Target |
| ---- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------ |
| 1    | `feature/model-platform-foundation`           | Commit the completed rename and project-file alignment only. No new behavior.                                 | `develop`    |
| 2    | `feature/model-platform-contracts`            | Add request contract, `application_id`, `application_type`, schema migration, and seed correction.            | `develop`    |
| 3    | `feature/model-platform-runtime`              | Implement runtime call path, provider adapter hardening, model router policy, quota gate, and metering write. | `develop`    |
| 4    | `feature/model-platform-control-plane`        | Implement admin / console model control-plane API and UI corrections.                                         | `develop`    |
| 5    | `feature/model-platform-observability`        | Add runtime health, trace id propagation, metrics surface, and operational checks.                            | `develop`    |
| 6    | `feature/model-platform-observability-harden` | Add production-grade metrics, SLO, alerting pipeline, and internal scrape hardening.                          | `develop`    |

Branch rule:

- `feature/model-platform-foundation` must be created before commit from the current dirty tree.
- Every branch must be independently type-checkable and deploy-script auditable.
- Do not mix rename-only changes with behavior changes.
- Merge only after explicit confirmation.
- Do not push directly to `develop`, `beta`, or `main`.
- Production flow is `feature -> develop -> beta -> main`, with `develop -> beta` and `beta -> main` handled by the controlled promotion workflow.

## Version Strategy

The repository is private and currently has root version `0.1.0`; package versions are not the primary release control. Use milestone versions for implementation tracking:

| Milestone                      | Version Label                            | Scope                                                                                        |
| ------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| Foundation rename              | `model-platform-v0.1-foundation`         | Package rename, deploy rename, docs/project alignment, no behavior change                    |
| Contract baseline              | `model-platform-v0.2-contracts`          | `application_id`, `application_type`, request/response contracts, schema and seed readiness  |
| Runtime MVP                    | `model-platform-v0.3-runtime-mvp`        | Real model invocation path, routing, quota, metering                                         |
| Control Plane MVP              | `model-platform-v0.4-control-plane-mvp`  | Model/provider/grant/policy management API and portal UI                                     |
| Observable production baseline | `model-platform-v0.5-prod-baseline`      | Health, alerts, audit, deploy verification, production readiness                             |
| Observability hardening        | `model-platform-v0.6-prod-observability` | Prometheus/Grafana ready metrics, hardening of observability contracts, and alarm thresholds |

Version bump policy:

- Do not bump root `package.json` for every code change.
- Bump package versions only at milestone completion if the project starts using package versioning for release notes.
- Use Git tags or release notes after merge, not before validation.

## Implementation Scope

### P0 - Foundation Rename

Goal: make the repository consistently reflect the new packages.

Status: completed and merged to `develop`.

Current expected state:

- `packages/ai/model-runtime-client` exists and type-checks.
- `services/model/platform` exists and type-checks.
- root workspace, path aliases, CI/CD, docker build, deploy scripts, docs, and portal/BFF route names point to Model Platform.
- old model gateway and SDK package identities are removed.

Exit checks:

- `rg` old identity scan returns no matches.
- `pnpm --filter @vxture/model-runtime-client type-check`
- `pnpm --filter @vxture/service-model-platform type-check`
- `pnpm --filter @vxture/bff-admin type-check`
- `pnpm --filter @vxture/bff-console type-check`
- `node scripts/guardrails/audit-env.mjs`
- `git diff --check`

P0 Sonar note:

- The foundation rename can make Sonar treat moved packages, portals, and service files as new code.
- P0 may temporarily exclude rename-only targets from Sonar source / coverage gates while CI still runs type-check, build, and service tests.
- P1/P2 must restore Sonar source and coverage gates for `@vxture/model-runtime-client`, `@vxture/service-model-platform`, and affected portal files after behavior contracts and tests are expanded.

### P1 - Contracts And Schema

Goal: replace agent-specific runtime identity with application-scoped identity.

Status: completed and merged to `develop`.

Tasks:

- Add or normalize runtime request fields:
  - `tenant_id`
  - `application_id`
  - `application_type = agent | workflow | api_client | internal_service`
  - `session_id`
  - `request_id`
  - `feature_code`
  - `model_code`
- Keep `agent_id` only as backward-compatible input mapped to `application_id` with `application_type = agent`.
- Reject `application_id` without `application_type` in runtime validation.
- Keep legacy `agent_id` database column for existing reports, but use `application_id + application_type` as the target attribution key.
- Update Prisma schema and migrations for application-scoped grant / policy / usage attribution.
- Update seed data to include application-aware examples without hardcoding real secrets.
- Update `@vxture/model-runtime-client` types first, then service runtime types.

Exit checks:

- Prisma schema validates.
- TypeScript passes for model runtime client, model platform service, Varda server, admin BFF, console BFF.
- Seed SQL does not contain old package names or old endpoint names.

### P2 - Runtime MVP

Goal: make Model Platform the single runtime execution path for LLM calls.

Status: completed and merged to `develop`.

Tasks:

- Define normalized runtime request and response contract.
- Implement model selection through `src/router`.
- Keep provider adapters isolated in `src/providers`.
- Enforce tenant and application grant before provider call.
- Enforce commerce quota before provider call.
- Write usage event only after successful provider response.
- Return structured errors for grant denied, quota exceeded, provider unavailable, and model not routable.
- Propagate `request_id` for logs and future trace correlation.
- Support provider fallback through model `config.fallbackModelCodes`; fallback does not bypass grant or quota checks.

Exit checks:

- Unit tests cover grant denied, quota exceeded, provider fallback, and usage write behavior.
- `@vxture/model-runtime-client` request contract matches service controller contract.
- No provider SDK import outside provider adapter modules.

### P3 - Control Plane MVP

Goal: support operational management of provider, model, grant, policy, and price metadata.

Status: completed and merged to `develop` through PR #137.

Execution principle:

- Documentation and API contract first.
- Service implementation second.
- BFF permission boundary third.
- Portal UI last.
- Do not mix P3 with observability, deploy promotion, or server-side runtime changes.

Tasks:

Service API:

- Audit current `/model-platform/admin` controller and service capabilities.
- Ensure provider, model, grant, policy, and price metadata APIs have explicit DTOs.
- Add application-scoped grant / policy API shape on top of `application_id + application_type`.
- Return structured errors for invalid model/provider/grant/policy operations.
- Keep provider credentials as runtime env or future key reference only; no plaintext key API.

Admin BFF:

- Keep endpoints under `/api/model-platform`.
- Enforce explicit platform permission at every endpoint.
- Proxy only platform-operator operations.
- Preserve structured upstream errors where possible.
- Do not log provider credentials, secret env names with values, or request bodies containing secrets.

Console BFF:

- Keep endpoints under `/api/model-platform`.
- Enforce tenant context and permission checks at every endpoint.
- Support tenant-visible model list, grant state, quota state, usage summary, and allowed tenant/application preferences.
- Reject platform-wide provider/model mutation from tenant context.

Admin Portal:

- Show platform-level provider/model registry.
- Show tenant and application grant management.
- Show policy and provider-cost metadata where appropriate.
- Do not display provider key values.

Console Portal:

- Show tenant-visible models.
- Show grant state, quota state, and usage summary.
- Show application-level preferences only if the BFF contract allows tenant operation.
- Do not expose platform-level provider config or cost price.

Exit checks:

- BFF data access follows `docs/40-implementation/ai/05-bff-data-access-guide.md`.
- Permission checks are explicit at BFF entrypoints.
- Portal UI uses existing design system conventions and does not import service packages.
- Service tests cover admin/control-plane success and denial cases.
- Admin BFF and Console BFF type-check.
- Admin and Console portals type-check after UI changes.
- Search confirms provider key plaintext is not exposed in BFF responses or portal source.

P3 API gap list from current audit:

| Area                     | Current State                                                                                                                                            | Gap                                                                                                                                                                            | Priority |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| Service provider API     | `model.provider` exists in Platform DB design and seed, but `services/model/platform/prisma/schema.prisma` does not declare a Prisma proxy model for it. | Add service-side provider record type, Prisma proxy model, repository methods, service methods, controller endpoints.                                                          | P3.1     |
| Service model API        | `/model-platform/admin/models` supports list/create/update/activate/deactivate/delete.                                                                   | DTOs are ad hoc TypeScript bodies, errors are generic Nest exceptions, and response still exposes full `config`; define explicit safe DTOs and redact secret-like config keys. | P3.1     |
| Service grant API        | `/model-platform/admin/grants` supports tenant/model filters and CRUD-like activation/deactivation.                                                      | Need application-scope filters, model metadata join or summary, structured errors, and stronger validation that `application_id` and `application_type` are paired.            | P3.1     |
| Service policy API       | `model.model_policy` exists in core schema, but current service Prisma proxy and admin API do not expose it.                                             | Add policy list/create/update/activate/deactivate for tenant and application planning; keep runtime enforcement for later if needed.                                           | P3.2     |
| Service price API        | `model.model_price_rule` exists in core schema and seed, but current service Prisma proxy and admin API do not expose it.                                | Add price rule list/create/update/activate/deactivate; mark as provider-cost metadata, not customer-facing pricing.                                                            | P3.2     |
| Tenant quota / usage API | Runtime reads commerce quota and writes usage summary, but control-plane admin API does not expose quota state or usage summary.                         | Add read-only tenant quota / usage summary endpoints for Admin and tenant-scoped Console views.                                                                                | P3.3     |
| Admin BFF                | `bff/admin-bff/src/routers/model-platform.router.ts` proxies model/grant admin API and checks `platform.model.manage`.                                   | Add provider/policy/price/quota/usage routes after service API exists; preserve structured errors instead of collapsing all failures to `BadGatewayException`.                 | P3.4     |
| Console BFF              | `bff/console-bff/src/routers/model-platform.router.ts` proxies admin model/grant writes and requires `platform.model.manage`.                            | Replace with tenant-scoped read/allowed operations; forbid platform-wide provider/model/grant mutation from tenant context.                                                    | P3.4     |
| Admin portal             | `portals/admin/src/modules/ai/ModelPlatformPage.tsx` manages model registry; `ModelGrantsPage.tsx` manages grants.                                       | Extend after API/BFF: provider registry, policy, price metadata, richer application grant management, no provider key display.                                                 | P3.5     |
| Console portal           | `portals/console/src/app/[locale]/(console)/model-platform/page.tsx` is a placeholder that links to Admin.                                               | Build tenant-visible model availability, grant state, quota state, and usage summary; remove Admin jump as the primary tenant workflow.                                        | P3.6     |
| Portal/BFF types         | Admin and Console entity types still include `apiKeyEnvVar`, while current service model response uses `config`.                                         | Remove `apiKeyEnvVar` from portal-visible contracts; if key status is needed, expose safe `keyConfigured` / `keyReference` metadata only.                                      | P3.1     |

P3 recommended implementation slices:

1. P3.1 service model/grant DTO hardening and secret redaction. Status: completed and merged.
2. P3.2 provider / policy / price service API. Status: completed and merged.
3. P3.3 read-only quota / usage state API. Status: completed and merged.
4. P3.4 Admin BFF and Console BFF boundary correction. Status: completed and merged.
5. P3.5 Admin portal expansion. Status: completed and merged.
6. P3.6 Console tenant model-platform page. Status: completed and merged.

### P4 - Observability And Operations

Goal: make runtime operation measurable and deployable.

Status: local implementation and documentation consolidation complete; server-side verification passed on VXTURE_DEPLOY_HOST; ready for PR-to-develop handoff after confirmation.

Execution principle:

- Documentation and operational contract first.
- Service health and structured logs second.
- Deployment and alert scripts third.
- Portal dashboards last, only after health and metrics contracts are stable.
- Do not split a standalone model-observability service in P4.
- Do not directly modify servers; server-side changes must be script-driven and confirmed.

P4.0 documentation closeout:

- Mark P3 as completed and merged to `develop`.
- Align `docs/30-design/model-platform.md`, `docs/40-implementation/packages/services/model-platform.md`, and deployment docs with P4 scope.
- Record the P4 milestone as `model-platform-v0.5-prod-baseline`.
- Define the execution branch and confirmation gates.
- Keep this workplan as the only formal P4 task/status tracker.
- Keep `docs/50-deployment/11-model-platform-operations.md` as the formal runbook and operations rule document.
- Keep `.work-in-progress/` as local-only draft storage; do not commit it.

P4.1 observability contract:

- Add health endpoint that reports provider registry readiness, DB connectivity, and runtime config readiness.
- Health endpoint status: implemented locally.
- Distinguish liveness from readiness:
  - Liveness answers whether the process can respond.
  - Readiness answers whether runtime dependencies and model-platform configuration are usable.
- Define provider health shape with provider code, active status, configured key reference, last check result, and error class.
- Define runtime config readiness checks for env files, provider key references, model registry, grant registry, quota access, and usage write access.
- Define structured log fields:
  - `request_id`
  - `tenant_id`
  - `application_id`
  - `application_type`
  - `model_code`
  - `provider_code`
  - `status`
  - `latency_ms`
  - `error_code`
  - `fallback_attempt`

P4.2 operations and deploy checks:

- Extend deployment checks to validate `.env.model-platform`, container presence, Docker network, service port, and runtime health endpoint.
- Deploy check status: implemented locally for Model Platform health readiness.
- Define which checks run in CI/CD and which checks run only on VXTURE_DEPLOY_HOST after deployment.
- Keep runtime secrets out of deploy bundle and CI logs.
- Update the target behavior of `scripts/40-verify-platform-runtime.sh`. Status: implemented locally.
- Update the target behavior of `scripts/51-check-platform-alerts.sh`. Status: implemented locally.
- Keep checks idempotent and suitable for both fresh deployment and update deployment.

P4.3 alert taxonomy:

| Severity | Category               | Examples                                                                                      | Expected Action                                          |
| -------- | ---------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| HIGH     | Service unavailable    | model-platform container missing, health endpoint unreachable, DB unavailable                 | Block deployment or mark platform runtime unavailable.   |
| HIGH     | Runtime config missing | `.env.model-platform` missing, required provider key reference missing, model registry empty  | Stop before serving model traffic.                       |
| HIGH     | Runtime write failure  | usage event write failure, usage summary update failure, quota check cannot read commerce DB  | Alert operator; do not silently drop accounting facts.   |
| MEDIUM   | Provider degraded      | provider timeout, provider 5xx, fallback frequently used, provider key configured but failing | Keep service online if fallback works; alert operations. |
| MEDIUM   | Quota / metering lag   | summary not refreshed, abnormal token growth, high denied ratio                               | Review quota job and tenant usage.                       |
| LOW      | Operational hygiene    | missing runtime-env backup, stale version, no recent provider health sample                   | Track as maintenance item.                               |

P4.4 implementation plan:

1. Add service health contract and tests in `@vxture/service-model-platform`. Status: implemented locally.
2. Add structured logging at runtime request boundaries and provider call boundaries. Status: implemented locally.
3. Add provider readiness and config readiness checks without exposing secret values. Status: implemented locally.
4. Extend deploy verification scripts and platform alert scripts. Status: implemented locally.
5. Update CI/CD docs to explain which P4 checks are automated and which are manual post-deploy checks.
6. Add Admin read-only operational status surface only if the health API contract is stable.

P4.5 remaining consolidation tasks:

| Task                         | Priority | Status            | Acceptance                                                                                                                        |
| ---------------------------- | -------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Metrics controller decision  | High     | completed locally | `/metrics` registered with container-internal access boundary documented.                                                         |
| Diagnostics guard hardening  | High     | completed locally | Diagnostics endpoint requires an internal guard and does not expose secret values.                                                |
| Log privacy verification     | High     | completed locally | Tests prove logs exclude prompt, response, provider key reference, and provider key value.                                        |
| Script syntax verification   | Medium   | completed locally | `D:\Program Files\Git\bin\bash.exe -n` passed for `40` and `51` scripts on 2026-06-07.                                            |
| Formal runbook consolidation | Medium   | completed locally | Temporary runbook content merged into `docs/50-deployment/11-model-platform-operations.md`.                                       |
| Task tracker consolidation   | Medium   | completed locally | Temporary task list content merged into this workplan; `.work-in-progress/` remains local-only.                                   |
| Server-side verification     | High     | pass              | VXTURE_DEPLOY_HOST runs `40-verify-platform-runtime.sh` and `51-check-platform-alerts.sh` after deployment (pass, HIGH=0, LOW=1). |
| CI gates and coverage        | Medium   | completed         | CI validates type-check, lint, tests, env audit, and no secrets in deploy bundle with warning-fail mode in CI.                    |

Deferred production hardening:

- Migrate Provider API key storage from runtime env references to Docker secrets, Vault, or equivalent secret store.
- Add Prometheus scrape configuration and Grafana dashboard.
- Replace temporary diagnostics guard with mTLS, BFF token validation, or equivalent internal auth.
- Add Nginx / LB ACL for `/metrics` before exposing it beyond container-local access.
- Define Model Platform SLOs for latency, provider error rate, fallback rate, quota-denied ratio, and metering failures.

Current note:

- `prom-client` 已完成替换，已具备 Prometheus 兼容基础指标抓取；待补齐的是可视化与告警链路联动（Dashboards + Notification Routing）。

Exit checks:

- `scripts/40-verify-platform-runtime.sh` can verify model platform runtime readiness.
- `scripts/51-check-platform-alerts.sh` reports actionable high/low severity items.
- CI/CD deploy bundle includes no runtime secrets.
- Service tests cover health response shape and degraded dependency states.
- Logs include request correlation fields without prompt content, response content, provider key values, or runtime secrets.
- Admin and Console BFF remain outside direct provider access.
- `.work-in-progress/` is not part of the PR commit.
- PR validation notes only include checks that were actually executed.

### P5 - Observability Hardening

Goal: make P4 scaffolding operationally usable in production telemetry and incident workflows.

Status: production-grade instrumentation implemented locally; pending CI evidence confirmation before PR handoff.

Scope:

- Production-grade instrumentation with `prom-client` 已落地（Prometheus-compatible counters / histograms / gauges）。
- Define minimal SLO and alarm thresholds for latency、error、fallback、quota deny、usage-write failure.
- Clarify `/metrics` 和 scrape 路径的访问边界（容器内网/ACL）。
- Add deployment checks for observability readiness and dashboard/alert smoke checks.
- Keep no secret leakage in any metric labels/values.

P5.1 实施清单:

1. 生产指标改造：`@vxture/service-model-platform` 现有 `metrics.registry.ts` + `metrics.controller.ts`。
2. 运维能力改造：补齐告警阈值表与告警联系人/处理动作到 `docs/50-deployment/11-model-platform-operations.md`。
3. 部署核验改造：`40-verify-platform-runtime.sh` 与 `51-check-platform-alerts.sh` 增加 P5 可观测项检查。
4. 运行验证：本地链路测试 + VXTURE_DEPLOY_HOST 可抓取性验证 + CI 可验证检查项。

Exit checks (P5):

- `/metrics` 输出可被抓取，且标签不包含 prompt/response/provider key/runtime secret。
- P5 检查项在部署/告警脚本中有明确 HIGH/MEDIUM/LOW 分级与处理建议。
- 关键告警触发时不会阻断正常服务外露日志敏感信息，且告警动作可追踪。

## Manual Confirmation Gates

The following actions require explicit confirmation before execution:

- `git add`
- `git commit`
- `git push`
- branch creation / checkout
- merge to `develop`
- promoting `develop` to `beta`
- promoting `beta` to `main`
- CI/CD deployment trigger
- any production runtime env or server-side operation

## Immediate Next Actions

- [x] Start `feature/model-platform-observability-harden`.
- [x] Implement P5.1 production metrics hardening in `@vxture/service-model-platform`.
- [x] Update `docs/50-deployment/11-model-platform-operations.md` with scrape/ACL/SLO/alert playbook.
- [x] Extend `40-verify-platform-runtime.sh` and `51-check-platform-alerts.sh` with P5 checks.
- [x] Execute local verification (type-check / lint / test / coverage / design guardrails / env audit / boundaries).
- [ ] Execute CI verification and record outputs.
- [ ] Request explicit confirmation for `git add / commit / push / PR / merge`.

## P4 收口补充（历史留存）

- P4 的 health/readiness/diagnostics 代码与脚本路径已对齐为本地基线；如后续需回归，可直接参照 `feature/model-platform-observability` 分支的历史记录与本文件 P4 表述。

## Non-Goals

- Do not split Model Platform into multiple deployable services yet.
- Do not introduce a separate model database before schema boundaries are stable.
- Do not store provider API keys in Platform DB plaintext.
- Do not deploy Model Platform to worker-02/03/04/05 business workers.
- Do not directly modify server files; server changes must be script-driven and manually executed or CI/CD-driven after confirmation.

## Open Decisions

| Decision                                                      | Recommended Default         | Reason                                                                   |
| ------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------ |
| Keep package name `@vxture/service-model-platform` for P1-P4? | Yes                         | Avoid another rename before behavior is stable.                          |
| Tag milestones?                                               | Only after merge validation | Keeps tags meaningful and avoids rollback confusion.                     |
| Root version bump now?                                        | No                          | Current task is internal platform refactor; use milestone labels first.  |
| Enter service split now?                                      | No                          | Current volume and contracts do not justify extra deployment complexity. |
