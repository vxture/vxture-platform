-- ═══════════════════════════════════════════════════════════════════════════
-- 15_identity.sql — schema identity（联邦身份：外部如何识别你）
-- 设计权威：docs/design/data_identity_200_schema.md §2
-- 联邦绑定 + 上游 IdP 配置 + 握手态；人的主记录在 account.users（本 schema 非主体）。
-- 域内无跨表 FK；identities.user_id 跨 schema→account.users 见 90_cross_schema_fk.sql（铁律一）。
-- ═══════════════════════════════════════════════════════════════════════════

-- 联邦绑定（§2.1）：一个本地 user 可绑多个上游 IdP subject。不按 email 自动并号
-- （合并以手机为锚点，见 project_social_identity_consolidation）。
-- user_id 跨 schema→account.users（90，ON DELETE CASCADE，普通引用）。
CREATE TABLE identity.identities (
    id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid          NOT NULL,                    -- 跨 schema→account.users（90）
    provider          varchar(32)   NOT NULL,                    -- feishu/dingtalk/google/wechat
    provider_subject  varchar(255)  NOT NULL,
    metadata          jsonb,
    created_at        timestamptz   NOT NULL DEFAULT now(),
    updated_at        timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT uq_identities_provider_subject UNIQUE (provider, provider_subject),
    CONSTRAINT uq_identities_user_provider    UNIQUE (user_id, provider)
);
CREATE INDEX idx_identities_user_id  ON identity.identities (user_id);
CREATE INDEX idx_identities_provider ON identity.identities (provider);

-- 入站 broker（上游 IdP）配置（§2.2）。表驱动启用，无需改 env / 重部署。
-- code 为可视业务码（铁律二：永不做 FK 目标，oauth_states.provider_code 按值引用）。
-- field_mapping：上游 claim→本地 user_profiles 字段映射（对齐 Keycloak Identity Provider Mapper）。
CREATE TABLE identity.oauth_providers (
    id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    code              varchar(64)   NOT NULL,                    -- 可视码，非关联键
    name              varchar(64)   NOT NULL,
    name_key          varchar(128),                                 -- i18n 键（identity.provider.{code}）
    client_id         varchar(255),
    client_secret     varchar(255),
    scope             varchar(512),
    auth_url          varchar(512),
    token_url         varchar(512),
    account_info_url  varchar(512),
    redirect_uri      varchar(512),
    field_mapping     jsonb,                                     -- 上游 claim→user_profiles 字段映射
    is_enabled        boolean       NOT NULL DEFAULT true,
    is_customer_visible  boolean      NOT NULL DEFAULT true,   -- 展示可见性（客户端/customer realm）——独立轴，不派生自 status/is_active/is_public/is_enabled
    is_workforce_visible boolean      NOT NULL DEFAULT true,   -- 展示可见性（运营端/workforce realm）
    sort              int           NOT NULL DEFAULT 999,
    created_at        timestamptz   NOT NULL DEFAULT now(),
    updated_at        timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT uq_oauth_providers_code UNIQUE (code)
);
CREATE INDEX idx_oauth_providers_is_enabled ON identity.oauth_providers (is_enabled);
CREATE INDEX idx_oauth_providers_sort       ON identity.oauth_providers (sort);

-- OAuth/OIDC 握手态（§2.3，append-only）。授权重定向下发时 INSERT，回调校验时读；
-- state 全局唯一防重放，过期靠 expires_at + TTL 清理。无可变列故无 updated_at/deleted_at。
-- UPDATE 禁止（触发器，见 triggers_ddl）；DELETE 保留（单次消费失效 / 过期清理）。
-- provider_code 按值引用 oauth_providers.code（可视码，铁律二不做 FK 目标）。
CREATE TABLE identity.oauth_states (
    id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code  varchar(64)   NOT NULL,                       -- 可视码引用 oauth_providers.code，非 FK
    state          varchar(128)  NOT NULL,
    redirect_uri   varchar(512)  NOT NULL,
    code_verifier  varchar(128),                                 -- PKCE
    nonce          varchar(128),
    ip_address     varchar(64),
    expires_at     timestamptz   NOT NULL,
    created_at     timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT uq_oauth_states_state UNIQUE (state)
);
CREATE INDEX idx_oauth_states_provider_code ON identity.oauth_states (provider_code);
CREATE INDEX idx_oauth_states_expires_at    ON identity.oauth_states (expires_at);
