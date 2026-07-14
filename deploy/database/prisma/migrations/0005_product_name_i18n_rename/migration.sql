-- Migration 0005: product app_name_zh + rename cortex→atlas, vault→nocus
--
-- 1. Add Chinese display name column (nullable; populated by seed).
-- 2. Rename app_codes for the two products whose English names changed:
--    cortex → atlas (Atlas 阿特拉斯)
--    vault  → nocus (Nocus 诺克斯)
-- 3. Propagate the new codes to iam.oidc_client and commerce tables.
--
-- Idempotent: UPDATE is a no-op when the target code already exists.

-- ── 1. Add app_name_zh column ──────────────────────────────────────────────────
ALTER TABLE "product"."application"
  ADD COLUMN IF NOT EXISTS "app_name_zh" VARCHAR(128);

-- ── 2. Rename app_codes ────────────────────────────────────────────────────────
UPDATE "product"."application"
  SET app_code = 'atlas', updated_at = NOW()
  WHERE app_code = 'cortex' AND deleted_at IS NULL;

UPDATE "product"."application"
  SET app_code = 'nocus', updated_at = NOW()
  WHERE app_code = 'vault' AND deleted_at IS NULL;

-- ── 3. Rename oidc_client client_ids ──────────────────────────────────────────
UPDATE "iam"."oidc_client"
  SET client_id = 'atlas', updated_at = NOW()
  WHERE client_id = 'cortex';

UPDATE "iam"."oidc_client"
  SET client_id = 'nocus', updated_at = NOW()
  WHERE client_id = 'vault';

-- ── 4. Propagate to bundle_plan_component app_code references ─────────────────
UPDATE "commerce"."bundle_plan_component"
  SET app_code = 'atlas', updated_at = NOW()
  WHERE app_code = 'cortex' AND deleted_at IS NULL;

UPDATE "commerce"."bundle_plan_component"
  SET app_code = 'nocus', updated_at = NOW()
  WHERE app_code = 'vault' AND deleted_at IS NULL;

UPDATE "commerce"."bundle_subscription_component"
  SET app_code = 'atlas'
  WHERE app_code = 'cortex';

UPDATE "commerce"."bundle_subscription_component"
  SET app_code = 'nocus'
  WHERE app_code = 'vault';
