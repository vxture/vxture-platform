-- ═══════════════════════════════════════════════════════════════════════════
-- 40_model.sql — schema model（模型治理配置，Model Platform DB，5 表）
-- 迁移来源：平台库 deploy/database/ddl/60_model.sql（Atlas 拆仓，product_240 决策1：
--   model.* 与 key/reqlog/routing 一起迁入独立物理库 vxturestudio_modelruntime_main）。
-- 设计权威：docs/design/data_model_200_schema.md §1（原表结构）+ Atlas 拆仓计划（物理库界#1）。
-- 与平台库物理隔离：model_grants.tenant_id / model_policies.tenant_id 原为跨 schema 真 FK
--   （→ tenancy.tenants，平台库 90_cross_schema_fk.sql），迁入独立库后**零跨库 FK**（边界#1），
--   降级为裸值引用，一致性靠调用方在 C2/C3 契约层校验（Atlas 不镜像 tenancy 模型）。
-- created_by/updated_by → admin.operator_accounts：跨库裸 UUID，本就不建 FK（边界#2，无变化）。
-- application_id/agent_id：agent_catalog 未落地，裸值不建 FK（承自原表，无变化）。
-- 表序 = 域内依赖序：model_providers → models → model_grants / model_price_rules / model_policies。
-- ═══════════════════════════════════════════════════════════════════════════

-- provider 注册表。provider_code 为可视码（永不做 FK 目标，铁律二）。
-- 本表及 config 不得存 provider API Key（明文/可逆引用）——密钥归本库 key schema。
CREATE TABLE model.model_providers (
    id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code varchar(64)   NOT NULL,                       -- 可视码 doubao/claude/private…
    provider_type varchar(32)   NOT NULL DEFAULT 'online',
    provider_name varchar(128)  NOT NULL,
    description   varchar(512),
    description_key varchar(128),                                   -- i18n 键（model.provider.{provider_code}.desc）
    logo_url      text,
    homepage_url  text,
    console_url   text,
    billing_url   text,
    is_active     boolean       NOT NULL DEFAULT true,
    is_customer_visible  boolean      NOT NULL DEFAULT true,   -- 展示可见性（客户端/customer realm）——独立轴，不派生自 status/is_active/is_public/is_enabled
    is_workforce_visible boolean      NOT NULL DEFAULT true,   -- 展示可见性（运营端/workforce realm）
    config        jsonb,                                        -- 非敏感连接元数据；密钥不入此处
    created_by    uuid,                                         -- 裸值→admin.operator_accounts（边界#2，不建 FK）
    updated_by    uuid,                                         -- 裸值→admin.operator_accounts（边界#2，不建 FK）
    created_at    timestamptz   NOT NULL DEFAULT now(),
    updated_at    timestamptz   NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    CONSTRAINT uq_model_providers_provider_code UNIQUE (provider_code),
    CONSTRAINT chk_model_providers_provider_type CHECK (provider_type IN ('online','self_hosted','private'))
);
CREATE INDEX idx_model_providers_is_active ON model.model_providers (is_active);
CREATE INDEX idx_model_providers_type      ON model.model_providers (provider_type);
CREATE INDEX idx_model_providers_deleted_at ON model.model_providers (deleted_at);

-- Vxture 模型注册表。model_code 为调用方唯一引用键（可视码，永不做 FK 目标）。
-- provider_id 为唯一权威 provider 引用：域内 FK→model_providers，provider 退役时置空（ON DELETE SET NULL）。
CREATE TABLE model.models (
    id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id       uuid          REFERENCES model.model_providers(id) ON DELETE SET NULL,  -- 域内 FK，可空
    model_code        varchar(128)  NOT NULL,                  -- 调用方唯一引用键（可视码）
    model_type        varchar(32)   NOT NULL DEFAULT 'chat',   -- chat/embedding/rerank…（开放集，不加 CHECK）
    protocol          varchar(64)   NOT NULL,                  -- openai/anthropic…（adapter 选择）
    model_name        varchar(128)  NOT NULL,
    description       varchar(512),
    description_key   varchar(128),                                 -- i18n 键（model.model.{model_code}.desc）
    endpoint_url      text          NOT NULL,                  -- 权威二选一待决 vs routing.provider_configs
    context_window    int,
    max_output_tokens int,
    capabilities      text[]        NOT NULL DEFAULT '{}',     -- vision/tools/json_mode…
    supports_streaming boolean      NOT NULL DEFAULT true,
    is_active         boolean       NOT NULL DEFAULT true,
    is_customer_visible  boolean      NOT NULL DEFAULT true,   -- 展示可见性（客户端/customer realm）——独立轴，不派生自 status/is_active/is_public/is_enabled
    is_workforce_visible boolean      NOT NULL DEFAULT true,   -- 展示可见性（运营端/workforce realm）
    sort              int           NOT NULL DEFAULT 999,
    config            jsonb,                                   -- 非敏感运行时配置
    created_by        uuid,                                    -- 裸值→admin.operator_accounts（边界#2）
    updated_by        uuid,                                    -- 裸值→admin.operator_accounts（边界#2）
    created_at        timestamptz   NOT NULL DEFAULT now(),
    updated_at        timestamptz   NOT NULL DEFAULT now(),
    deleted_at        timestamptz,
    CONSTRAINT uq_models_model_code UNIQUE (model_code)
);
CREATE INDEX idx_models_is_active   ON model.models (is_active);
CREATE INDEX idx_models_model_type  ON model.models (model_type);
CREATE INDEX idx_models_provider_id ON model.models (provider_id);
CREATE INDEX idx_models_deleted_at  ON model.models (deleted_at);

-- 租户→模型技术授权/灰度白名单（授权上界，非配额、非计费）。
-- model_id 域内 FK→models（CASCADE，随模型删除）；tenant_id **不再是跨 schema FK**（物理库分离后
--   Atlas 与 tenancy 零跨库 FK，边界#1）——裸 UUID，来自 C2/C3 契约层下发的 workspace/tenant 引用键，
--   一致性由 Atlas 应用层在 grant 写入时对照 provisioning webhook payload 校验，不建 DB 约束。
-- application_id/agent_id：agent_catalog 未落地，裸值不建 FK（agent_id 退役过渡列，切走后 drop）。
CREATE TABLE model.model_grants (
    id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id         uuid          NOT NULL REFERENCES model.models(id) ON DELETE CASCADE,  -- 域内 FK
    tenant_id        uuid          NOT NULL,                  -- 跨库裸值，应用层校验（边界#1，无 FK）
    application_id   uuid,                                    -- 裸值，agent_catalog 落地前暂裸
    application_type varchar(32),
    agent_id         uuid,                                    -- 【退役过渡】= application_id WHERE type='agent'
    priority         int           NOT NULL DEFAULT 100,
    is_active        boolean       NOT NULL DEFAULT true,
    reason           varchar(512),
    expires_at       timestamptz,
    created_by       uuid,                                    -- 裸值→admin.operator_accounts（边界#2）
    updated_by       uuid,                                    -- 裸值→admin.operator_accounts（边界#2）
    created_at       timestamptz   NOT NULL DEFAULT now(),
    updated_at       timestamptz   NOT NULL DEFAULT now(),
    deleted_at       timestamptz,
    CONSTRAINT chk_model_grants_application_type
        CHECK (application_type IN ('agent','workflow','api_client','internal_service'))
);
CREATE INDEX idx_model_grants_model            ON model.model_grants (model_id);
CREATE INDEX idx_model_grants_tenant           ON model.model_grants (tenant_id);
CREATE INDEX idx_model_grants_application      ON model.model_grants (application_id);
CREATE INDEX idx_model_grants_application_type ON model.model_grants (application_type);
CREATE INDEX idx_model_grants_agent            ON model.model_grants (agent_id);
CREATE INDEX idx_model_grants_is_active        ON model.model_grants (is_active);

-- provider 成本费率（Vxture 付上游的钱，毛利/结算；非客户标价，客户费在平台 product.plan_prices）。
-- 版本化靠 effective_at/expires_at 叠加，append 新规则；无软删（无 deleted_at）。
-- 单价 numeric(18,8) 为显式成本费率例外（per-token 极小）。
-- model_id 域内 FK→models（CASCADE）。
CREATE TABLE model.model_price_rules (
    id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id           uuid          NOT NULL REFERENCES model.models(id) ON DELETE CASCADE,  -- 域内 FK
    billing_mode       varchar(32)   NOT NULL DEFAULT 'token',  -- 决定计量 metric
    currency           varchar(16)   NOT NULL DEFAULT 'CNY',
    unit_tokens        int           NOT NULL DEFAULT 1000000,  -- 单价对应 token 基数（每百万）
    input_unit_price   numeric(18,8) NOT NULL DEFAULT 0,        -- 成本费率例外 18,8
    output_unit_price  numeric(18,8) NOT NULL DEFAULT 0,
    request_unit_price numeric(18,8) NOT NULL DEFAULT 0,
    is_active          boolean       NOT NULL DEFAULT true,
    effective_at       timestamptz   NOT NULL DEFAULT now(),
    expires_at         timestamptz,                            -- 新费率起给旧行置 expires_at
    created_by         uuid,                                   -- 裸值→admin.operator_accounts（边界#2）
    updated_by         uuid,                                   -- 裸值→admin.operator_accounts（边界#2）
    created_at         timestamptz   NOT NULL DEFAULT now(),
    updated_at         timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT chk_model_price_rules_billing_mode CHECK (billing_mode IN ('token','request'))
);
CREATE INDEX idx_model_price_rules_model     ON model.model_price_rules (model_id);
CREATE INDEX idx_model_price_rules_effective ON model.model_price_rules (effective_at);
CREATE INDEX idx_model_price_rules_is_active ON model.model_price_rules (is_active);

-- 访问速率门（限流+并发+上下文）。限流 ≠ 配额：技术速率门（护上游 QPS），与平台配额正交。
-- tenant_id NULL=平台默认策略；跨库裸值（边界#1，无 FK，同 model_grants.tenant_id）。
-- model_id 域内 FK→models（CASCADE）。UNIQUE(model_id, tenant_id)（NULL 视为相异，平台默认单行由应用层保证）。
-- 版本化靠 effective_at/expires_at；无软删（无 deleted_at）。tpm/tpd 为 BIGINT（token 量级）。
CREATE TABLE model.model_policies (
    id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id           uuid          NOT NULL REFERENCES model.models(id) ON DELETE CASCADE,  -- 域内 FK
    tenant_id          uuid,                                   -- 跨库裸值（边界#1，无 FK）；NULL=平台默认
    name               varchar(128),
    priority           int           NOT NULL DEFAULT 100,
    max_concurrent     int,
    rate_limit_rpm     int,                                    -- requests/min
    rate_limit_tpm     bigint,                                 -- tokens/min（BIGINT）
    rate_limit_tpd     bigint,                                 -- tokens/day（BIGINT）
    max_context_tokens int,
    is_active          boolean       NOT NULL DEFAULT true,
    effective_at       timestamptz   NOT NULL DEFAULT now(),
    expires_at         timestamptz,
    created_by         uuid,                                   -- 裸值→admin.operator_accounts（边界#2）
    updated_by         uuid,                                   -- 裸值→admin.operator_accounts（边界#2）
    created_at         timestamptz   NOT NULL DEFAULT now(),
    updated_at         timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT uq_model_policies_model_tenant UNIQUE (model_id, tenant_id)
);
CREATE INDEX idx_model_policies_model     ON model.model_policies (model_id);
CREATE INDEX idx_model_policies_tenant    ON model.model_policies (tenant_id);
CREATE INDEX idx_model_policies_is_active ON model.model_policies (is_active);
