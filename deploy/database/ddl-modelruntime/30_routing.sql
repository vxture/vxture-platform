-- ═══════════════════════════════════════════════════════════════════════════
-- 30_routing.sql — schema routing（连接 / 路由 / 降级配置）
-- 设计权威：docs/design/data_model_200_schema.md §4.3
-- 跨库：provider_code / model_code / fallback_model_codes 均为对平台库 model.* 可视码的
--   逻辑引用，裸值不建 FK（边界#1，跨物理库）。
-- endpoint_url 权威二选一待决（本 provider_configs vs 平台库 model.models.endpoint_url，§6）。
-- 可变配置实体：四元组 created_at/updated_at/deleted_at（软删；停用另走 is_active）。
-- ═══════════════════════════════════════════════════════════════════════════

-- provider 连接配置（endpoint / 超时 / 重试策略）。provider_code 跨库逻辑引用（无 FK）。
CREATE TABLE routing.provider_configs (
    id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code varchar(64)   NOT NULL,                        -- 跨库逻辑引用 model.model_providers.provider_code（无 FK）
    endpoint_url  text          NOT NULL,
    timeout_ms    int,
    retry_policy  jsonb,                                         -- 重试 / 退避策略（非敏感）
    is_active     boolean       NOT NULL DEFAULT true,
    created_at    timestamptz   NOT NULL DEFAULT now(),
    updated_at    timestamptz   NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    CONSTRAINT uq_provider_configs_provider_code UNIQUE (provider_code)
);
CREATE INDEX idx_provider_configs_is_active  ON routing.provider_configs (is_active);
CREATE INDEX idx_provider_configs_deleted_at ON routing.provider_configs (deleted_at);

-- 模型→provider 加权路由（多路）。model_code + provider_code 跨库逻辑引用（无 FK）。
CREATE TABLE routing.model_routes (
    id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    model_code    varchar(128)  NOT NULL,                        -- 跨库逻辑引用 model.models.model_code（无 FK）
    provider_code varchar(64)   NOT NULL,                        -- 跨库逻辑引用 model.model_providers.provider_code（无 FK）
    weight        int           NOT NULL DEFAULT 100,            -- 加权路由权重
    is_active     boolean       NOT NULL DEFAULT true,
    created_at    timestamptz   NOT NULL DEFAULT now(),
    updated_at    timestamptz   NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    CONSTRAINT uq_model_routes_model_provider UNIQUE (model_code, provider_code)
);
CREATE INDEX idx_model_routes_model_code ON routing.model_routes (model_code);
CREATE INDEX idx_model_routes_is_active  ON routing.model_routes (is_active);
CREATE INDEX idx_model_routes_deleted_at ON routing.model_routes (deleted_at);

-- 降级规则（主模型不可用时按序回退）。model_code / fallback_model_codes 跨库逻辑引用（无 FK）。
CREATE TABLE routing.fallback_rules (
    id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    model_code           varchar(128)  NOT NULL,                 -- 跨库逻辑引用 model.models.model_code（无 FK）
    fallback_model_codes text[]        NOT NULL DEFAULT '{}',    -- 有序回退模型码列表（跨库裸值）
    condition            varchar(64),                            -- 触发条件（timeout/error/rate_limit…，开放集，不加 CHECK）
    is_active            boolean       NOT NULL DEFAULT true,
    created_at           timestamptz   NOT NULL DEFAULT now(),
    updated_at           timestamptz   NOT NULL DEFAULT now(),
    deleted_at           timestamptz,
    CONSTRAINT uq_fallback_rules_model_code UNIQUE (model_code)
);
CREATE INDEX idx_fallback_rules_model_code ON routing.fallback_rules (model_code);
CREATE INDEX idx_fallback_rules_is_active  ON routing.fallback_rules (is_active);
CREATE INDEX idx_fallback_rules_deleted_at ON routing.fallback_rules (deleted_at);
