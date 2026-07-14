# Worker-01 Deployment Scripts Completion Workplan

> Status: active
> Priority: medium
> Created: 2026-06-02
> Type: deployment operations backlog

## Background

`docs/deployment/09-deployment-scripts.md` has defined the target VXTURE_DEPLOY_HOST
deployment script model. The current repository still keeps the older script
names and is missing dedicated runtime verification and runtime env backup
scripts.

This workplan tracks the implementation task only. Long-term naming rules,
script responsibilities, and execution order remain in
`docs/deployment/09-deployment-scripts.md`.

## Target Scripts

| Target Script                   | Current State | Purpose                                                                                |
| ------------------------------- | ------------- | -------------------------------------------------------------------------------------- |
| `10-bootstrap-host.sh`          | renamed       | Bootstrap ECS host, Docker, UFW, Tailscale, data directories, repo checkout            |
| `11-generate-env-files.sh`      | renamed       | Generate or complete runtime env files and secret files                                |
| `20-sync-nginx-config.sh`       | renamed       | Sync Nginx config and reload after validation                                          |
| `30-deploy-platform-stack.sh`   | renamed       | Pull images and deploy the VXTURE_DEPLOY_HOST platform stack                           |
| `40-verify-platform-runtime.sh` | added         | Verify env audit, compose config, container status, health endpoints, Nginx, TLS       |
| `50-backup-runtime-env.sh`      | added         | Backup runtime `.env*`, `secrets/*`, and Nginx config before env changes or deployment |

## Task List

- [x] Rename existing scripts with `git mv`.
- [x] Update script headers, usage text, and terminal output.
- [x] Keep script behavior idempotent and avoid printing secret values.
- [x] Ensure `11-generate-env-files.sh` handles `secrets/platform.env`, `secrets/platform-mail.env`, `secrets/pg-password`, and `secrets/redis-password`.
- [x] Add `40-verify-platform-runtime.sh`.
- [x] Add `50-backup-runtime-env.sh`.
- [x] Update references in compose files, deployment docs, and guardrail scripts.
- [x] Run `pnpm audit:env`.
- [x] Run shell syntax checks in a Linux or Git Bash environment.
- [ ] Verify VXTURE_DEPLOY_HOST server upgrade path after `git pull`.

## Verification Log

- `pnpm audit:env` passed locally on 2026-06-02.
- `VX_ENV_AUDIT_STRICT_RUNTIME=1 node scripts/guardrails/audit-env.mjs` passed locally on 2026-06-02.
- `docker compose -f deploy/compose.platform.yml config --quiet` passed locally on 2026-06-02.
- `bash -n` passed for all six VXTURE_DEPLOY_HOST scripts using the local `bash:5` Docker image on 2026-06-02.
- `.gitattributes` now forces `*.sh` files to LF line endings so Linux bash can parse them after checkout.

## Non-Goals

- Do not change worker-02 or any business repository deployment scripts.
- Do not introduce automated rollback before image tag strategy is finalized.
- Do not modify production env values as part of script renaming.

## Completion Criteria

- All target script names exist under `deploy/scripts/`.
- Old script names are removed or replaced only by explicit compatibility notes if needed.
- `docs/deployment/09-deployment-scripts.md` matches the actual script files.
- Env audit and runtime verification commands are documented and pass.
