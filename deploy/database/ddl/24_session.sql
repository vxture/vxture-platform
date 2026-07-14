-- ═══════════════════════════════════════════════════════════════════════════
-- 30_session.sql — schema session（会话 / 令牌 / 验证码 / 登录风控，短命高频）
-- 设计权威：docs/design/data_identity_200_schema.md §8
-- refresh_tokens.session_id = Redis 会话 sid 的松引用（会话 Redis-primary，登录不写 auth_sessions，不建 FK）；
-- 全表对 account.users 用裸 UUID 不建 FK（边界#2 realm 安全隔离，铁律七）——见 90。
-- 表序 = 域内依赖序：auth_sessions → refresh_tokens → user_verifications
--   → password_reset_tokens → login_attempts。
-- append-only 审计表（login_attempts）不设 updated_at/deleted_at，行不可变（触发器见 triggers_ddl）。
-- ═══════════════════════════════════════════════════════════════════════════

-- 中心会话持久镜像（Redis 为主，此表为持久镜像）。realm 区分 customer/workforce，
-- 与 admin.operator_* 会话结构对称隔离，绝不交叉解引用。user_id 裸 UUID（边界#2）。
CREATE TABLE session.auth_sessions (
    id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    sid            varchar(64)   NOT NULL,                          -- 会话不透明标识
    user_id        uuid          NOT NULL,                          -- 裸值→account.users（不建 FK，边界#2）
    realm          varchar(16)   NOT NULL,                          -- customer / workforce（realm 硬隔离）
    auth_method    varchar(32)   NOT NULL,                          -- password / sms / oauth 等
    ip_address     varchar(64),
    user_agent     varchar(512),
    status         varchar(16)   NOT NULL DEFAULT 'active',
    last_active_at timestamptz   NOT NULL DEFAULT now(),
    expires_at     timestamptz   NOT NULL,
    revoked_at     timestamptz,
    created_at     timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT uq_auth_sessions_sid    UNIQUE (sid),
    CONSTRAINT chk_auth_sessions_realm  CHECK (realm IN ('customer','workforce')),
    CONSTRAINT chk_auth_sessions_status CHECK (status IN ('active','revoked','expired'))
);
CREATE INDEX idx_auth_sessions_user_id    ON session.auth_sessions (user_id);
CREATE INDEX idx_auth_sessions_realm      ON session.auth_sessions (realm);
CREATE INDEX idx_auth_sessions_status     ON session.auth_sessions (status);
CREATE INDEX idx_auth_sessions_expires_at ON session.auth_sessions (expires_at);

-- opaque refresh token：服务端存储、轮换、重放检测（§6.3）。token_hash 唯一；
-- rotated_from 串起轮换链。session_id = Redis 会话 sid 的松引用（会话 Redis-primary，OIDC 登录
--   不写 durable auth_sessions；2026-07-04 撤回评审时误加的 FK，集成验证发现登录热路径会 FK 违约）。
-- user_id 裸 UUID（边界#2，不建 FK）。
CREATE TABLE session.refresh_tokens (
    id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid         NOT NULL,                             -- 裸值→account.users（不建 FK，边界#2）
    session_id   uuid         NOT NULL,                             -- 松引用 Redis 会话 sid（Redis-primary，不建 FK）
    client_id    varchar(64)  NOT NULL,
    token_hash   varchar(64)  NOT NULL,
    rotated_from uuid,                                              -- 轮换链前驱（同表 id，弱引用不建 FK 自环）
    status       varchar(16)  NOT NULL DEFAULT 'active',
    expires_at   timestamptz  NOT NULL,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT uq_refresh_tokens_token_hash UNIQUE (token_hash),
    CONSTRAINT chk_refresh_tokens_status    CHECK (status IN ('active','rotated','revoked','expired'))
);
CREATE INDEX idx_refresh_tokens_user_id    ON session.refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_session_id ON session.refresh_tokens (session_id);
CREATE INDEX idx_refresh_tokens_status     ON session.refresh_tokens (status);
CREATE INDEX idx_refresh_tokens_expires_at ON session.refresh_tokens (expires_at);

-- 邮箱 / 手机验证码。行内 attempt_count / used_at 可增更（非严格不可变），故不加 append-only 触发器；
-- 无 updated_at/deleted_at（一次性令牌，过期即弃）。user_id 可空裸 UUID（注册前无账号）。
CREATE TABLE session.user_verifications (
    id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid,                                             -- 裸值→account.users（可空，不建 FK，边界#2）
    target_type   varchar(16)   NOT NULL,                           -- email / phone
    target        varchar(128)  NOT NULL,
    purpose       varchar(32)   NOT NULL,                           -- register / login / reset / bind 等（开放集）
    code_hash     varchar(64)   NOT NULL,
    attempt_count int           NOT NULL DEFAULT 0,
    expires_at    timestamptz   NOT NULL,
    used_at       timestamptz,
    created_at    timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT chk_user_verifications_target_type CHECK (target_type IN ('email','phone')),
    CONSTRAINT chk_user_verifications_attempt_count CHECK (attempt_count >= 0)
);
CREATE INDEX idx_user_verifications_user_id         ON session.user_verifications (user_id);
CREATE INDEX idx_user_verifications_target_expires  ON session.user_verifications (target, expires_at);

-- 密码重置令牌。used_at 可标记（非严格不可变），无 updated_at/deleted_at。user_id 裸 UUID。
CREATE TABLE session.password_reset_tokens (
    id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid         NOT NULL,                               -- 裸值→account.users（不建 FK，边界#2）
    token_hash varchar(64)  NOT NULL,
    expires_at timestamptz  NOT NULL,
    used_at    timestamptz,
    created_at timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT uq_password_reset_tokens_token_hash UNIQUE (token_hash)
);
CREATE INDEX idx_password_reset_tokens_user_id    ON session.password_reset_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON session.password_reset_tokens (expires_at);

-- 登录尝试记录，风控 / 限速。纯不可变审计流水（append-only，触发器见 triggers_ddl）。
-- 无 updated_at/deleted_at。user_id 可空裸 UUID（标识不存在的账号尝试）。
CREATE TABLE session.login_attempts (
    id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid,                                              -- 裸值→account.users（可空，不建 FK，边界#2）
    identifier   varchar(128)  NOT NULL,                            -- 尝试用的登录标识（account/email/phone）
    auth_method  varchar(32)   NOT NULL DEFAULT 'password',
    result       varchar(32)   NOT NULL,                            -- success / bad_credentials / locked 等（开放集）
    ip_address   varchar(64)   NOT NULL,
    country_code char(2),
    user_agent   varchar(512),
    created_at   timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_attempts_identifier_created ON session.login_attempts (identifier, created_at DESC);
CREATE INDEX idx_login_attempts_ip_created         ON session.login_attempts (ip_address, created_at DESC);
CREATE INDEX idx_login_attempts_user_id            ON session.login_attempts (user_id);
