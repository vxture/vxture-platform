-- seed.sql — 平台初始数据种子
-- 幂等（ON CONFLICT DO NOTHING），重复执行安全。
--
-- 用法（在 VXTURE_DEPLOY_HOST 上执行）：
--   docker exec -i vx-platform-pg psql -U postgres -d platform_main < seed.sql
--
-- 本地开发：
--   docker exec -i <local-pg-container> psql -U postgres -d vxturestudio_platform_main < seed.sql

BEGIN;

-- ── ops.role ──────────────────────────────────────────────────────────────────

INSERT INTO ops.role
  (id, role_code, status, name_en, name_i18n_key, description, is_system, sort)
VALUES
  ('00000000-0000-4000-a000-000000000001',
   'sys_config', 'active', 'System Config', 'ops.role.sys_config',
   'Platform self-governance config meta-role, used as createdBy for system-init data.',
   true, 0),
  ('00000000-0000-4000-a000-000000000002',
   'super_admin', 'active', 'Super Admin', 'ops.role.super_admin',
   'Platform built-in super admin with all permissions.',
   true, 1)
ON CONFLICT (role_code) DO NOTHING;

-- ── ops.admin ─────────────────────────────────────────────────────────────────
-- system    : status='system'，登录查询过滤 status='active'，永不可登录
-- superadmin: status='active'，密码 Admin@2026（bcrypt cost=10）

INSERT INTO ops.admin
  (id, role_id, username, display_name, status, password_hash, is_system, remark, sort, created_at, updated_at)
VALUES
  ('00000000-0000-4000-a000-000000000010',
   (SELECT id FROM ops.role WHERE role_code = 'sys_config'),
   'system', 'system', 'system',
   '$2b$10$xuVJddVLjlmjlUD9pB3qY.X1Qf6026KrQCGjccgKaqBiNG6kwfAze',
   true,
   'Platform meta account. Auto-initializes base and demo data. Never logs in via UI.',
   0, now(), now()),
  ('00000000-0000-4000-a000-000000000011',
   (SELECT id FROM ops.role WHERE role_code = 'super_admin'),
   'superadmin', 'super admin', 'active',
   '$2b$10$IUFSFUnNvbXZCrmCiSrRq.i.li3n2QkOXoZv.w8VHLPHsbIPtX3Bu',
   true,
   'Built-in super admin. Has all platform permissions.',
   1, now(), now())
ON CONFLICT (username) DO NOTHING;

-- ── identity.account — zhangsan ──────────────────────────────────────────────

INSERT INTO identity.account
  (id, username, email, status, account_source, created_at, updated_at)
VALUES
  ('00000000-0000-4000-a000-000000000100',
   'zhangsan', 'zhangsan@vxture.dev', 'active', 'web', now(), now())
ON CONFLICT (username) DO NOTHING;

-- identity.account_credential（密码 Zhangsan@2026，bcrypt cost=10）

INSERT INTO identity.account_credential
  (account_id, password_hash, created_at, updated_at)
VALUES
  ('00000000-0000-4000-a000-000000000100',
   '$2b$10$EOqOXAIHLEoODVvDWmhnHepwmIvF86svjsNn6yJy2A6thtbqB6Isu',
   now(), now())
ON CONFLICT (account_id) DO NOTHING;

-- identity.account_profile

INSERT INTO identity.account_profile
  (account_id, display_name, language, timezone, created_at, updated_at)
VALUES
  ('00000000-0000-4000-a000-000000000100',
   'Zhang San', 'zh-CN', 'Asia/Shanghai', now(), now())
ON CONFLICT (account_id) DO NOTHING;

-- ── tenant.tenant — zhangsan ─────────────────────────────────────────────────

INSERT INTO tenant.tenant
  (id, tenant_code, tenant_type, tenant_name, display_name, status,
   region, language, time_zone, owner_account_id,
   is_trial, created_by, created_at, updated_at)
VALUES
  ('00000000-0000-4000-a000-000000000200',
   'zhangsan', 'individual', 'Zhang San', 'Zhang San', 'active',
   'cn-hangzhou', 'zh-CN', 'Asia/Shanghai',
   '00000000-0000-4000-a000-000000000100',
   false, '00000000-0000-4000-a000-000000000100', now(), now())
ON CONFLICT (tenant_code) DO NOTHING;

-- tenant.tenant_member（owner 绑定）

INSERT INTO tenant.tenant_member
  (id, tenant_id, account_id, role, status,
   joined_source, is_primary_owner, joined_at, created_by, created_at, updated_at)
VALUES
  ('00000000-0000-4000-a000-000000000300',
   (SELECT id FROM tenant.tenant WHERE tenant_code = 'zhangsan' AND deleted_at IS NULL),
   '00000000-0000-4000-a000-000000000100',
   'owner', 'active', 'created', true, now(),
   '00000000-0000-4000-a000-000000000100', now(), now())
ON CONFLICT (tenant_id, account_id) DO NOTHING;

COMMIT;

-- 验证
SELECT 'ops.role'    AS tbl, count(*) FROM ops.role    WHERE role_code IN ('sys_config','super_admin')
UNION ALL
SELECT 'ops.admin',            count(*) FROM ops.admin    WHERE username  IN ('system','superadmin')
UNION ALL
SELECT 'identity.account',     count(*) FROM identity.account WHERE username = 'zhangsan'
UNION ALL
SELECT 'tenant.tenant',        count(*) FROM tenant.tenant    WHERE tenant_code = 'zhangsan'
UNION ALL
SELECT 'tenant.tenant_member', count(*) FROM tenant.tenant_member WHERE account_id = '00000000-0000-4000-a000-000000000100';
