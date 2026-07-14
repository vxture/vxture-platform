-- =============================================================================
-- Vxture DB Seed — MVP 最小化种子数据
-- 作用：在已完成 schema 建表后插入 MVP 运行必需的基础数据
-- 执行方式：psql -U <user> -d vxture_beta -f db-seed.sql
-- 幂等保证：所有 INSERT 均使用 ON CONFLICT DO NOTHING
--
-- 现有数据（截至 2026-05-03，运行前已存在，勿覆盖）：
--   product.plan: starter / growth / enterprise（created_by = 00000000-...-0000）
--   account.account: 65 条测试账号
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. 系统 UUID 惯例（全零 = 系统/平台操作人占位，与现有 plan.created_by 对齐）
--    00000000-0000-0000-0000-000000000000  系统操作人
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 1. 系统操作人账号（用于 created_by FK 引用）
--    注意：account.account 无 id 的 ON CONFLICT 约束，用 username 唯一键防重
-- -----------------------------------------------------------------------------

INSERT INTO account.account (
  id,
  username,
  email,
  password_hash,
  status,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '__system__',
  'system@vxture.internal',
  NULL,   -- 禁止密码登录
  false,  -- 禁用状态，不可登录
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. 产品套餐 — product.plan
--    starter / growth / enterprise 已于 2026-04-21 前写入，下方为补充套餐
--    （使用 ON CONFLICT (plan_code) DO NOTHING 避免重复插入）
-- -----------------------------------------------------------------------------

-- 体验版（免费试用，供新注册租户默认订阅使用）
INSERT INTO product.plan (
  id,
  plan_code,
  plan_name,
  description,
  plan_type,
  level,
  is_free,
  is_public,
  status,
  created_by,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000010',
  'trial',
  '体验版',
  '14 天免费试用，含核心 Agent 功能与有限 API 配额，到期后需升级。',
  'normal',
  0,
  true,
  true,
  true,
  '00000000-0000-0000-0000-000000000000',
  now(),
  now()
) ON CONFLICT (plan_code) DO NOTHING;

-- =============================================================================
-- 核查语句（可单独执行）
-- SELECT id, plan_code, plan_name, is_free, level FROM product.plan ORDER BY level;
-- SELECT id, username, status FROM account.account WHERE username = '__system__';
-- =============================================================================
