# HANDOFF - Atlas repo scaffold staging bundle

> **SUPERSEDED as the primary deliverable (2026-07-24).** This flat-file bundle
> was step one. It has since been merged with the real, history-preserving
> `git filter-repo` extraction of `services/model/platform` into a single,
> complete, ready-to-push git repository at:
>
> `D:\MyWebSite\vxture\.atlas-extraction\atlas-src`
>
> That repo already contains: 7 real commits of Model Platform service history
> (path renamed `services/model/platform` -> `service`), this governance
> scaffold layered on top as one more commit, and a further commit that
> decouples the service from monorepo-only dependencies (dropped unused
> `@vxture/core-config`/`@vxture/shared` workspace deps, standalone
> `tsconfig.base.json`, standalone `service/Dockerfile`, Prisma schema cut over
> to the physically-separate DB with full DDL<->Prisma lockstep - all three
> guardrails pass there). **Use that repo, not this flat bundle, as the source
> to push into the real `vxture-atlas`.** This bundle's own files are already
> included in it; nothing here is missing from there.
>
> `.atlas-extraction/` lives inside `vxture-platform` only because this
> session cannot write outside it - it is untracked scratch, not meant to be
> committed to vxture-platform's own history. **Do not `git add` it here.**
> Delete it once you've pulled its content into the real `vxture-atlas`.
>
> ### Exact commands to finish the move (run from a shell/session with write
>
> access to `D:\MyWebSite\vxturestudio\vxture-atlas`)
>
> ```
> cd D:\MyWebSite\vxturestudio\vxture-atlas
> git init            # if not already a repo
> git remote add extraction "D:/MyWebSite/vxture/.atlas-extraction/atlas-src"
> git fetch extraction
> git merge extraction/main --allow-unrelated-histories -m "chore: import Atlas history + governance scaffold from vxture-platform extraction"
> git remote remove extraction
> ```
>
> Expect a trivial conflict on `README.md` (both sides have one) - keep the
> extraction's version (it's the atlas-specific one) or hand-merge. After the
> merge: `git add --renormalize .` once to settle any residual CRLF/LF noise
> from the Windows checkout during extraction, then follow product_240 section
> 2.8 (GitHub bootstrap: environments, secrets, ruleset - applied LAST per
> `CLAUDE.md`'s bootstrap order). `pnpm install` still needs to run once with
> network access to generate `pnpm-lock.yaml` before CI's `osv-scanner`/build
> steps are fully exercised (`ci.yml` currently carries `--allow-no-lockfiles`
> as a stopgap - remove it once a real lockfile exists).
>
> Known, deliberately-left-open items for the next task (see
> `docs/60-operations/10-tech-debt.md` in that repo, TD-001..005): deploy host
> unassigned, usage-metering no-op, S2S provider surface (embedding/parse/
> rerank) implementation, BFF-to-service auth, and the compile breaks in
> `quota.service.ts`/`metering.service.ts`/`model-registry.repository.ts` from
> the DB-schema split (intentional - they need C2/C3 client rewiring, which is
> feature development, not migration, and is explicitly out of scope for this
> pass).
>
> --- original flat-bundle notes below, kept for provenance ---

This directory was built inside `vxture-platform` (the only project this
session can write to) as a staging bundle for the real `vxture-atlas` repo at
`D:\MyWebSite\vxturestudio\vxture-atlas`. **Copy every file/directory in this
folder EXCEPT this HANDOFF.md into vxture-atlas's root**, then git-add/commit
there from a session or terminal that has write access to that repo.

Reference sources used: `vxture-karda` (an already-built, standards-compliant
L2 "app profile" repo - the CI/CD, secret-hygiene, and docs-numbering
machinery is copied near-verbatim from it), `docs/30-design/product_240_repo-template.md`
(the org's product-repo template - Atlas is a **services profile**, not app
profile, per its section 2.5/section 3 matrix), and the existing
`services/model/platform` + `deploy/database/ddl-modelruntime/` content
already in vxture-platform (the DDL and package scripts this scaffold is
built around).

## What is NOT in this bundle (do not expect it to just work as-is)

1. **`service/` itself is not here.** The actual NestJS source
   (`@vxture/service-model-platform`, currently at
   `vxture-platform/services/model/platform`) must be moved with
   `git filter-repo` or `git subtree split` to preserve its commit history -
   a flat copy was deliberately NOT done here. This is Phase 4 of the
   repo-split plan. Until it lands, `pnpm --filter @vxture/service-model-platform ...`
   in `package.json`/CI will fail with "no such package" - that is expected
   until Phase 4.
2. **GitHub repo bootstrap** (environments, secrets, ruleset application
   order, first-push-then-ruleset sequencing) - see
   `docs/50-deployment/00-index.md` and product_240 section 2.8. Nothing here
   creates the actual GitHub repo state.
3. **Deploy host assignment.** `docs/50-deployment/00-index.md` and
   `docs/60-operations/10-tech-debt.md` (TD-001) both flag this: no worker/
   stack_root/tailnet-class has been assigned to Atlas. `deploy.yml`'s
   `/srv/md0/atlas` is a placeholder default, not a confirmed allocation.
4. **The actual data migration.** The DDL in `deploy/database/ddl/00_baseline.sql`
   here is the TARGET shape (model.\* + key/reqlog/routing, physically
   separated, no cross-database FK) - it does not itself move any live data
   out of vxture-platform's shared database. That is a live-DB, owner-gated
   operation via `db-init.yml`, not something this scaffold does.
5. **Platform integration contract implementation** (OIDC RP, C2, C3, S2S
   provider surface) - only inert env-var slots and doc placeholders exist
   here. See `docs/60-operations/10-tech-debt.md` TD-003 and
   `docs/80-liaison/00-index.md` (karda's submitted requirements) for what
   needs designing.

## Notable design choices baked into this scaffold (read before changing)

- **No `portals/`, no business-plane DB baseline** (`vx_provision`/
  `local_authz`/`local_usage`). Atlas is explicitly excluded from that
  template section per `product_240` section 3's module matrix - don't add it
  by copying more of karda than intended.
- **Atlas's own DB is a genuinely separate physical database**
  (`vxturestudio_modelruntime_main`), not a `vxturebiz_atlas_{env}`-style
  business-plane DB like karda/arda use. `docker-compose.yml`,
  `deploy/database/ddl/*`, `.env.example`, and `db-init.yml` all reflect this
  - do not "fix" the DB name to match the business-plane convention.
- **`deploy/database/ddl/00_baseline.sql`** uses plain `CREATE TABLE` (no
  `IF NOT EXISTS`), matching the actual content of vxture-platform's existing
  `deploy/database/ddl-modelruntime/*.sql` files it was assembled from - this
  differs from karda's DDL, which uses `IF NOT EXISTS` throughout. Both
  `check-data-architecture.mjs` and `db-init.yml`'s post-apply table-count
  assertion in this bundle were written to accept either form. If you'd
  rather match the org's more common idempotent convention, add
  `IF NOT EXISTS` to every `CREATE TABLE` in `00_baseline.sql` before this
  repo's first real `db-init` run - either form works with the tooling here,
  but pick one and be consistent.
- **No redis service in `docker-compose.yml`.** OIDC RP is present in
  `.env.example` (rigid zone per the template) but `OIDC_RP_ENABLED=off` -
  Atlas has no browser-facing surface today (the operator UI stays in
  vxture-platform's admin/console portals). Add the redis service back only
  when/if that flips to `on`.
- **No edge/nginx vhost** was scaffolded (unlike karda's `configs/edge/`) -
  Atlas is tailnet-only today; `atlas.vxture.com` is reserved but unbound.
- **`ci.yml`'s `audit` job carries `--allow-no-lockfiles`** - remove it once
  Phase 4 lands `service/` with real dependencies; leaving it in permanently
  would let a real vulnerable-dependency scan silently no-op.
- **karda's liaison letter `100-2607240931-karda-atlas-capability-requirements.md`
  is NOT copied into this repo's `docs/80-liaison/`** - only recorded by
  reference in `docs/80-liaison/00-index.md`'s "Received" table, per the org
  liaison convention (one subject, one master copy, the sender's repo owns
  the text). Read the master copy in `vxture-karda` before designing the S2S
  provider surface.

## File-by-file provenance

**[G] = copied near-verbatim from vxture-karda (org-standard, no product-specific content beyond name swaps)**
**[P] = adapted from vxture-karda or the existing vxture-platform DDL, restructured for the services profile**
**[N] = newly authored for Atlas specifically, no direct template source**

| Path                                                                                  | Provenance                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.editorconfig`, `.gitattributes`, `.npmrc`                                           | [G]                                                                                                                                                                                                                                                                                                                              |
| `.gitignore`                                                                          | [P] - dropped Next.js entries (`.next/`, `out/`, `next-env.d.ts`), added `src/generated/` for the Prisma client                                                                                                                                                                                                                  |
| `.gitleaks.toml`, `.osv-scanner.toml`                                                 | [G] - title/product name only                                                                                                                                                                                                                                                                                                    |
| `.husky/pre-commit`                                                                   | [G]                                                                                                                                                                                                                                                                                                                              |
| `.env.example`                                                                        | [P] - services profile, own DB, provider API keys, OIDC RP marked inert                                                                                                                                                                                                                                                          |
| `CLAUDE.md`, `README.md`                                                              | [P] - rewritten around the services profile and atlas-specific rigid/blank zone split                                                                                                                                                                                                                                            |
| `docker-compose.yml`                                                                  | [P] - two services (app+db) not three (dropped redis, see above)                                                                                                                                                                                                                                                                 |
| `package.json`                                                                        | [P] - filters `@vxture/service-model-platform` (the real, already-existing package name) instead of a Next app                                                                                                                                                                                                                   |
| `pnpm-workspace.yaml`                                                                 | [P] - `service` not `portals/*`                                                                                                                                                                                                                                                                                                  |
| `.github/workflows/ci.yml`                                                            | [P] - NestJS esbuild build + vitest instead of Next build/test; `--allow-no-lockfiles` added (see above)                                                                                                                                                                                                                         |
| `.github/workflows/build.yml`                                                         | [P] - Dockerfile path `service/Dockerfile`                                                                                                                                                                                                                                                                                       |
| `.github/workflows/deploy.yml`                                                        | [P] - port 3100, stack root placeholder, host TBD comments                                                                                                                                                                                                                                                                       |
| `.github/workflows/db-init.yml`                                                       | [P] - rewrote the `verify`/baseline-table-check logic for atlas's own schemas (`model`/`key`/`reqlog`/`routing`) instead of karda's `vx_provision`/`local_authz`/`local_usage`; dropped the template-placeholder `sed` substitution since this DDL is hand-authored for atlas directly, not instantiated from a generic template |
| `.github/workflows/rollback.yml`, `secret-scan.yml`, `codeql.yml`                     | [G] - name swaps only                                                                                                                                                                                                                                                                                                            |
| `.github/dependabot.yml`                                                              | [G] - includes the `registries:` block (product_240 section 6#32 lesson)                                                                                                                                                                                                                                                         |
| `.github/actions/tailnet-ssh-connect/action.yml`                                      | [G] - verbatim, zero product-specific content                                                                                                                                                                                                                                                                                    |
| `docs/50-deployment/rebuild/main-ruleset.json`                                        | [G] - verbatim                                                                                                                                                                                                                                                                                                                   |
| `docs/00-meta/*`, `docs/10-standards/00-index.md`, `docs/90-memory/*`                 | [P] - text adapted for atlas/services-profile                                                                                                                                                                                                                                                                                    |
| `docs/20-specs/00-index.md`, `docs/30-design/*`, `docs/40-implementation/00-index.md` | [N] - empty-state placeholders, atlas has no content here yet                                                                                                                                                                                                                                                                    |
| `docs/50-deployment/00-index.md`                                                      | [N] - infra-allocation and bootstrap-checklist summary specific to atlas's current (unassigned) state                                                                                                                                                                                                                            |
| `docs/60-operations/10-tech-debt.md`                                                  | [N] - TD-001..004, real known gaps at extraction time, not fabricated filler                                                                                                                                                                                                                                                     |
| `docs/70-workplan/00-index.md`                                                        | [N] - mirrors the seven-phase repo-split plan                                                                                                                                                                                                                                                                                    |
| `docs/80-liaison/00-index.md`                                                         | [N] - "Received" record for karda's two liaison letters, per the org convention of not copying inbound letters wholesale                                                                                                                                                                                                         |
| `deploy/database/ddl/00_baseline.sql`                                                 | [P] - assembled from vxture-platform's existing `deploy/database/ddl-modelruntime/{00_schemas,10_key,20_reqlog,30_routing,90_partitions}.sql` + the `model.*` tables migrated from `deploy/database/ddl/60_model.sql` (cross-schema FKs on `tenant_id` downgraded to bare values - physical DB separation)                       |
| `deploy/database/ddl/97_service_role.sql`, `98_column_locks.sql`                      | [N] - `atlas_svc` role and column-lock whitelist authored fresh for atlas's four schemas (karda's version is for a completely different schema set)                                                                                                                                                                              |
| `deploy/database/apply.sh`                                                            | [G]                                                                                                                                                                                                                                                                                                                              |
| `deploy/deploy.sh`                                                                    | [P] - two-container lifecycle (no redis), health endpoint `/model-platform/health/live` (the real endpoint already implemented in the in-monorepo service)                                                                                                                                                                       |
| `scripts/guardrails/check-docs-numbering.mjs`, `check-workflows.mjs`                  | [G] - verbatim, zero-dependency org tooling                                                                                                                                                                                                                                                                                      |
| `scripts/guardrails/check-data-architecture.mjs`                                      | [P] - Prisma path changed to `service/prisma/schema.prisma`; DDL-table regex loosened to accept both `CREATE TABLE` and `CREATE TABLE IF NOT EXISTS` (see the baseline note above)                                                                                                                                               |
