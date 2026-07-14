/*
 Navicat Premium Dump SQL

 Source Server         : mylocalhost-pg-develop
 Source Server Type    : PostgreSQL
 Source Server Version : 180003 (180003)
 Source Host           : localhost:5432
 Source Catalog        : vxture_beta
 Source Schema         : tenancy

 Target Server Type    : PostgreSQL
 Target Server Version : 180003 (180003)
 File Encoding         : 65001

 Date: 21/04/2026 17:26:44
*/


-- ----------------------------
-- Table structure for tenant
-- ----------------------------
DROP TABLE IF EXISTS "tenancy"."tenant";
CREATE TABLE "tenancy"."tenant" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_code" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "tenant_name" varchar(128) COLLATE "pg_catalog"."default" NOT NULL,
  "display_name" varchar(128) COLLATE "pg_catalog"."default",
  "tenant_type" varchar(32) COLLATE "pg_catalog"."default" NOT NULL,
  "status" varchar(32) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'active'::character varying,
  "created_by" uuid,
  "approved_at" timestamptz(6),
  "approved_by" uuid,
  "logo_url" varchar(512) COLLATE "pg_catalog"."default",
  "description" varchar(1024) COLLATE "pg_catalog"."default",
  "language" varchar(16) COLLATE "pg_catalog"."default" DEFAULT 'zh-CN'::character varying,
  "time_zone" varchar(64) COLLATE "pg_catalog"."default" DEFAULT 'Asia/Shanghai'::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "deleted_at" timestamptz(6),
  "status_reason" varchar(512) COLLATE "pg_catalog"."default",
  "status_at" timestamptz(6)
)
;
COMMENT ON COLUMN "tenancy"."tenant"."tenant_code" IS 'URL 友好唯一标识，创建后不可修改，如 acme-corp';
COMMENT ON COLUMN "tenancy"."tenant"."tenant_type" IS 'company=企业客户 | individual=个人开发者';
COMMENT ON COLUMN "tenancy"."tenant"."status" IS 'trial=试用 | active=正常 | suspended=暂停 | cancelled=注销';
COMMENT ON COLUMN "tenancy"."tenant"."created_by" IS '创建人，NULL 表示租户自助注册';
COMMENT ON COLUMN "tenancy"."tenant"."status_reason" IS '当前状态的原因说明，适用于所有状态变更（暂停/注销等）';
COMMENT ON COLUMN "tenancy"."tenant"."status_at" IS '当前状态的生效时间';
COMMENT ON TABLE "tenancy"."tenant" IS '租户主体，SaaS 核心锚点，所有业务数据通过 tenant_id 挂载';

-- ----------------------------
-- Table structure for tenant_config
-- ----------------------------
DROP TABLE IF EXISTS "tenancy"."tenant_config";
CREATE TABLE "tenancy"."tenant_config" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "config_key" varchar(128) COLLATE "pg_catalog"."default" NOT NULL,
  "config_value" text COLLATE "pg_catalog"."default",
  "is_encrypted" bool DEFAULT false,
  "description" varchar(512) COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "deleted_at" timestamptz(6),
  "config_group" varchar(100) COLLATE "pg_catalog"."default",
  "is_sensitive" bool NOT NULL DEFAULT false,
  "is_readonly" bool NOT NULL DEFAULT false,
  "created_by" uuid NOT NULL,
  "updated_by" uuid,
  "value_type" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'string'::character varying
)
;
COMMENT ON COLUMN "tenancy"."tenant_config"."config_key" IS '配置键，格式 {group}.{key}，如 auth.session_ttl_hours';
COMMENT ON COLUMN "tenancy"."tenant_config"."is_encrypted" IS '存储控制：true 则值在数据库中加密存储，读取时需解密，与 is_sensitive 独立';
COMMENT ON COLUMN "tenancy"."tenant_config"."config_group" IS '配置分组，如 auth | billing | feature | notification';
COMMENT ON COLUMN "tenancy"."tenant_config"."is_sensitive" IS '展示控制：true 则 API 响应时脱敏显示（如 ****），不影响存储';
COMMENT ON COLUMN "tenancy"."tenant_config"."is_readonly" IS 'true 则禁止通过管理后台修改，只能通过 migration 变更';
COMMENT ON COLUMN "tenancy"."tenant_config"."value_type" IS '配置值类型：string、number、boolean、json';

-- ----------------------------
-- Table structure for tenant_domain
-- ----------------------------
DROP TABLE IF EXISTS "tenancy"."tenant_domain";
CREATE TABLE "tenancy"."tenant_domain" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "domain" varchar(256) COLLATE "pg_catalog"."default" NOT NULL,
  "domain_type" varchar(32) COLLATE "pg_catalog"."default" NOT NULL,
  "is_primary" bool NOT NULL DEFAULT false,
  "ssl_status" varchar(32) COLLATE "pg_catalog"."default" DEFAULT 'none'::character varying,
  "verification_status" varchar(32) COLLATE "pg_catalog"."default" DEFAULT 'pending'::character varying,
  "verification_token" varchar(128) COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "deleted_at" timestamptz(6),
  "verified_at" timestamptz(6),
  "token_expires_at" timestamptz(6)
)
;
COMMENT ON COLUMN "tenancy"."tenant_domain"."verification_token" IS 'DNS TXT 验证 token，配合 token_expires_at 使用';
COMMENT ON COLUMN "tenancy"."tenant_domain"."verified_at" IS '域名验证通过时间，verification_status=verified 时写入';
COMMENT ON COLUMN "tenancy"."tenant_domain"."token_expires_at" IS '验证 token 过期时间，过期后需重新生成，防止 token 长期有效';

-- ----------------------------
-- Table structure for tenant_member
-- ----------------------------
DROP TABLE IF EXISTS "tenancy"."tenant_member";
CREATE TABLE "tenancy"."tenant_member" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "role" varchar(32) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'member'::character varying,
  "is_primary_owner" bool NOT NULL DEFAULT false,
  "status" varchar(32) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'active'::character varying,
  "nickname" varchar(128) COLLATE "pg_catalog"."default",
  "remark" varchar(512) COLLATE "pg_catalog"."default",
  "joined_source" varchar(64) COLLATE "pg_catalog"."default" DEFAULT 'created'::character varying,
  "joined_at" timestamptz(6) NOT NULL DEFAULT now(),
  "last_active_at" timestamptz(6),
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "deleted_at" timestamptz(6),
  "role_id" uuid
)
;
COMMENT ON COLUMN "tenancy"."tenant_member"."account_id" IS '全局账号 ID，关联 account.account(id)';
COMMENT ON COLUMN "tenancy"."tenant_member"."role" IS '[DEPRECATED] varchar 角色标识，已由 role_id 替代，数据迁移完成后删除';
COMMENT ON COLUMN "tenancy"."tenant_member"."is_primary_owner" IS '是否为主所有者，Owner 转让时同步变更，优先级高于 role_id';
COMMENT ON COLUMN "tenancy"."tenant_member"."joined_source" IS 'created=创建时加入 | invited=邀请 | sso=单点登录 | api=API 创建';
COMMENT ON COLUMN "tenancy"."tenant_member"."role_id" IS '关联 tenant_role.id，正式角色体系，逐步替代 role varchar 字段';

-- ----------------------------
-- Table structure for tenant_organization
-- ----------------------------
DROP TABLE IF EXISTS "tenancy"."tenant_organization";
CREATE TABLE "tenancy"."tenant_organization" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "company_name" varchar(256) COLLATE "pg_catalog"."default" NOT NULL,
  "unified_social_credit_code" varchar(64) COLLATE "pg_catalog"."default",
  "business_license_url" varchar(512) COLLATE "pg_catalog"."default",
  "industry" varchar(128) COLLATE "pg_catalog"."default",
  "scale" varchar(64) COLLATE "pg_catalog"."default",
  "contact_name" varchar(128) COLLATE "pg_catalog"."default",
  "contact_phone" varchar(64) COLLATE "pg_catalog"."default",
  "contact_email" varchar(128) COLLATE "pg_catalog"."default",
  "province" varchar(128) COLLATE "pg_catalog"."default",
  "city" varchar(128) COLLATE "pg_catalog"."default",
  "district" varchar(128) COLLATE "pg_catalog"."default",
  "address" varchar(512) COLLATE "pg_catalog"."default",
  "verified_status" varchar(32) COLLATE "pg_catalog"."default" DEFAULT 'unverified'::character varying,
  "verified_at" timestamptz(6),
  "verified_by" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "deleted_at" timestamptz(6),
  "rejected_reason" varchar(512) COLLATE "pg_catalog"."default",
  "country_code" char(2) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'CN'::bpchar,
  "postal_code" varchar(16) COLLATE "pg_catalog"."default"
)
;
COMMENT ON COLUMN "tenancy"."tenant_organization"."unified_social_credit_code" IS '统一社会信用代码（18位），企业认证核心字段';
COMMENT ON COLUMN "tenancy"."tenant_organization"."business_license_url" IS '营业执照图片 URL，用于人工审核';
COMMENT ON COLUMN "tenancy"."tenant_organization"."verified_status" IS 'unverified=未认证 | pending=审核中 | verified=已认证 | rejected=已拒绝';
COMMENT ON COLUMN "tenancy"."tenant_organization"."verified_at" IS '认证通过时间';
COMMENT ON COLUMN "tenancy"."tenant_organization"."verified_by" IS '审核人，关联 platform.platform_admin(id)';
COMMENT ON COLUMN "tenancy"."tenant_organization"."rejected_reason" IS '认证拒绝原因，verified_status=rejected 时由运营填写';
COMMENT ON COLUMN "tenancy"."tenant_organization"."country_code" IS '国家/地区代码，ISO 3166-1 alpha-2，默认 CN';
COMMENT ON COLUMN "tenancy"."tenant_organization"."postal_code" IS '邮政编码，开具增值税发票必填';

-- ----------------------------
-- Table structure for tenant_ownership_transfer
-- ----------------------------
DROP TABLE IF EXISTS "tenancy"."tenant_ownership_transfer";
CREATE TABLE "tenancy"."tenant_ownership_transfer" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "from_account_id" uuid NOT NULL,
  "to_account_id" uuid NOT NULL,
  "operator_id" uuid NOT NULL,
  "transfer_reason" varchar(512) COLLATE "pg_catalog"."default",
  "remark" text COLLATE "pg_catalog"."default",
  "transfer_status" varchar(32) COLLATE "pg_catalog"."default" DEFAULT 'success'::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
)
;
COMMENT ON COLUMN "tenancy"."tenant_ownership_transfer"."from_account_id" IS '转出方账号 ID';
COMMENT ON COLUMN "tenancy"."tenant_ownership_transfer"."to_account_id" IS '转入方账号 ID';
COMMENT ON COLUMN "tenancy"."tenant_ownership_transfer"."operator_id" IS '操作人账号 ID（平台管理员或原 Owner 本人）';
COMMENT ON COLUMN "tenancy"."tenant_ownership_transfer"."transfer_reason" IS '转移原因';
COMMENT ON COLUMN "tenancy"."tenant_ownership_transfer"."transfer_status" IS 'success=成功 | failed=失败 | cancelled=已取消';
COMMENT ON TABLE "tenancy"."tenant_ownership_transfer" IS '租户所有权转移记录，只追加不修改';

-- ----------------------------
-- Table structure for tenant_permission
-- ----------------------------
DROP TABLE IF EXISTS "tenancy"."tenant_permission";
CREATE TABLE "tenancy"."tenant_permission" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "permission_code" varchar(128) COLLATE "pg_catalog"."default" NOT NULL,
  "permission_name" varchar(128) COLLATE "pg_catalog"."default" NOT NULL,
  "parent_code" varchar(128) COLLATE "pg_catalog"."default",
  "permission_type" varchar(32) COLLATE "pg_catalog"."default" DEFAULT 'function'::character varying,
  "description" varchar(512) COLLATE "pg_catalog"."default",
  "status" bool NOT NULL DEFAULT true,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "deleted_at" timestamptz(6),
  "tenant_id" uuid,
  "permission_scope" varchar(16) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'platform'::character varying,
  "sort" int4 NOT NULL DEFAULT 999
)
;
COMMENT ON COLUMN "tenancy"."tenant_permission"."permission_code" IS '权限唯一标识，如 tenant:member:invite';
COMMENT ON COLUMN "tenancy"."tenant_permission"."parent_code" IS '父权限 code，用于构建权限树';
COMMENT ON COLUMN "tenancy"."tenant_permission"."permission_type" IS 'MENU=菜单 | BUTTON=按钮 | API=接口 | DATA=数据权限';
COMMENT ON COLUMN "tenancy"."tenant_permission"."tenant_id" IS '租户 ID：permission_scope=tenant 时必填，platform 时为 NULL';
COMMENT ON COLUMN "tenancy"."tenant_permission"."permission_scope" IS 'platform=平台预置权限（全租户共享） | tenant=租户自定义权限';
COMMENT ON COLUMN "tenancy"."tenant_permission"."sort" IS '排序权重，值越小越靠前，用于前端菜单渲染顺序';

-- ----------------------------
-- Table structure for tenant_role
-- ----------------------------
DROP TABLE IF EXISTS "tenancy"."tenant_role";
CREATE TABLE "tenancy"."tenant_role" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "role_code" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "role_name" varchar(128) COLLATE "pg_catalog"."default" NOT NULL,
  "description" varchar(512) COLLATE "pg_catalog"."default",
  "is_system" bool NOT NULL DEFAULT false,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "deleted_at" timestamptz(6),
  "status" varchar(16) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'active'::character varying,
  "sort" int4 NOT NULL DEFAULT 999
)
;
COMMENT ON COLUMN "tenancy"."tenant_role"."role_code" IS '角色唯一标识，如 owner | admin | member';
COMMENT ON COLUMN "tenancy"."tenant_role"."is_system" IS 'true=系统内置角色，不可删除；false=租户自定义角色';
COMMENT ON COLUMN "tenancy"."tenant_role"."status" IS 'active=启用 | disabled=禁用';
COMMENT ON COLUMN "tenancy"."tenant_role"."sort" IS '排序权重，系统内置角色建议设 1-10，自定义角色默认 999';

-- ----------------------------
-- Table structure for tenant_role_permission
-- ----------------------------
DROP TABLE IF EXISTS "tenancy"."tenant_role_permission";
CREATE TABLE "tenancy"."tenant_role_permission" (
  "tenant_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "created_by" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
)
;
COMMENT ON COLUMN "tenancy"."tenant_role_permission"."tenant_id" IS '冗余租户 ID，便于按租户范围查询，避免 JOIN tenant_role';
COMMENT ON COLUMN "tenancy"."tenant_role_permission"."created_by" IS '授权操作人';
COMMENT ON TABLE "tenancy"."tenant_role_permission" IS '角色权限关联表，硬删除，不做软删除';

-- ----------------------------
-- Function structure for set_updated_at
-- ----------------------------
DROP FUNCTION IF EXISTS "tenancy"."set_updated_at"();
CREATE FUNCTION "tenancy"."set_updated_at"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  COST 100;

-- ----------------------------
-- Indexes structure for table tenant
-- ----------------------------
CREATE INDEX "idx_tenants_created_by" ON "tenancy"."tenant" USING btree (
  "created_by" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tenants_deleted_at" ON "tenancy"."tenant" USING btree (
  "deleted_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tenants_status" ON "tenancy"."tenant" USING btree (
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tenants_tenant_name" ON "tenancy"."tenant" USING btree (
  "tenant_name" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tenants_tenant_type" ON "tenancy"."tenant" USING btree (
  "tenant_type" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table tenant
-- ----------------------------
CREATE TRIGGER "trg_tenant_updated" BEFORE UPDATE ON "tenancy"."tenant"
FOR EACH ROW
EXECUTE PROCEDURE "tenancy"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table tenant
-- ----------------------------
ALTER TABLE "tenancy"."tenant" ADD CONSTRAINT "tenants_tenant_code_key" UNIQUE ("tenant_code");

-- ----------------------------
-- Checks structure for table tenant
-- ----------------------------
ALTER TABLE "tenancy"."tenant" ADD CONSTRAINT "chk_tenant_status" CHECK (status::text = ANY (ARRAY['trial'::character varying::text, 'active'::character varying::text, 'suspended'::character varying::text, 'cancelled'::character varying::text]));
ALTER TABLE "tenancy"."tenant" ADD CONSTRAINT "chk_tenant_type" CHECK (tenant_type::text = ANY (ARRAY['company'::character varying::text, 'individual'::character varying::text]));

-- ----------------------------
-- Primary Key structure for table tenant
-- ----------------------------
ALTER TABLE "tenancy"."tenant" ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table tenant_config
-- ----------------------------
CREATE INDEX "idx_tc_config_key" ON "tenancy"."tenant_config" USING btree (
  "config_key" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tc_deleted_at" ON "tenancy"."tenant_config" USING btree (
  "deleted_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tc_tenant_group" ON "tenancy"."tenant_config" USING btree (
  "tenant_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "config_group" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tc_tenant_id" ON "tenancy"."tenant_config" USING btree (
  "tenant_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table tenant_config
-- ----------------------------
CREATE TRIGGER "trg_tenant_config_updated" BEFORE UPDATE ON "tenancy"."tenant_config"
FOR EACH ROW
EXECUTE PROCEDURE "tenancy"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table tenant_config
-- ----------------------------
ALTER TABLE "tenancy"."tenant_config" ADD CONSTRAINT "tenant_configs_tenant_id_config_key_key" UNIQUE ("tenant_id", "config_key");

-- ----------------------------
-- Checks structure for table tenant_config
-- ----------------------------
ALTER TABLE "tenancy"."tenant_config" ADD CONSTRAINT "tenant_config_value_type_check" CHECK (value_type::text = ANY (ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'json'::character varying]::text[]));

-- ----------------------------
-- Primary Key structure for table tenant_config
-- ----------------------------
ALTER TABLE "tenancy"."tenant_config" ADD CONSTRAINT "tenant_configs_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table tenant_domain
-- ----------------------------
CREATE INDEX "idx_td_deleted_at" ON "tenancy"."tenant_domain" USING btree (
  "deleted_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "idx_td_domain" ON "tenancy"."tenant_domain" USING btree (
  "domain" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_td_tenant_id" ON "tenancy"."tenant_domain" USING btree (
  "tenant_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table tenant_domain
-- ----------------------------
CREATE TRIGGER "trg_tenant_domain_updated" BEFORE UPDATE ON "tenancy"."tenant_domain"
FOR EACH ROW
EXECUTE PROCEDURE "tenancy"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table tenant_domain
-- ----------------------------
ALTER TABLE "tenancy"."tenant_domain" ADD CONSTRAINT "tenant_domains_domain_key" UNIQUE ("domain");

-- ----------------------------
-- Checks structure for table tenant_domain
-- ----------------------------
ALTER TABLE "tenancy"."tenant_domain" ADD CONSTRAINT "chk_td_verification_status" CHECK (verification_status::text = ANY (ARRAY['pending'::character varying::text, 'verified'::character varying::text, 'failed'::character varying::text]));
ALTER TABLE "tenancy"."tenant_domain" ADD CONSTRAINT "chk_td_domain_type" CHECK (domain_type::text = ANY (ARRAY['custom'::character varying::text, 'subdomain'::character varying::text]));
ALTER TABLE "tenancy"."tenant_domain" ADD CONSTRAINT "chk_td_ssl_status" CHECK (ssl_status::text = ANY (ARRAY['none'::character varying::text, 'pending'::character varying::text, 'active'::character varying::text, 'failed'::character varying::text]));

-- ----------------------------
-- Primary Key structure for table tenant_domain
-- ----------------------------
ALTER TABLE "tenancy"."tenant_domain" ADD CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table tenant_member
-- ----------------------------
CREATE INDEX "idx_tm_account_id" ON "tenancy"."tenant_member" USING btree (
  "account_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tm_deleted_at" ON "tenancy"."tenant_member" USING btree (
  "deleted_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tm_is_primary_owner" ON "tenancy"."tenant_member" USING btree (
  "is_primary_owner" "pg_catalog"."bool_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tm_role" ON "tenancy"."tenant_member" USING btree (
  "role" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tm_role_id" ON "tenancy"."tenant_member" USING btree (
  "role_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tm_status" ON "tenancy"."tenant_member" USING btree (
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tm_tenant_id" ON "tenancy"."tenant_member" USING btree (
  "tenant_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table tenant_member
-- ----------------------------
CREATE TRIGGER "trg_tenant_member_updated" BEFORE UPDATE ON "tenancy"."tenant_member"
FOR EACH ROW
EXECUTE PROCEDURE "tenancy"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table tenant_member
-- ----------------------------
ALTER TABLE "tenancy"."tenant_member" ADD CONSTRAINT "tenant_members_tenant_id_user_id_key" UNIQUE ("tenant_id", "account_id");

-- ----------------------------
-- Checks structure for table tenant_member
-- ----------------------------
ALTER TABLE "tenancy"."tenant_member" ADD CONSTRAINT "chk_tm_joined_source" CHECK (joined_source::text = ANY (ARRAY['created'::character varying::text, 'invited'::character varying::text, 'sso'::character varying::text, 'api'::character varying::text]));
ALTER TABLE "tenancy"."tenant_member" ADD CONSTRAINT "chk_tm_status" CHECK (status::text = ANY (ARRAY['active'::character varying::text, 'inactive'::character varying::text, 'banned'::character varying::text]));

-- ----------------------------
-- Primary Key structure for table tenant_member
-- ----------------------------
ALTER TABLE "tenancy"."tenant_member" ADD CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table tenant_organization
-- ----------------------------
CREATE INDEX "idx_to_deleted_at" ON "tenancy"."tenant_organization" USING btree (
  "deleted_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "idx_to_tenant_id" ON "tenancy"."tenant_organization" USING btree (
  "tenant_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_to_verified_status" ON "tenancy"."tenant_organization" USING btree (
  "verified_status" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table tenant_organization
-- ----------------------------
CREATE TRIGGER "trg_tenant_organization_updated" BEFORE UPDATE ON "tenancy"."tenant_organization"
FOR EACH ROW
EXECUTE PROCEDURE "tenancy"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table tenant_organization
-- ----------------------------
ALTER TABLE "tenancy"."tenant_organization" ADD CONSTRAINT "tenant_organizations_tenant_id_key" UNIQUE ("tenant_id");

-- ----------------------------
-- Checks structure for table tenant_organization
-- ----------------------------
ALTER TABLE "tenancy"."tenant_organization" ADD CONSTRAINT "chk_to_verified_status" CHECK (verified_status::text = ANY (ARRAY['unverified'::character varying::text, 'pending'::character varying::text, 'verified'::character varying::text, 'rejected'::character varying::text]));

-- ----------------------------
-- Primary Key structure for table tenant_organization
-- ----------------------------
ALTER TABLE "tenancy"."tenant_organization" ADD CONSTRAINT "tenant_organizations_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table tenant_ownership_transfer
-- ----------------------------
CREATE INDEX "idx_tot_from_account_id" ON "tenancy"."tenant_ownership_transfer" USING btree (
  "from_account_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tot_tenant_id" ON "tenancy"."tenant_ownership_transfer" USING btree (
  "tenant_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tot_to_account_id" ON "tenancy"."tenant_ownership_transfer" USING btree (
  "to_account_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Checks structure for table tenant_ownership_transfer
-- ----------------------------
ALTER TABLE "tenancy"."tenant_ownership_transfer" ADD CONSTRAINT "chk_tot_transfer_status" CHECK (transfer_status::text = ANY (ARRAY['success'::character varying::text, 'failed'::character varying::text, 'cancelled'::character varying::text]));

-- ----------------------------
-- Primary Key structure for table tenant_ownership_transfer
-- ----------------------------
ALTER TABLE "tenancy"."tenant_ownership_transfer" ADD CONSTRAINT "tenant_ownership_transfer_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table tenant_permission
-- ----------------------------
CREATE INDEX "idx_tp_deleted_at" ON "tenancy"."tenant_permission" USING btree (
  "deleted_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tp_parent_code" ON "tenancy"."tenant_permission" USING btree (
  "parent_code" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tp_permission_code" ON "tenancy"."tenant_permission" USING btree (
  "permission_code" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tp_sort" ON "tenancy"."tenant_permission" USING btree (
  "sort" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table tenant_permission
-- ----------------------------
CREATE TRIGGER "trg_tenant_permission_updated" BEFORE UPDATE ON "tenancy"."tenant_permission"
FOR EACH ROW
EXECUTE PROCEDURE "tenancy"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table tenant_permission
-- ----------------------------
ALTER TABLE "tenancy"."tenant_permission" ADD CONSTRAINT "tenant_permissions_permission_code_key" UNIQUE ("permission_code");

-- ----------------------------
-- Checks structure for table tenant_permission
-- ----------------------------
ALTER TABLE "tenancy"."tenant_permission" ADD CONSTRAINT "chk_tp_permission_scope" CHECK (permission_scope::text = ANY (ARRAY['platform'::character varying::text, 'tenant'::character varying::text]));
ALTER TABLE "tenancy"."tenant_permission" ADD CONSTRAINT "chk_tp_permission_type" CHECK (permission_type::text = ANY (ARRAY['MENU'::character varying::text, 'BUTTON'::character varying::text, 'API'::character varying::text, 'DATA'::character varying::text]));

-- ----------------------------
-- Primary Key structure for table tenant_permission
-- ----------------------------
ALTER TABLE "tenancy"."tenant_permission" ADD CONSTRAINT "tenant_permissions_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table tenant_role
-- ----------------------------
CREATE INDEX "idx_tr_deleted_at" ON "tenancy"."tenant_role" USING btree (
  "deleted_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tr_role_code" ON "tenancy"."tenant_role" USING btree (
  "role_code" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tr_sort" ON "tenancy"."tenant_role" USING btree (
  "sort" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tr_status" ON "tenancy"."tenant_role" USING btree (
  "status" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_tr_tenant_id" ON "tenancy"."tenant_role" USING btree (
  "tenant_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table tenant_role
-- ----------------------------
CREATE TRIGGER "trg_tenant_role_updated" BEFORE UPDATE ON "tenancy"."tenant_role"
FOR EACH ROW
EXECUTE PROCEDURE "tenancy"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table tenant_role
-- ----------------------------
ALTER TABLE "tenancy"."tenant_role" ADD CONSTRAINT "tenant_roles_tenant_id_role_code_key" UNIQUE ("tenant_id", "role_code");

-- ----------------------------
-- Checks structure for table tenant_role
-- ----------------------------
ALTER TABLE "tenancy"."tenant_role" ADD CONSTRAINT "chk_tr_status" CHECK (status::text = ANY (ARRAY['active'::character varying::text, 'disabled'::character varying::text]));

-- ----------------------------
-- Primary Key structure for table tenant_role
-- ----------------------------
ALTER TABLE "tenancy"."tenant_role" ADD CONSTRAINT "tenant_roles_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table tenant_role_permission
-- ----------------------------
CREATE INDEX "idx_trp_permission_id" ON "tenancy"."tenant_role_permission" USING btree (
  "permission_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_trp_role_id" ON "tenancy"."tenant_role_permission" USING btree (
  "role_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_trp_tenant_id" ON "tenancy"."tenant_role_permission" USING btree (
  "tenant_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Uniques structure for table tenant_role_permission
-- ----------------------------
ALTER TABLE "tenancy"."tenant_role_permission" ADD CONSTRAINT "tenant_role_permissions_role_id_permission_id_key" UNIQUE ("role_id", "permission_id");

-- ----------------------------
-- Primary Key structure for table tenant_role_permission
-- ----------------------------
ALTER TABLE "tenancy"."tenant_role_permission" ADD CONSTRAINT "tenant_role_permission_pkey" PRIMARY KEY ("role_id", "permission_id");

-- ----------------------------
-- Foreign Keys structure for table tenant_config
-- ----------------------------
ALTER TABLE "tenancy"."tenant_config" ADD CONSTRAINT "fk_tc_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."tenant" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table tenant_domain
-- ----------------------------
ALTER TABLE "tenancy"."tenant_domain" ADD CONSTRAINT "fk_td_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."tenant" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table tenant_member
-- ----------------------------
ALTER TABLE "tenancy"."tenant_member" ADD CONSTRAINT "fk_tm_account" FOREIGN KEY ("account_id") REFERENCES "account"."account" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "tenancy"."tenant_member" ADD CONSTRAINT "fk_tm_role" FOREIGN KEY ("role_id") REFERENCES "tenancy"."tenant_role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "tenancy"."tenant_member" ADD CONSTRAINT "fk_tm_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."tenant" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table tenant_organization
-- ----------------------------
ALTER TABLE "tenancy"."tenant_organization" ADD CONSTRAINT "fk_to_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."tenant" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table tenant_ownership_transfer
-- ----------------------------
ALTER TABLE "tenancy"."tenant_ownership_transfer" ADD CONSTRAINT "fk_tot_from_account" FOREIGN KEY ("from_account_id") REFERENCES "account"."account" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "tenancy"."tenant_ownership_transfer" ADD CONSTRAINT "fk_tot_operator" FOREIGN KEY ("operator_id") REFERENCES "account"."account" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "tenancy"."tenant_ownership_transfer" ADD CONSTRAINT "fk_tot_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."tenant" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "tenancy"."tenant_ownership_transfer" ADD CONSTRAINT "fk_tot_to_account" FOREIGN KEY ("to_account_id") REFERENCES "account"."account" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table tenant_role
-- ----------------------------
ALTER TABLE "tenancy"."tenant_role" ADD CONSTRAINT "fk_tr_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."tenant" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table tenant_role_permission
-- ----------------------------
ALTER TABLE "tenancy"."tenant_role_permission" ADD CONSTRAINT "fk_trp_permission" FOREIGN KEY ("permission_id") REFERENCES "tenancy"."tenant_permission" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "tenancy"."tenant_role_permission" ADD CONSTRAINT "fk_trp_role" FOREIGN KEY ("role_id") REFERENCES "tenancy"."tenant_role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "tenancy"."tenant_role_permission" ADD CONSTRAINT "fk_trp_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenancy"."tenant" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
