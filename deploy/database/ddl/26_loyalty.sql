-- ═══════════════════════════════════════════════════════════════════════════
-- 40_loyalty.sql — schema loyalty（成长：积分 / 等级 / 任务 / 标签）
-- 设计权威：docs/design/data_identity_200_schema.md §9
-- realm 硬隔离：全部专属 customer；与 admin/operator 无 FK、无字段泄漏；与计费不建 FK。
-- 域内 FK 内联（level_thresholds→level_policies）；跨 schema FK（loyalty.*→account.users）
--   一律不内联，见 90_cross_schema_fk.sql（铁律一）。
-- 表序 = 域内依赖序：level_policies→level_thresholds；user_points→point_ledgers→
--   task_progresses→user_tags（后者仅跨 schema 引 account.users，无域内序约束）。
-- ═══════════════════════════════════════════════════════════════════════════

-- 等级政策（配置表，自然键 level_no 为 PK）。等级→建组织数上限；base_discount_percent
-- 为预留·卡券联动折扣（L4=95 表 95 折），与 commerce promotion 叠加规则取优，校验在应用层。
-- SoT：account.users.level_no 为反规范化只读列，权威在此表。
CREATE TABLE loyalty.level_policies (
    level_no              int           PRIMARY KEY,
    max_owned_org_tenant  int           NOT NULL,                    -- 等级→可建组织数上限
    base_discount_percent numeric(5,2),                             -- 预留·卡券联动（如 95=95 折）
    level_name            varchar(64)   NOT NULL DEFAULT '',        -- 平台定义等级名（外显）
    level_name_key        varchar(128),                             -- i18n 键（loyalty.level.{level_no}）
    description           varchar(128),
    description_key       varchar(128),                             -- i18n 键（loyalty.level.{level_no}.desc）
    is_customer_visible  boolean      NOT NULL DEFAULT true,   -- 展示可见性（客户端/customer realm）——独立轴，不派生自 status/is_active/is_public/is_enabled
    is_workforce_visible boolean      NOT NULL DEFAULT true,   -- 展示可见性（运营端/workforce realm）
    CONSTRAINT chk_level_policies_level_no             CHECK (level_no >= 1),
    CONSTRAINT chk_level_policies_max_owned_org_tenant CHECK (max_owned_org_tenant >= 0)
);

-- 等级阈值（配置表，自然键 level_no 为 PK）。min_points 唯一→保积分↔等级单调可比。
-- level_no 域内 FK→level_policies（内联）。
CREATE TABLE loyalty.level_thresholds (
    level_no    int     PRIMARY KEY REFERENCES loyalty.level_policies(level_no),
    min_points  bigint  NOT NULL,
    CONSTRAINT uq_level_thresholds_min_points UNIQUE (min_points)
);

-- 当前积分余额（user 1:1，user_id 自然键 PK）。单行汇总避免每次 SUM 流水。
-- user_id 跨 schema→account.users（见 90，ON DELETE CASCADE）。设计 §9.3 仅 updated_at。
CREATE TABLE loyalty.user_points (
    user_id       uuid    PRIMARY KEY,                              -- 跨 schema→account.users（90，CASCADE）
    total_points  bigint  NOT NULL DEFAULT 0,
    updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 完整积分流水。points_delta 允许负数（消耗）；balance_after 记录写后余额。
-- source_type 开放标签不加 CHECK（§9.4）。设计 §9.4 明确：非 append-only，余额一致性由
-- 应用层同事务维护（可写，允许更正）；故仅 created_at，无 updated_at/deleted_at，亦不设 append-only 触发器。
-- user_id 跨 schema→account.users（见 90）。
CREATE TABLE loyalty.point_ledgers (
    id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid          NOT NULL,                          -- 跨 schema→account.users（90）
    source_type    varchar(64)   NOT NULL,                          -- 开放标签，不加 CHECK
    source_ref_id  varchar(128),
    points_delta   bigint        NOT NULL,                          -- 允许负数（消耗）
    balance_after  bigint        NOT NULL,
    remark         varchar(512),
    created_at     timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX idx_point_ledgers_user        ON loyalty.point_ledgers (user_id, created_at);
CREATE INDEX idx_point_ledgers_source_type ON loyalty.point_ledgers (source_type);

-- 任务/成就多步累计当前状态（连续签到 / 任务完成度）。每 (user, progress_type) 单行。
-- progress_type 开放标签。reset_at 记录周期性任务上次重置时刻。
-- user_id 跨 schema→account.users（见 90）。
CREATE TABLE loyalty.task_progresses (
    id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid         NOT NULL,                          -- 跨 schema→account.users（90）
    progress_type   varchar(64)  NOT NULL,                          -- 开放标签
    current_value   bigint       NOT NULL DEFAULT 0,
    target_value    bigint,
    last_updated_at timestamptz  NOT NULL DEFAULT now(),
    reset_at        timestamptz,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT uq_task_progresses_user_type UNIQUE (user_id, progress_type)
);
CREATE INDEX idx_task_progresses_user ON loyalty.task_progresses (user_id);

-- 用户分群标签（铁律四完整覆盖）。source=manual/auto。每 (user, tag) 单行。
-- user_id 跨 schema→account.users（见 90，ON DELETE CASCADE）。
CREATE TABLE loyalty.user_tags (
    id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid         NOT NULL,                              -- 跨 schema→account.users（90，CASCADE）
    tag         varchar(64)  NOT NULL,
    source      varchar(32)  NOT NULL DEFAULT 'manual',
    created_at  timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_tags_user_tag UNIQUE (user_id, tag),
    CONSTRAINT chk_user_tags_source  CHECK (source IN ('manual','auto'))
);
CREATE INDEX idx_user_tags_user ON loyalty.user_tags (user_id);
CREATE INDEX idx_user_tags_tag  ON loyalty.user_tags (tag);
