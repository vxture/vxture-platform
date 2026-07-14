-- ════════════════════════════════════════════════════════════════════════════
-- ⚠️ SUPERSEDED — 非权威（2026-07-04）。触发器/分区/约束单一权威已迁至
--    deploy/database/ddl/95_triggers.sql + 96_partitions.sql + 90_cross_schema_fk.sql。
--    本文件不再 apply；保留仅作历史参考。见 data_platform_320。
-- ════════════════════════════════════════════════════════════════════════════
-- 10-deferred-ddl.sql — non-Prisma DDL (platform-data-architecture §17 rebuild list).
--
-- Applied AFTER the schema is materialized (db push / migrate). These are objects
-- Prisma does not manage — trigger functions, triggers, GIN indexes, CHECK
-- constraints — so they layer cleanly on top and survive (Prisma never touches
-- triggers/functions). Fully idempotent: safe to re-run on every baseline.
--
-- Grounded in: schema §7.6 (plan lock/priority guards), §8.4 (append-only),
-- §9.8 (immutable ledger), §17 (rebuild list). Guards adapted from the doc's
-- is_locked boolean to the landed plan_version.status model (613bd448):
-- "locked/immutable" == status = 'published'.
--
-- NOT included (see header note in the baseline script):
--  * tenant_usage_event(_pool)/audit_log RANGE partitioning — incompatible with a
--    pure `db push` baseline (Prisma can't express partitioning and would fight it;
--    a regular table cannot be ALTERed into partitioned). Regular tables are
--    correct + proven (consume itest green); partitioning is a retention/scale
--    optimization to apply as a later maintenance step. The append-only guarantee
--    below does NOT depend on partitioning.
--  * identity tenant/membership owner-consistency constraint triggers (§5) — depend
--    on function bodies not yet finalized here; tracked as a follow-up.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. product — versioned-plan financial integrity (§7.6)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1a. published plan_version is immutable → block add/modify/delete of its components
CREATE OR REPLACE FUNCTION product.guard_locked_plan_component()
RETURNS trigger AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM product.plan_version
    WHERE id = COALESCE(NEW.plan_version_id, OLD.plan_version_id);
  IF v_status = 'published' THEN
    RAISE EXCEPTION 'plan_version % is published (immutable); cannot add/modify/delete its plan_component — open a new version',
      COALESCE(NEW.plan_version_id, OLD.plan_version_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plan_component_guard_lock ON product.plan_component;
CREATE TRIGGER trg_plan_component_guard_lock   -- 'g' sorts before priority 'p'
  BEFORE INSERT OR UPDATE OR DELETE ON product.plan_component
  FOR EACH ROW EXECUTE FUNCTION product.guard_locked_plan_component();

-- 1b. published version: status cannot revert; price/version frozen
CREATE OR REPLACE FUNCTION product.guard_locked_plan_version()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'published' THEN
    IF NEW.status <> 'published' THEN
      RAISE EXCEPTION 'plan_version % is published; status cannot revert to draft', OLD.id;
    END IF;
    IF NEW.price IS DISTINCT FROM OLD.price
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.plan_id IS DISTINCT FROM OLD.plan_id
       OR NEW.version_no IS DISTINCT FROM OLD.version_no THEN
      RAISE EXCEPTION 'plan_version % is published; price/currency/version frozen — open a new version', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plan_version_guard_lock ON product.plan_version;
CREATE TRIGGER trg_plan_version_guard_lock
  BEFORE UPDATE ON product.plan_version
  FOR EACH ROW EXECUTE FUNCTION product.guard_locked_plan_version();

-- 1c. orchestration-time: bundled_free priority < charged priority (§7.6 trigger 2)
CREATE OR REPLACE FUNCTION product.check_plan_component_priority()
RETURNS trigger AS $$
DECLARE min_charged int; max_bundled int;
BEGIN
  SELECT MIN(priority) INTO min_charged FROM product.plan_component
    WHERE plan_version_id = NEW.plan_version_id AND billing_kind = 'charged';
  SELECT MAX(priority) INTO max_bundled FROM product.plan_component
    WHERE plan_version_id = NEW.plan_version_id AND billing_kind = 'bundled_free';
  IF min_charged IS NOT NULL AND max_bundled IS NOT NULL AND max_bundled >= min_charged THEN
    RAISE EXCEPTION 'bundled_free priority(%) must be < charged priority(%), plan_version=%',
      max_bundled, min_charged, NEW.plan_version_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_plan_component_priority ON product.plan_component;
CREATE TRIGGER trg_plan_component_priority
  BEFORE INSERT OR UPDATE ON product.plan_component
  FOR EACH ROW EXECUTE FUNCTION product.check_plan_component_priority();

-- 1d. product tags / capability_keys GIN (§7.2 / §17)
CREATE INDEX IF NOT EXISTS idx_product_tags_gin ON product.product USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_product_cap_gin  ON product.product USING gin (capability_keys);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. commerce — append-only integrity (§8.4 usage, §9.8 ledger) + quota CHECK
-- ─────────────────────────────────────────────────────────────────────────────

-- Shared append-only guard: forbid UPDATE/DELETE (RAISE, not DO INSTEAD NOTHING —
-- a rule would silently swallow writes, §8.4 rank 17).
CREATE OR REPLACE FUNCTION commerce.forbid_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'append-only: % on commerce.% is forbidden', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usage_event_append_only ON commerce.tenant_usage_event;
CREATE TRIGGER trg_usage_event_append_only
  BEFORE UPDATE OR DELETE ON commerce.tenant_usage_event
  FOR EACH ROW EXECUTE FUNCTION commerce.forbid_mutation();

DROP TRIGGER IF EXISTS trg_usage_event_pool_append_only ON commerce.tenant_usage_event_pool;
CREATE TRIGGER trg_usage_event_pool_append_only
  BEFORE UPDATE OR DELETE ON commerce.tenant_usage_event_pool
  FOR EACH ROW EXECUTE FUNCTION commerce.forbid_mutation();

DROP TRIGGER IF EXISTS trg_transaction_append_only ON commerce.tenant_transaction;
CREATE TRIGGER trg_transaction_append_only
  BEFORE UPDATE OR DELETE ON commerce.tenant_transaction
  FOR EACH ROW EXECUTE FUNCTION commerce.forbid_mutation();

-- quota_pool.reset_period domain CHECK (§8.2)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'commerce.quota_pool'::regclass AND conname = 'quota_pool_reset_period_chk'
  ) THEN
    ALTER TABLE commerce.quota_pool
      ADD CONSTRAINT quota_pool_reset_period_chk CHECK (reset_period IN ('none','day','month'));
  END IF;
END $$;
