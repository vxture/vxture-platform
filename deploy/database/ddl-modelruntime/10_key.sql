-- ═══════════════════════════════════════════════════════════════════════════
-- 10_key.sql — schema key（provider 密钥，平台库永不接触明文）
-- 设计权威：docs/design/data_model_200_schema.md §4.1
-- 铁律：本库永不落 provider API Key 明文——只存 AES-256 密文（encrypted_key bytea），
--   内存解密，绝不出库明文。信封加密（envelope）建模：
--     · encrypted_key      = nonce||ciphertext||auth-tag 打包的 AES-256-GCM 密文 blob；
--     · encryption_key_id  = 包裹该密文的主密钥(KMS/DEK)版本引用（key-ref，本身非密钥），
--                            供主密钥轮换而不必重读明文。二者共同满足"密文 + key-ref"。
-- 跨库：provider_code 为对平台库 model.model_providers.provider_code 的逻辑引用，
--   裸值不建 FK（边界#1，跨物理库）。
-- 域内 FK（key_rotation_logs.provider_api_key_id → provider_api_keys）内联（同库真 FK）。
-- rotated_by → 平台库 admin.operator_accounts：跨库/跨 realm 裸 UUID 不建 FK（边界#1/#2）。
-- ═══════════════════════════════════════════════════════════════════════════

-- provider API 密钥（多 key 轮换 / 区分）。encrypted_key 只存 AES-256 密文，绝不出库明文。
-- 可变实体（is_active 可翻、轮换 UPDATE 密文）；设计不设软删（无 deleted_at），停用走 is_active。
CREATE TABLE key.provider_api_keys (
    id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_code     varchar(64)   NOT NULL,                     -- 跨库逻辑引用 model.model_providers.provider_code（无 FK，边界#1）
    key_alias         varchar(128)  NOT NULL,                     -- 多 key 轮换 / 区分
    encrypted_key     bytea         NOT NULL,                     -- AES-256 密文（nonce||ciphertext||tag），内存解密，绝不出库明文
    encryption_key_id varchar(128)  NOT NULL,                     -- key-ref：包裹密文的主密钥(KMS/DEK)版本（非密钥本身），供信封轮换
    key_scope         varchar(32)   NOT NULL DEFAULT 'shared',    -- shared / dedicated
    is_active         boolean       NOT NULL DEFAULT true,
    last_rotated_at   timestamptz,
    created_at        timestamptz   NOT NULL DEFAULT now(),
    updated_at        timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT uq_provider_api_keys_code_alias UNIQUE (provider_code, key_alias),
    CONSTRAINT chk_provider_api_keys_key_scope CHECK (key_scope IN ('shared','dedicated'))
);
CREATE INDEX idx_provider_api_keys_provider_code ON key.provider_api_keys (provider_code);
CREATE INDEX idx_provider_api_keys_is_active     ON key.provider_api_keys (is_active);

-- 密钥轮换审计（append-only）。provider_api_key_id 域内 FK→provider_api_keys（同库真 FK）。
-- rotated_by 裸值→平台库 admin.operator_accounts（跨库/跨 realm，不建 FK）。
-- 不可变审计流水：append-only 守卫见 95_triggers.sql（仅封 UPDATE，保留 ON DELETE CASCADE 供父 key purge）。
CREATE TABLE key.key_rotation_logs (
    id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_api_key_id uuid          NOT NULL REFERENCES key.provider_api_keys(id) ON DELETE CASCADE,  -- 域内 FK
    rotated_by          uuid,                                     -- 裸值→admin.operator_accounts（边界#1/#2，不建 FK）
    reason              varchar(512),
    rotated_at          timestamptz   NOT NULL DEFAULT now()      -- 事件时点（append-only，单一时间戳，无 created_at 冗余）
);
CREATE INDEX idx_key_rotation_logs_key ON key.key_rotation_logs (provider_api_key_id, rotated_at);
