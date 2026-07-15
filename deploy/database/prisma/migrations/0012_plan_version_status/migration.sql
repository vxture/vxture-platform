-- 0012_plan_version_status
-- plan_versions publish lifecycle (product_320): draft | published.
-- Value-domain authority = @vxture/shared PLAN_VERSION_STATUSES; the fresh-build
-- DDL (deploy/database/ddl/40_product.sql) carries the same column + CHECK.
-- Incremental path for the live DB: add the column as 'draft', backfill the
-- version each plan currently points at (current_version_id) to 'published'
-- (it is the live/released version), then pin the CHECK.

ALTER TABLE "product"."plan_versions"
  ADD COLUMN IF NOT EXISTS "status" varchar(32) NOT NULL DEFAULT 'draft';

-- The version a plan currently points at is its live/published version.
UPDATE "product"."plan_versions" pv
   SET "status" = 'published'
  FROM "product"."plans" p
 WHERE p."current_version_id" = pv."id"
   AND pv."status" <> 'published';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_plan_versions_status'
  ) THEN
    ALTER TABLE "product"."plan_versions"
      ADD CONSTRAINT "chk_plan_versions_status" CHECK ("status" IN ('draft','published'));
  END IF;
END $$;
