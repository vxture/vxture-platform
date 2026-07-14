-- 为 VelaAuditLog 补充 cancelledAt 字段
-- 目的：区分"待确认（pending）"与"已取消（cancelled）"两种状态。
-- 历史数据：旧记录 cancelledAt 为 NULL，视为 pending（若 confirmed=false）或 confirmed（若 confirmed=true），行为不变。
--
-- 三态语义：
--   pending   : confirmed=false AND cancelledAt IS NULL
--   confirmed : confirmed=true
--   cancelled : cancelledAt IS NOT NULL

ALTER TABLE "VelaAuditLog"
  ADD COLUMN IF NOT EXISTS "cancelledAt" timestamp(3);
