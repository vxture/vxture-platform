/*
 Navicat Premium Dump SQL

 Source Server         : mylocalhost-pg-develop
 Source Server Type    : PostgreSQL
 Source Server Version : 180003 (180003)
 Source Host           : localhost:5432
 Source Catalog        : vxture_beta
 Source Schema         : platform

 Target Server Type    : PostgreSQL
 Target Server Version : 180003 (180003)
 File Encoding         : 65001

 Date: 21/04/2026 17:27:26
*/


-- ----------------------------
-- Table structure for platform_admin
-- ----------------------------
DROP TABLE IF EXISTS "platform"."platform_admin";
CREATE TABLE "platform"."platform_admin" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sort" int4 NOT NULL DEFAULT 999,
  "username" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "phone" varchar(32) COLLATE "pg_catalog"."default",
  "email" varchar(128) COLLATE "pg_catalog"."default",
  "password_hash" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "role_id" uuid NOT NULL,
  "status" bool NOT NULL DEFAULT true,
  "status_code" varchar(32) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'active'::character varying,
  "last_login_at" timestamptz(6),
  "last_login_ip" varchar(64) COLLATE "pg_catalog"."default",
  "created_by" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "deleted_at" timestamptz(6),
  "updated_by" uuid,
  "is_system" bool NOT NULL DEFAULT false,
  "display_name" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "remark" varchar(255) COLLATE "pg_catalog"."default" DEFAULT NULL::character varying
)
;
COMMENT ON COLUMN "platform"."platform_admin"."is_system" IS '是否系统内置用户：true=SYSTEM系统用户，false=普通管理员';
COMMENT ON COLUMN "platform"."platform_admin"."display_name" IS '用户显示名称';
COMMENT ON COLUMN "platform"."platform_admin"."status_code" IS '平台用户状态：active=启用，disabled=停用，locked=锁定，pending=待激活，suspended=暂停';

-- ----------------------------
-- Table structure for platform_config
-- ----------------------------
DROP TABLE IF EXISTS "platform"."platform_config";
CREATE TABLE "platform"."platform_config" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "config_key" varchar(128) COLLATE "pg_catalog"."default" NOT NULL,
  "config_group" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "config_value" text COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "is_sensitive" bool NOT NULL DEFAULT false,
  "is_readonly" bool NOT NULL DEFAULT false,
  "updated_by" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "value_type" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'string'::character varying,
  "created_by" uuid
)
;
COMMENT ON COLUMN "platform"."platform_config"."id" IS 'Primary key ID';
COMMENT ON COLUMN "platform"."platform_config"."config_key" IS 'Config key (unique, UPPER_SNAKE_CASE)';
COMMENT ON COLUMN "platform"."platform_config"."config_group" IS 'Config group (BILLING/AUTH/SYSTEM/FEATURE)';
COMMENT ON COLUMN "platform"."platform_config"."config_value" IS 'Config value';
COMMENT ON COLUMN "platform"."platform_config"."description" IS 'Config description (i18n key reference)';
COMMENT ON COLUMN "platform"."platform_config"."is_sensitive" IS 'true 则 API 返回时脱敏显示';
COMMENT ON COLUMN "platform"."platform_config"."is_readonly" IS 'true 则只能通过 migration 修改，禁止后台操作';
COMMENT ON COLUMN "platform"."platform_config"."updated_by" IS 'Updater (platform admin ID)';
COMMENT ON COLUMN "platform"."platform_config"."created_at" IS 'Creation time';
COMMENT ON COLUMN "platform"."platform_config"."updated_at" IS 'Update time';
COMMENT ON COLUMN "platform"."platform_config"."value_type" IS '配置值类型：string、number、boolean、json';
COMMENT ON TABLE "platform"."platform_config" IS '平台全局 KV 配置，格式 {group}.{key}';

-- ----------------------------
-- Table structure for platform_permission
-- ----------------------------
DROP TABLE IF EXISTS "platform"."platform_permission";
CREATE TABLE "platform"."platform_permission" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "parent_id" uuid,
  "perm_code" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "perm_name" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "perm_type" varchar(20) COLLATE "pg_catalog"."default" NOT NULL,
  "status" bool NOT NULL DEFAULT true,
  "description" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "icon" varchar(64) COLLATE "pg_catalog"."default",
  "sort" int4 NOT NULL DEFAULT 999,
  "route_path" varchar(255) COLLATE "pg_catalog"."default",
  "component" varchar(255) COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL,
  "updated_by" uuid NOT NULL
)
;

-- ----------------------------
-- Table structure for platform_role
-- ----------------------------
DROP TABLE IF EXISTS "platform"."platform_role";
CREATE TABLE "platform"."platform_role" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sort" int4 NOT NULL DEFAULT 999,
  "role_code" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "name_i18n_key" varchar(128) COLLATE "pg_catalog"."default" NOT NULL,
  "name_en" varchar(128) COLLATE "pg_catalog"."default" NOT NULL,
  "description_i18n_key" varchar(128) COLLATE "pg_catalog"."default",
  "description" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "is_system" bool NOT NULL DEFAULT false,
  "status" bool NOT NULL DEFAULT true,
  "status_code" varchar(32) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'active'::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_by" uuid
)
;
COMMENT ON COLUMN "platform"."platform_role"."role_code" IS '固定 RBAC 角色 code：PLATFORM_ARCHITECT | SECURITY_GOVERNANCE_OFFICER | SYSTEM_OPERATIONS_CONTROLLER | TENANT_OPERATIONS_MANAGER | SUPPORT_RESPONSE_OFFICER | OBSERVER';
COMMENT ON COLUMN "platform"."platform_role"."name_i18n_key" IS '角色名称国际化 key，UI 主展示入口';
COMMENT ON COLUMN "platform"."platform_role"."name_en" IS '角色英文 fallback 名称';
COMMENT ON COLUMN "platform"."platform_role"."description_i18n_key" IS '角色描述国际化 key，可为空';
COMMENT ON COLUMN "platform"."platform_role"."description" IS '角色默认 fallback 描述，不存储 i18n key；UI 优先使用 description_i18n_key。';
COMMENT ON COLUMN "platform"."platform_role"."status_code" IS '平台角色状态：active=启用，disabled=停用，archived=归档';

-- ----------------------------
-- Table structure for platform_role_permission
-- ----------------------------
DROP TABLE IF EXISTS "platform"."platform_role_permission";
CREATE TABLE "platform"."platform_role_permission" (
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "created_by" uuid NOT NULL,
  "updated_at" timestamptz(6),
  "updated_by" uuid
)
;

-- ----------------------------
-- Function structure for set_updated_at
-- ----------------------------
DROP FUNCTION IF EXISTS "platform"."set_updated_at"();
CREATE FUNCTION "platform"."set_updated_at"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- ----------------------------
-- Function structure for sync_platform_architect_perm
-- ----------------------------
DROP FUNCTION IF EXISTS "platform"."sync_platform_architect_perm"();
CREATE FUNCTION "platform"."sync_platform_architect_perm"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
DECLARE
    platform_architect_id UUID;
BEGIN
    -- 获取平台架构设计师角色 ID
    SELECT id
    INTO platform_architect_id
    FROM platform.platform_role
    WHERE role_code = 'PLATFORM_ARCHITECT'
    LIMIT 1;

    IF platform_architect_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- 新增权限：自动授权（已修复：platform_role_permissions → platform_role_permission）
    IF TG_OP = 'INSERT' THEN
        INSERT INTO platform.platform_role_permission (role_id, permission_id)
        VALUES (platform_architect_id, NEW.id)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;

    -- 删除权限：清理所有关联（已修复：platform_role_permissions → platform_role_permission）
    IF TG_OP = 'DELETE' THEN
        DELETE FROM platform.platform_role_permission
        WHERE permission_id = OLD.id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

-- ----------------------------
-- Indexes structure for table platform_admin
-- ----------------------------
CREATE INDEX "idx_platform_admin_deleted_at" ON "platform"."platform_admin" USING btree (
  "deleted_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "idx_platform_admin_email" ON "platform"."platform_admin" USING btree (
  "email" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_platform_admin_phone" ON "platform"."platform_admin" USING btree (
  "phone" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_platform_admin_role_id" ON "platform"."platform_admin" USING btree (
  "role_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_platform_admin_sort" ON "platform"."platform_admin" USING btree (
  "sort" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_platform_admin_status" ON "platform"."platform_admin" USING btree (
  "status" "pg_catalog"."bool_ops" ASC NULLS LAST
);
CREATE INDEX "idx_platform_admin_status_code" ON "platform"."platform_admin" USING btree (
  "status_code" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table platform_admin
-- ----------------------------
CREATE TRIGGER "trg_platform_admin_updated" BEFORE UPDATE ON "platform"."platform_admin"
FOR EACH ROW
EXECUTE PROCEDURE "platform"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table platform_admin
-- ----------------------------
ALTER TABLE "platform"."platform_admin" ADD CONSTRAINT "uk_admin_username" UNIQUE ("username");
ALTER TABLE "platform"."platform_admin" ADD CONSTRAINT "uk_admin_phone" UNIQUE ("phone");
ALTER TABLE "platform"."platform_admin" ADD CONSTRAINT "uk_admin_email" UNIQUE ("email");
ALTER TABLE "platform"."platform_admin" ADD CONSTRAINT "ck_platform_admin_status_code" CHECK ("status_code"::text = ANY (ARRAY['active'::character varying, 'disabled'::character varying, 'locked'::character varying, 'pending'::character varying, 'suspended'::character varying]::text[]));

-- ----------------------------
-- Primary Key structure for table platform_admin
-- ----------------------------
ALTER TABLE "platform"."platform_admin" ADD CONSTRAINT "platform_admin_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table platform_config
-- ----------------------------
CREATE INDEX "idx_platform_config_group" ON "platform"."platform_config" USING btree (
  "config_group" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table platform_config
-- ----------------------------
CREATE TRIGGER "trg_platform_config_updated" BEFORE UPDATE ON "platform"."platform_config"
FOR EACH ROW
EXECUTE PROCEDURE "platform"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table platform_config
-- ----------------------------
ALTER TABLE "platform"."platform_config" ADD CONSTRAINT "uk_platform_config_key" UNIQUE ("config_key");

-- ----------------------------
-- Checks structure for table platform_config
-- ----------------------------
ALTER TABLE "platform"."platform_config" ADD CONSTRAINT "platform_config_value_type_check" CHECK (value_type::text = ANY (ARRAY['string'::character varying, 'number'::character varying, 'boolean'::character varying, 'json'::character varying]::text[]));

-- ----------------------------
-- Primary Key structure for table platform_config
-- ----------------------------
ALTER TABLE "platform"."platform_config" ADD CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table platform_permission
-- ----------------------------
CREATE INDEX "idx_perm_parent_id" ON "platform"."platform_permission" USING btree (
  "parent_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_perm_sort" ON "platform"."platform_permission" USING btree (
  "sort" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_perm_status" ON "platform"."platform_permission" USING btree (
  "status" "pg_catalog"."bool_ops" ASC NULLS LAST
);
CREATE INDEX "idx_perm_type" ON "platform"."platform_permission" USING btree (
  "perm_type" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table platform_permission
-- ----------------------------
CREATE TRIGGER "trg_platform_permission_after_delete" AFTER DELETE ON "platform"."platform_permission"
FOR EACH ROW
EXECUTE PROCEDURE "platform"."sync_platform_architect_perm"();
CREATE TRIGGER "trg_platform_permission_after_insert" AFTER INSERT ON "platform"."platform_permission"
FOR EACH ROW
EXECUTE PROCEDURE "platform"."sync_platform_architect_perm"();
CREATE TRIGGER "trg_platform_permission_updated" BEFORE UPDATE ON "platform"."platform_permission"
FOR EACH ROW
EXECUTE PROCEDURE "platform"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table platform_permission
-- ----------------------------
ALTER TABLE "platform"."platform_permission" ADD CONSTRAINT "uk_perm_code" UNIQUE ("perm_code");

-- ----------------------------
-- Checks structure for table platform_permission
-- ----------------------------
ALTER TABLE "platform"."platform_permission" ADD CONSTRAINT "chk_perm_type" CHECK (perm_type::text = ANY (ARRAY['MENU'::character varying::text, 'BUTTON'::character varying::text, 'API'::character varying::text]));

-- ----------------------------
-- Primary Key structure for table platform_permission
-- ----------------------------
ALTER TABLE "platform"."platform_permission" ADD CONSTRAINT "platform_permission_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table platform_role
-- ----------------------------
CREATE INDEX "idx_platform_role_sort" ON "platform"."platform_role" USING btree (
  "sort" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_platform_role_status_code" ON "platform"."platform_role" USING btree (
  "status_code" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_platform_role_name_i18n_key" ON "platform"."platform_role" USING btree (
  "name_i18n_key" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table platform_role
-- ----------------------------
CREATE TRIGGER "trg_platform_role_updated" BEFORE UPDATE ON "platform"."platform_role"
FOR EACH ROW
EXECUTE PROCEDURE "platform"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table platform_role
-- ----------------------------
ALTER TABLE "platform"."platform_role" ADD CONSTRAINT "uk_role_code" UNIQUE ("role_code");
ALTER TABLE "platform"."platform_role" ADD CONSTRAINT "ck_platform_role_status_code" CHECK ("status_code"::text = ANY (ARRAY['active'::character varying, 'disabled'::character varying, 'archived'::character varying]::text[]));

-- ----------------------------
-- Primary Key structure for table platform_role
-- ----------------------------
ALTER TABLE "platform"."platform_role" ADD CONSTRAINT "platform_role_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table platform_role_permission
-- ----------------------------
ALTER TABLE "platform"."platform_role_permission" ADD CONSTRAINT "platform_role_permission_pkey" PRIMARY KEY ("role_id", "permission_id");

-- ----------------------------
-- Foreign Keys structure for table platform_admin
-- ----------------------------
ALTER TABLE "platform"."platform_admin" ADD CONSTRAINT "fk_admin_role" FOREIGN KEY ("role_id") REFERENCES "platform"."platform_role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table platform_permission
-- ----------------------------
ALTER TABLE "platform"."platform_permission" ADD CONSTRAINT "fk_perm_parent" FOREIGN KEY ("parent_id") REFERENCES "platform"."platform_permission" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table platform_role_permission
-- ----------------------------
ALTER TABLE "platform"."platform_role_permission" ADD CONSTRAINT "fk_rp_permission" FOREIGN KEY ("permission_id") REFERENCES "platform"."platform_permission" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "platform"."platform_role_permission" ADD CONSTRAINT "fk_rp_role" FOREIGN KEY ("role_id") REFERENCES "platform"."platform_role" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
