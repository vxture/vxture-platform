-- ════════════════════════════════════════════════════════════════════════════
-- ⚠️ SUPERSEDED — 非权威（2026-07-04）。结构单一权威已迁至 deploy/database/ddl/
--    （序列见 ddl/00_schemas.sql）。本文件不再 apply；保留仅作历史参考。见 data_platform_320。
-- ════════════════════════════════════════════════════════════════════════════
-- 00-bootstrap.sql — pre-schema bootstrap for objects Prisma does NOT manage.
--
-- Prisma does not create sequences that sit behind `dbgenerated` column defaults:
-- identity.users.user_no DEFAULT nextval('identity.user_no_seq'). On a clean
-- baseline (empty DB) the users table cannot be created until the sequence exists,
-- so this runs automatically BEFORE `prisma migrate deploy` / `prisma db push`
-- (wired in deploy/scripts/22-run-platform-migrations.sh). Idempotent — safe to
-- re-run on every migrate.
--
-- Keep in sync with migrations/0006_user_no (same START/INCREMENT).

CREATE SCHEMA IF NOT EXISTS "identity";
CREATE SEQUENCE IF NOT EXISTS "identity"."user_no_seq" START WITH 1000010000 INCREMENT BY 1;
