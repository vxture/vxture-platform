-- ═══════════════════════════════════════════════════════════════════════════
-- 90_partitions.sql — reqlog 分区子表预建（RANGE 按月）+ DEFAULT 兜底
-- apply 顺序：在分区父表建成之后（20_reqlog），在 95_triggers 之前
--   （PG11+：父表 append-only 行触发器自动传播至全部既有 + 未来子分区）。幂等（to_regclass 守卫）。
-- 分区父表：
--   reqlog.request_records  PARTITION BY RANGE (created_at)
--   reqlog.error_records    PARTITION BY RANGE (created_at)
-- 预建当前 + 未来 6 个月（起点 2026-07，共 7 个月）；DEFAULT 兜底防漏档丢写。
-- 上线后由维护 Job（pg_cron / 外部调度）滚动：建"下下月" + detach+drop 到期分区。
-- 样板同平台库 96_partitions.sql。
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  parts text[] := ARRAY['reqlog.request_records', 'reqlog.error_records'];
  qname text; sch text; tbl text; child text; mn date; nm date; i int;
BEGIN
  FOREACH qname IN ARRAY parts LOOP
    sch := split_part(qname, '.', 1);
    tbl := split_part(qname, '.', 2);
    -- 预建当前月 + 未来 6 个月（起点 2026-07；上线由维护 Job 领先滚动）
    FOR i IN 0..6 LOOP
      mn := (date '2026-07-01') + (i * interval '1 month');
      nm := mn + interval '1 month';
      child := tbl || '_y' || to_char(mn, 'YYYY') || 'm' || to_char(mn, 'MM');
      IF to_regclass(format('%I.%I', sch, child)) IS NULL THEN
        EXECUTE format(
          'CREATE TABLE %I.%I PARTITION OF %I.%I FOR VALUES FROM (%L) TO (%L)',
          sch, child, sch, tbl, mn, nm);
      END IF;
    END LOOP;
    -- DEFAULT 兜底分区（预建漏档时不丢写；巡检有行=告警重分配）
    child := tbl || '_default';
    IF to_regclass(format('%I.%I', sch, child)) IS NULL THEN
      EXECUTE format('CREATE TABLE %I.%I PARTITION OF %I.%I DEFAULT', sch, child, sch, tbl);
    END IF;
  END LOOP;
END $$;
