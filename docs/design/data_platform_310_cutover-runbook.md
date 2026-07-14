# B15 — Platform Data Architecture Cutover Runbook (worker-01)

> **Status: STAGED — not executed.** This is the ordered, executable runbook for the
> B15 production cutover. It performs a **destructive** rebuild of the worker-01
> platform database. **Do not run any step in §3 without a second, explicit
> per-action authorization from the owner.**
>
> Strategy = **Option A: clean baseline via `prisma db push`** (validated end-to-end
> locally 2026-07-02). The service rewrite (PR #564) + this baseline deploy **together**
> — the rewritten services target the new tables, so they must not be promoted to a
> host still on the old schema.

---

## 0. Identity data — DECIDED: **A1 (full reset, identity data loss accepted)** — owner, 2026-07-02

> Decision made. worker-01 identity data is treated as disposable; the cutover
> runs §3 as written (whole-DB drop → db push → seed). A `pg_dump` is still taken
> before §3 (§5) as a safety net. The A1/A2 analysis is retained below for the record.

### (record) BLOCKING DECISION — identity data loss

`deploy/scripts/26-reset-platform-database.sh` runs `DROP DATABASE … WITH (FORCE)`
on the **entire** platform DB. That includes **`identity`**, which has been **in
production on worker-01 since 2026-06-18** — real users, organizations, workspaces,
social-login identities, avatars.

The design's default (data_platform_300_migration.md §0.3/§0.4) is
**保数据 / 禁止 reseed for `identity`** (ALTER RENAME + in-place UPDATE), while only
the **empty** `product`/`commerce`/`model`/`safety`/`support`/`admin` domains are
"rebuild + reseed". A naive Option-A full reset **contradicts** that — it discards
all in-prod identity data.

**Owner must choose before any §3 step:**

- **A1 — Full reset (accept identity data loss).** worker-01 identity data is
  early/disposable → proceed with §3 as written (whole-DB drop + db push + seed).
  This is the simplest path and matches the "reset-DB clean baseline" strategy.
- **A2 — Preserve identity.** identity data must survive → **§3 does NOT apply as-is**.
  Requires an identity-preserving variant (ALTER/UPDATE the identity schema in place;
  rebuild only the empty domains). This is a different, larger cutover — build it
  separately; do not run 26-reset.

> Everything below (§2/§3) assumes **A1**. If **A2**, stop and escalate for the
> preserve-migration design.

---

## 1. Preconditions (verify all before §3)

- [ ] **PR #564 merged to `develop`** and promoted `develop → beta → main` (services + baseline scripts on the deploy ref). Cutover deploys the `main` image.
- [x] **Owner chose A1** (§0, 2026-07-02). Still required: re-confirm the destructive run at execution time (per-action authorization).
- [ ] `worker-01` reachable (`ssh vxture-worker-01`); `vx-platform-pg` container healthy; disk headroom (see reference_deploy_host_ops — full disk → DNS/deploy failure).
- [ ] `/srv/vxture/runtime/secrets/platform.env` present with a valid `DATABASE_URL` (points at the platform DB) — 26-reset parses the DB name from it.
- [ ] Signing keys: `platform-identity.env` already holds a valid RS256 key (26-reset deliberately skips 25-provision; OIDC signs from env, DB `signing_key` empty is fine). If DB key rows/rotation are needed, run 25 separately.
- [ ] Client secrets: if RPs need DB secret hashes, run `27-provision-client-secrets` after seed (seed leaves `secret=unset`).
- [ ] Model Platform DB (B11) is a **separate** DB/cutover — NOT covered here.

## 2. What the baseline now does (Option A, already wired)

`26-reset` orchestrates (destructive; `CONFIRM_RESET_DB=yes`):

1. stop app containers (release connections)
2. `DROP DATABASE … FORCE` + `CREATE DATABASE` (empty) ← **the identity-wipe point (§0)**
3. `21-prepare-platform-database.sh` (checks + env audit)
4. `22-run-platform-migrations.sh` — **now Option A**, three idempotent steps in one tool container:
   - `00-bootstrap.sql` → `CREATE SEQUENCE identity.user_no_seq` (Prisma-unmanaged)
   - `prisma db push` → materialize all 8 schemas from `schema.prisma`
   - `10-deferred-ddl.sql` → §17 non-Prisma DDL (plan guards, append-only triggers, GIN, CHECK)
5. `23-seed-platform-database.sh` (`node seed.mjs` → catalog + sample)
6. restart app containers (same image)

**Deferred, NOT applied by this runbook** (do not block cutover; schedule after):

- usage_event/`_pool` + `audit_log` RANGE partitioning (incompatible with pure db push — apply as a later maintenance step; regular tables are correct, append-only does not depend on partitioning).
- identity tenant/membership owner-consistency constraint triggers (§5) — follow-up.

## 3. Execution (DESTRUCTIVE — per-step owner go required)

```bash
# On the deploy host, after §1 all checked and §0 = A1 confirmed THIS session:
ssh vxture-worker-01
cd /srv/vxture/... # compose dir
CONFIRM_RESET_DB=yes bash scripts/26-reset-platform-database.sh
```

Locally-validated equivalent (what 26→22→23 do), for reference:
`drop+create db → psql 00-bootstrap.sql → prisma db push → psql 10-deferred-ddl.sql → node seed.mjs` — rehearsed green + idempotent 2026-07-02.

## 4. Post-cutover verification

- [ ] All app containers healthy (`docker ps`); auth-bff/console/admin/website up.
- [ ] `SELECT count(*)` on `identity.users`, `product.product`, `commerce.quota_pool` — seed present.
- [ ] Deferred triggers live: `SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_%guard%' OR tgname LIKE 'trg_%append_only'` (expect 6).
- [ ] Smoke: OIDC discovery/authorize probe; a real login (Turnstile needs a human).
- [ ] **Consume engine**: exercise `POST /usage/consume` once the model/product wiring is live (the concurrency correctness is already DB-verified locally, task #22).
- [ ] `deploy-production` workflow green.

## 5. Rollback

Clean baseline has no in-place rollback (data was dropped). Recovery = restore the
pre-cutover DB dump (take one before §3 if A1 and any data matters) or re-run the
prior release's baseline. **Take a `pg_dump` before §3** regardless of A1/A2.

## 6. Memory / instance size (learned the hard way — 2026-07-02)

worker-01 has **1.6 GB RAM**. The first cutover deploy **OOM-thrashed the host**
(sshd banner-timeout, required a manual reboot) because `deploy-production` pulled

- extracted 12 images (~250–375 MB each) **while old containers ran** and new
  services crash-looped against the not-yet-migrated DB. Steady state is fine
  (~900 MB used, containers 40–100 MB each), but a full rolling deploy is not.

**Recommended fix (highest value): resize worker-01 to ≥4 GB** — Aliyun ECS console
→ 停止实例 → 更改实例规格 (≥4 GB) → 启动. Brief downtime, acceptable pre-launch.
Removes the OOM failure class entirely.

**Until resized, deploy memory-safely** (what actually worked here):

- Ensure images are **pre-pulled/cached** on the host, then recreate with
  `docker compose -f compose.platform.yml up -d --pull never` (no extraction spike).
- Avoid `deploy-production`'s `docker compose up --wait` when services can't be
  healthy yet (e.g. new code vs old DB) — it hangs; do the DB reset immediately
  after the recreate instead.
- `26-reset` is already memory-safe: it **stops the app containers before** the
  db push/seed, freeing ~600 MB for the tool container.

## 7. Host / networking gotchas (worker-01)

- **Tailscale ↔ Aliyun 100.100/16 overlap**: Tailscale's `ts-input -s 100.64.0.0/10
! -i tailscale0 -j DROP` drops replies from Aliyun's internal `100.100.0.0/16`
  (metadata, CloudMonitor). Carved out + persisted via
  `/usr/local/sbin/aliyun-cms-netfilter-fix.sh` + a `tailscaled` `ExecStartPost`
  drop-in (ACCEPT `100.100.0.0/16` + `100.103.0.0/16`). Keep this if re-imaging.
- **prisma version**: the deploy pins `prisma@6.0.0`, where `multiSchema` is a
  preview feature — the generator MUST keep `previewFeatures = ["multiSchema"]`
  (a newer local prisma has it GA and masks the requirement).
- **Promotions must be fast-forward**: don't merge-style promote (it diverges
  beta/main and breaks the FF workflow + docker-build's change detection on a
  force-push). Realign with a force ref-update only as a one-time repair.
