-- 0010_workspace_meta
-- Reserved workspace presentation/lifecycle fields (console info spec §4.1):
-- description / icon / status (active | archived). Additive, nullable except
-- status (defaults to 'active'). Workspace is weakly shown this phase, but the
-- model is reserved for the Org → multi-workspace evolution.

ALTER TABLE "identity"."workspaces" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "identity"."workspaces" ADD COLUMN IF NOT EXISTS "icon" VARCHAR(64);
ALTER TABLE "identity"."workspaces" ADD COLUMN IF NOT EXISTS "status" VARCHAR(16) NOT NULL DEFAULT 'active';
