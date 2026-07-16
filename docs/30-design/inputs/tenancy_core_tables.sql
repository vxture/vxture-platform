-- ============================================================
-- Vxture · tenancy 核心表设计 (tenant / workspace 及外挂表)
-- 原则:
--   1. tenant 主表 = 热路径, 只留每次请求都会碰的字段
--   2. 档案(profiles) / 认证(organization) / 品牌(branding) /
--      联系人(contacts) 冷数据外挂, 1:1 或 1:N
--   3. 自述性资料(profiles, 随时可改) 与 认证性资料(organization,
--      改动需重新审核) 严格分离
--   4. 受控枚举一律 varchar + 注释约定, 由应用层校验取值
--
-- 标识符命名约定 (三层, 互不侵占命名空间):
--   id          uuid    内部唯一锚点; 所有外键引用它; 不外泄, 不可修改
--   {table}_no  bigint  对外展示号; 唯一, 不可修改; 可出现在 URL/工单/发票
--   {parent}_id uuid    外键列, 永远指向 {parent}.id
--   不可修改性由文末的列级权限 (GRANT UPDATE 列清单) 在 DB 层锁死
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS tenancy.tenant_no_seq    START 100001;
CREATE SEQUENCE IF NOT EXISTS tenancy.workspace_no_seq START 100001;

-- ------------------------------------------------------------
-- 1. tenants  (核心实体, 保持精瘦)
-- ------------------------------------------------------------
CREATE TABLE tenancy.tenants (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_no           bigint      NOT NULL DEFAULT nextval('tenancy.tenant_no_seq'),
    name                varchar(128) NOT NULL,                    -- 显示名 (法定名称在 profiles.legal_name)
    slug                varchar(64),                              -- URL 标识, 如 app.vxture.com/t/{slug}
    type                varchar(16) NOT NULL DEFAULT 'personal',  -- personal | company
    owner_user_id       uuid        NOT NULL,                     -- FK -> identity.users(id), 主 Owner
    status              varchar(32) NOT NULL DEFAULT 'active',    -- active | suspended | closed

    -- 认证状态快照 (真值在 tenant_organization, 此处冗余供热路径判断)
    verification_status varchar(32) NOT NULL DEFAULT 'unverified',-- unverified | pending | verified | rejected
    verification_type   varchar(32),                              -- organization | personal | NULL

    -- 权限缓存版本号: 角色/赋权变更时 +1, 用于 JWT claims 失效判断
    permissions_version integer     NOT NULL DEFAULT 0,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);

ALTER TABLE tenancy.tenants
    ADD CONSTRAINT tenants_owner_user_id_fkey
        FOREIGN KEY (owner_user_id) REFERENCES identity.users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT;

CREATE UNIQUE INDEX tenants_tenant_no_key ON tenancy.tenants (tenant_no);
CREATE UNIQUE INDEX tenants_slug_key      ON tenancy.tenants (slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_owner_user_id    ON tenancy.tenants (owner_user_id);
CREATE INDEX idx_tenants_status           ON tenancy.tenants (status);

-- ------------------------------------------------------------
-- 2. tenant_profiles  (自述性档案, 1:1, 租户 admin 随时可改)
-- ------------------------------------------------------------
CREATE TABLE tenancy.tenant_profiles (
    tenant_id           uuid        PRIMARY KEY
                        REFERENCES tenancy.tenants(id) ON DELETE CASCADE,

    -- 自述身份
    legal_name          varchar(256),                 -- 法定名称 (与显示名 tenant.name 分离)
    description         varchar(1024),
    industry            varchar(64),                  -- 受控码表值, 勿放自由文本
    sub_industry        varchar(64),
    scale               varchar(32),                  -- 员工数区间: 1-10 | 11-50 | 51-200 | 201-1000 | 1000+
    company_type        varchar(32),                  -- company | individual | nonprofit | government
    founded_year        smallint,
    website             varchar(512),

    -- 对外支持信息 (发票页 / 客服入口 / 邮件模板使用)
    support_email       varchar(128),
    support_phone       varchar(32),
    support_url         varchar(512),

    -- 地址 (国际化拆行格式)
    country_code        char(2),                      -- ISO 3166-1 alpha-2
    state_province      varchar(128),
    city                varchar(128),
    address_line1       varchar(256),
    address_line2       varchar(256),
    postal_code         varchar(32),

    -- 本地化默认值 (成员个人未设置时的回退值)
    timezone            varchar(64)  NOT NULL DEFAULT 'Asia/Shanghai',
    language            varchar(16)  NOT NULL DEFAULT 'zh-CN',
    currency            char(3)      NOT NULL DEFAULT 'CNY',      -- ISO 4217
    date_format         varchar(16)  NOT NULL DEFAULT 'YYYY-MM-DD',
    time_format         varchar(8)   NOT NULL DEFAULT '24h',      -- 12h | 24h
    first_day_of_week   smallint     NOT NULL DEFAULT 1,          -- 1=周一 ... 7=周日
    fiscal_year_start_month smallint NOT NULL DEFAULT 1,          -- 1~12

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CHECK (first_day_of_week BETWEEN 1 AND 7),
    CHECK (fiscal_year_start_month BETWEEN 1 AND 12)
);

-- ------------------------------------------------------------
-- 3. tenant_organization  (认证性资料, 真值源; 变更需重新审核)
--    审核通过后回写 tenant.verification_status 快照
-- ------------------------------------------------------------
CREATE TABLE tenancy.tenant_organization (
    id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   uuid        NOT NULL
                                REFERENCES tenancy.tenants(id) ON DELETE CASCADE,

    -- 工商主体信息
    company_name                varchar(256) NOT NULL,            -- 营业执照上的名称
    unified_social_credit_code  varchar(64),                      -- 统一社会信用代码
    business_license_url        varchar(512),                     -- 执照文件 (对象存储 key/URL)
    legal_rep_name              varchar(128),                     -- 法定代表人

    -- 注册地址 (中国行政区划格式)
    province                    varchar(128),
    city                        varchar(128),
    district                    varchar(128),
    address                     varchar(512),

    -- 认证联系人 (提交认证时填写, 与日常联系人 tenant_contacts 分离)
    contact_name                varchar(128),
    contact_phone               varchar(64),
    contact_email               varchar(128),

    -- 审核流转
    verified_status             varchar(32) NOT NULL DEFAULT 'unverified',
                                -- unverified | pending | verified | rejected
    submitted_at                timestamptz,
    verified_at                 timestamptz,
    verified_by                 uuid,                             -- ops 侧审核人
    reject_reason               varchar(512),

    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),
    deleted_at                  timestamptz
);

-- 一个租户同一时刻只有一份生效认证记录 (历史记录靠软删保留)
CREATE UNIQUE INDEX tenant_organization_tenant_key
    ON tenancy.tenant_organization (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenant_organization_verified_status
    ON tenancy.tenant_organization (verified_status);

-- ------------------------------------------------------------
-- 4. tenant_contacts  (日常联系人, 1:N, 多类型)
-- ------------------------------------------------------------
CREATE TABLE tenancy.tenant_contacts (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid        NOT NULL
                    REFERENCES tenancy.tenants(id) ON DELETE CASCADE,
    contact_type    varchar(16) NOT NULL,             -- primary | billing | technical | security | legal
    name            varchar(128) NOT NULL,
    title           varchar(128),                     -- 职务
    email           varchar(128) NOT NULL,
    phone           varchar(32),
    user_id         uuid                              -- 可选: 联系人是平台用户时关联
                    REFERENCES identity.users(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    UNIQUE (tenant_id, contact_type, email)
);

CREATE INDEX idx_tenant_contacts_tenant_type
    ON tenancy.tenant_contacts (tenant_id, contact_type);

-- ------------------------------------------------------------
-- 5. tenant_branding  (品牌资产当前生效指针, 1:1)
--    如需文件元数据/历史版本, 后续增设 tenant_brand_assets 明细表
-- ------------------------------------------------------------
CREATE TABLE tenancy.tenant_branding (
    tenant_id           uuid        PRIMARY KEY
                        REFERENCES tenancy.tenants(id) ON DELETE CASCADE,
    logo_url            varchar(512),     -- 横版全标, 浅色背景
    logo_dark_url       varchar(512),     -- 深色模式变体
    icon_url            varchar(512),     -- 方形, 侧边栏/头像位
    favicon_url         varchar(512),
    email_logo_url      varchar(512),     -- 邮件模板专用 (邮件客户端不支持深色切换)
    brand_color         char(7),          -- 主品牌色 '#RRGGBB'
    brand_color_dark    char(7),
    updated_by          uuid,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CHECK (brand_color      IS NULL OR brand_color      ~ '^#[0-9A-Fa-f]{6}$'),
    CHECK (brand_color_dark IS NULL OR brand_color_dark ~ '^#[0-9A-Fa-f]{6}$')
);

-- ------------------------------------------------------------
-- 6. workspaces  (字段直接内联, 不拆 profile 表)
-- ------------------------------------------------------------
CREATE TABLE tenancy.workspaces (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_no    bigint      NOT NULL DEFAULT nextval('tenancy.workspace_no_seq'),
    tenant_id       uuid        NOT NULL
                    REFERENCES tenancy.tenants(id) ON DELETE CASCADE,
    name            varchar(128) NOT NULL,
    slug            varchar(64),                      -- 租户内 URL 标识
    is_default      boolean     NOT NULL DEFAULT false,
    description     varchar(512),
    icon            varchar(64),                      -- emoji 或资产引用
    color           char(7),                          -- 侧边栏标识色
    visibility      varchar(16) NOT NULL DEFAULT 'open',   -- open | private
    timezone        varchar(64),                      -- NULL = 继承 tenant_profiles.timezone
    status          varchar(32) NOT NULL DEFAULT 'active', -- active | archived
    sort_order      integer     NOT NULL DEFAULT 0,
    created_by      uuid,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz,

    CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE UNIQUE INDEX workspaces_workspace_no_key
    ON tenancy.workspaces (workspace_no);
CREATE UNIQUE INDEX workspaces_tenant_slug_key
    ON tenancy.workspaces (tenant_id, slug) WHERE deleted_at IS NULL;
-- 每个租户有且仅有一个默认 workspace
CREATE UNIQUE INDEX workspaces_tenant_default_key
    ON tenancy.workspaces (tenant_id) WHERE is_default AND deleted_at IS NULL;
CREATE INDEX idx_workspaces_tenant_id ON tenancy.workspaces (tenant_id);
CREATE INDEX idx_workspaces_status    ON tenancy.workspaces (status);

-- ------------------------------------------------------------
-- 7. 不可修改性: 列级权限锁定 (服务账号物理上无法 UPDATE 锚点列)
--    id / *_no / created_at 不在 UPDATE 列清单内
-- ------------------------------------------------------------
REVOKE UPDATE ON tenancy.tenants FROM identity_svc;
GRANT UPDATE (name, slug, type, owner_user_id, status,
              verification_status, verification_type,
              permissions_version, updated_at, deleted_at)
    ON tenancy.tenants TO identity_svc;

REVOKE UPDATE ON tenancy.workspaces FROM identity_svc;
GRANT UPDATE (name, slug, is_default, description, icon, color,
              visibility, timezone, status, sort_order,
              updated_at, deleted_at)
    ON tenancy.workspaces TO identity_svc;

-- 外挂表以 tenant_id 为主键/锚点, 同样排除在 UPDATE 之外
REVOKE UPDATE ON tenancy.tenant_profiles FROM identity_svc;
GRANT UPDATE (legal_name, description, industry, sub_industry, scale,
              company_type, founded_year, website,
              support_email, support_phone, support_url,
              country_code, state_province, city,
              address_line1, address_line2, postal_code,
              timezone, language, currency, date_format, time_format,
              first_day_of_week, fiscal_year_start_month, updated_at)
    ON tenancy.tenant_profiles TO identity_svc;

REVOKE UPDATE ON tenancy.tenant_organization FROM identity_svc;
GRANT UPDATE (company_name, unified_social_credit_code,
              business_license_url, legal_rep_name,
              province, city, district, address,
              contact_name, contact_phone, contact_email,
              verified_status, submitted_at, verified_at, verified_by,
              reject_reason, updated_at, deleted_at)
    ON tenancy.tenant_organization TO identity_svc;

REVOKE UPDATE ON tenancy.tenant_contacts FROM identity_svc;
GRANT UPDATE (contact_type, name, title, email, phone, user_id, updated_at)
    ON tenancy.tenant_contacts TO identity_svc;

REVOKE UPDATE ON tenancy.tenant_branding FROM identity_svc;
GRANT UPDATE (logo_url, logo_dark_url, icon_url, favicon_url,
              email_logo_url, brand_color, brand_color_dark,
              updated_by, updated_at)
    ON tenancy.tenant_branding TO identity_svc;
