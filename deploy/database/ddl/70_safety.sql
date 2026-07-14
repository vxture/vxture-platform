-- ═══════════════════════════════════════════════════════════════════════════
-- 28_safety.sql — schema safety（内容审核：策略 / 记录，结构占位）
-- 设计权威：docs/design/data_safety_200_schema.md §1–§3
-- 起步阶段最小化：只建策略与日志表，不接真实审核执行逻辑（占位默认不启用）。
-- 跨 schema FK（moderation_policies.tenant_id → tenancy.tenants）不内联，见 90（铁律一）。
-- moderation_policies.created_by → 运营专属（边界#2），裸 UUID 不建 FK。
-- moderation_logs.request_id 为 §17 单一跨库关联键（边界#1），裸值不建 FK；
--   本表 append-only（禁 UPDATE + DELETE），触发器见 95_triggers.sql。
-- 表序 = 域内依赖序：moderation_policies → moderation_logs（无域内 FK 相互依赖）。
-- ═══════════════════════════════════════════════════════════════════════════

-- 审核策略。tenant_id NULL=平台默认策略；租户行覆盖默认（本次按铁律一建真 FK，nullable，见 90）。
-- is_active 占位阶段默认 false（不启用）。created_by 为运营 operator 裸 UUID（边界#2，不建 FK）。
-- 配置表：可写（rules/is_active 可更新），四件套仅 created_at/updated_at（非软删实体）。
CREATE TABLE safety.moderation_policies (
    id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid,                                              -- NULL=平台默认；跨 schema→tenancy.tenants（90，nullable 真 FK）
    rules       jsonb        NOT NULL DEFAULT '{}',                -- 审核规则配置
    is_active   boolean      NOT NULL DEFAULT false,               -- 占位阶段默认不启用
    created_by  uuid,                                             -- 运营专属 operator 裸值（边界#2，不建 FK）
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_moderation_policies_tenant_id ON safety.moderation_policies (tenant_id);
-- 每租户至多 1 条策略（NULL=平台默认单独一条）：部分唯一，保覆盖语义无歧义。
CREATE UNIQUE INDEX uq_moderation_policies_tenant ON safety.moderation_policies (tenant_id) WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX uq_moderation_policies_default ON safety.moderation_policies ((true)) WHERE tenant_id IS NULL;

-- 审核记录（append-only 审计）。request_id 串 reqlog ↔ commerce.usage_events ↔ 本表（边界#1，裸值不建 FK）。
-- result 默认 not_checked：区分"没查过" vs "查过通过"，勿混用；开放取值不加 CHECK（占位阶段业务陆续接）。
-- 行不可变：仅 created_at，无 updated_at/deleted_at；append-only 触发器见 95_triggers.sql。
CREATE TABLE safety.moderation_logs (
    id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id  varchar(128),                                     -- 跨库/跨域关联键（边界#1，不建 FK）
    direction   varchar(16)   NOT NULL,                           -- input / output
    result      varchar(32)   NOT NULL DEFAULT 'not_checked',     -- 默认 not_checked（区分未查/查过通过）
    detail      jsonb,
    created_at  timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT chk_moderation_logs_direction CHECK (direction IN ('input','output'))
);
CREATE INDEX idx_moderation_logs_request_id ON safety.moderation_logs (request_id);
CREATE INDEX idx_moderation_logs_created_at ON safety.moderation_logs (created_at);
