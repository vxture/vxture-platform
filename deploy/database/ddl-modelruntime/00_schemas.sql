-- ═══════════════════════════════════════════════════════════════════════════
-- 00_schemas.sql — Model Platform DB schema（独立物理库，apply 顺序第一）
-- 权威机制：手写 SQL DDL 单一权威（取代 prisma db push；见 data_platform_320）。
-- 独立库 vxturestudio_modelruntime_main（实例 vx-modelruntime-pg）：3 schema。
--   与平台库 vxturestudio_platform_main 物理隔离——本库对平台库零 FK（边界#1）；
--   跨库一致性靠单一 request_id + 应用层（不建任何跨库 FK）。
-- 设计权威：docs/design/data_model_200_schema.md §4（Model Platform DB）。
-- 幂等：CREATE SCHEMA IF NOT EXISTS。
-- ═══════════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS key;      -- provider 密钥（AES-256 密文，平台库永不接触明文）
CREATE SCHEMA IF NOT EXISTS reqlog;   -- 高频 AI 请求日志 / 错误明细（按月 RANGE 分区，append-only）
CREATE SCHEMA IF NOT EXISTS routing;  -- 连接 / 路由 / 降级配置
CREATE SCHEMA IF NOT EXISTS model;    -- 模型治理配置（provider/model/grant/price_rule/policy，Atlas 拆仓迁入，原平台库 model schema）

-- ── 全局可视码序列 ──────────────────────────────────────────────────────────
-- 无：本库无对外可视码需求（跨库关联键 request_id 由平台侧生成，裸值关联，边界#1）。
