-- model_platform_seed.sql — AI 模型注册表初始数据种子
-- 幂等（ON CONFLICT DO NOTHING），重复执行安全。
--
-- 依赖：seed.sql 必须先执行（需要 model schema、commerce schema、zhangsan 租户）
--
-- 用法（在 VXTURE_DEPLOY_HOST 上执行）：
--   docker exec -i vx-platform-pg psql -U postgres -d platform_main \
--     < packages/core/database/prisma/model_platform_seed.sql

BEGIN;

-- ── model.provider — 豆包（字节跳动 ARK 平台）──────────────────────────────────

INSERT INTO model.provider
  (id, provider_code, provider_type, provider_name, description,
   homepage_url, console_url, billing_url,
   is_active, created_by, created_at, updated_at)
VALUES
  ('00000000-0000-4001-b000-000000000001',
   'doubao', 'online', '豆包 (ByteDance ARK)',
   'ByteDance ARK platform — OpenAI-compatible chat models.',
   'https://www.volcengine.com/product/doubao',
   'https://console.volcengine.com/ark',
   'https://console.volcengine.com/ark/region:ark+cn-beijing/billing',
   true,
   '00000000-0000-4000-a000-000000000010',
   now(), now())
ON CONFLICT (provider_code) DO NOTHING;

-- ── model.model — 豆包模型列表 ───────────────────────────────────────────────

INSERT INTO model.model
  (id, provider_id, model_code, provider, model_type, protocol,
   model_name, description, endpoint_url,
   context_window, max_output_tokens, capabilities, supports_streaming,
   is_active, sort, config,
   created_by, created_at, updated_at)
VALUES
  ('00000000-0000-4001-b000-000000000010',
   '00000000-0000-4001-b000-000000000001',
   'doubao-pro-32k',
   'doubao', 'chat', 'openai-compatible',
   '豆包 Pro 32K', '字节跳动 ARK 平台 Pro 级对话模型，32K 上下文。',
   'https://ark.cn-beijing.volces.com/api/v3',
   32768, 4096,
   ARRAY['chat', 'tool_call'],
   true, true, 10,
   '{"apiKeyEnvVar": "DOUBAO_API_KEY"}',
   '00000000-0000-4000-a000-000000000010', now(), now()),

  ('00000000-0000-4001-b000-000000000011',
   '00000000-0000-4001-b000-000000000001',
   'doubao-lite-32k',
   'doubao', 'chat', 'openai-compatible',
   '豆包 Lite 32K', '字节跳动 ARK 平台 Lite 级对话模型，低延迟高并发。',
   'https://ark.cn-beijing.volces.com/api/v3',
   32768, 4096,
   ARRAY['chat'],
   true, true, 20,
   '{"apiKeyEnvVar": "DOUBAO_API_KEY"}',
   '00000000-0000-4000-a000-000000000010', now(), now()),

  ('00000000-0000-4001-b000-000000000012',
   '00000000-0000-4001-b000-000000000001',
   'doubao-pro-128k',
   'doubao', 'chat', 'openai-compatible',
   '豆包 Pro 128K', '字节跳动 ARK 平台 Pro 级长上下文模型，128K 上下文。',
   'https://ark.cn-beijing.volces.com/api/v3',
   131072, 4096,
   ARRAY['chat', 'tool_call'],
   true, true, 30,
   '{"apiKeyEnvVar": "DOUBAO_API_KEY"}',
   '00000000-0000-4000-a000-000000000010', now(), now())
ON CONFLICT (model_code) DO NOTHING;

-- ── model.model_grant — 授权 zhangsan 租户使用全部豆包模型 ────────────────────

INSERT INTO model.model_grant
  (id, model_id, tenant_id, agent_id, application_id, application_type,
   priority, reason, is_active,
   created_by, created_at, updated_at)
VALUES
  ('00000000-0000-4001-b000-000000000020',
   '00000000-0000-4001-b000-000000000010',
   '00000000-0000-4000-a000-000000000200',
   NULL,
   NULL,
   NULL,
   100, 'Seed: dev tenant default grant for doubao-pro-32k.',
   true,
   '00000000-0000-4000-a000-000000000010', now(), now()),

  ('00000000-0000-4001-b000-000000000021',
   '00000000-0000-4001-b000-000000000011',
   '00000000-0000-4000-a000-000000000200',
   NULL,
   NULL,
   NULL,
   100, 'Seed: dev tenant default grant for doubao-lite-32k.',
   true,
   '00000000-0000-4000-a000-000000000010', now(), now()),

  ('00000000-0000-4001-b000-000000000022',
   '00000000-0000-4001-b000-000000000012',
   '00000000-0000-4000-a000-000000000200',
   NULL,
   NULL,
   NULL,
   100, 'Seed: dev tenant default grant for doubao-pro-128k.',
   true,
   '00000000-0000-4000-a000-000000000010', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── commerce.tenant_subscription_quota — zhangsan 租户无限额配额（开发种子）───

INSERT INTO commerce.tenant_subscription_quota
  (id, tenant_id, subscription_id,
   max_users, max_api_keys, max_workflows, max_concurrent,
   rate_limit_per_minute, period_tokens,
   quota_cycle, allowed_models, allow_custom_model,
   created_by, effective_at, created_at, updated_at)
VALUES
  ('00000000-0000-4001-b000-000000000030',
   '00000000-0000-4000-a000-000000000200',
   NULL,
   100, 20, 100, 20,
   120, -1,
   'monthly', '{}', true,
   '00000000-0000-4000-a000-000000000010',
   '2025-01-01 00:00:00+00',
   now(), now())
ON CONFLICT (tenant_id) DO NOTHING;

COMMIT;

-- 验证
SELECT 'model.provider'                       AS tbl, count(*) FROM model.provider WHERE provider_code = 'doubao'
UNION ALL
SELECT 'model.model (doubao)',                         count(*) FROM model.model WHERE provider = 'doubao' AND deleted_at IS NULL
UNION ALL
SELECT 'model.model_grant (zhangsan)',                 count(*) FROM model.model_grant WHERE tenant_id = '00000000-0000-4000-a000-000000000200' AND deleted_at IS NULL
UNION ALL
SELECT 'commerce.tenant_subscription_quota',          count(*) FROM commerce.tenant_subscription_quota WHERE tenant_id = '00000000-0000-4000-a000-000000000200';
