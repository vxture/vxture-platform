-- ═══════════════════════════════════════════════════════════════════════════
-- 95_triggers.sql — Model Platform DB append-only 守卫触发器
-- apply 顺序：在域表 + 分区子表建成之后（90_partitions 之后；PG11+：分区父表挂
--   FOR EACH ROW 行触发器自动传播至全部既有 + 未来子分区）。
--   幂等（CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS）。
-- 一律 RAISE 硬失败，禁用 DO INSTEAD NOTHING RULE（静默吞写）。样板同平台库 95_triggers.sql。
-- 设计权威：docs/design/data_model_200_schema.md §4.1 / §4.2。
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══ reqlog ═══
-- 高频 AI 请求 / 错误日志：写定即不可变（禁 UPDATE + DELETE）。清理靠 DROP PARTITION（非逐行 DELETE，
-- 故 DELETE forbid 不阻碍留存清理）。分区父表挂行触发器 → 传播全部子分区（PG11+）。
CREATE OR REPLACE FUNCTION reqlog.forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'append-only: % on reqlog.% is forbidden', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_request_records_append_only ON reqlog.request_records;
CREATE TRIGGER trg_request_records_append_only
  BEFORE UPDATE OR DELETE ON reqlog.request_records
  FOR EACH ROW EXECUTE FUNCTION reqlog.forbid_mutation();

DROP TRIGGER IF EXISTS trg_error_records_append_only ON reqlog.error_records;
CREATE TRIGGER trg_error_records_append_only
  BEFORE UPDATE OR DELETE ON reqlog.error_records
  FOR EACH ROW EXECUTE FUNCTION reqlog.forbid_mutation();

-- ═══ key ═══
-- key_rotation_logs：密钥轮换审计，写定即不可变——仅封 UPDATE，保留 DELETE 供父 key
--   hard-delete 时 ON DELETE CASCADE purge（样板同平台库 support.ticket_comments）。
CREATE OR REPLACE FUNCTION key.forbid_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'append-only: % on key.% is forbidden', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_key_rotation_logs_append_only ON key.key_rotation_logs;
CREATE TRIGGER trg_key_rotation_logs_append_only
  BEFORE UPDATE ON key.key_rotation_logs
  FOR EACH ROW EXECUTE FUNCTION key.forbid_update();
