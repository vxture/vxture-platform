/*
 Navicat Premium Dump SQL

 Source Server         : mylocalhost-pg-develop
 Source Server Type    : PostgreSQL
 Source Server Version : 180003 (180003)
 Source Host           : localhost:5432
 Source Catalog        : vxture_beta
 Source Schema         : account

 Target Server Type    : PostgreSQL
 Target Server Version : 180003 (180003)
 File Encoding         : 65001

 Date: 21/04/2026 17:26:59
*/


-- ----------------------------
-- Table structure for account
-- ----------------------------
DROP TABLE IF EXISTS "account"."account";
CREATE TABLE "account"."account" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "username" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "email" varchar(128) COLLATE "pg_catalog"."default",
  "phone" varchar(32) COLLATE "pg_catalog"."default",
  "password_hash" varchar(255) COLLATE "pg_catalog"."default",
  "status" bool NOT NULL DEFAULT true,
  "last_login_at" timestamptz(6),
  "last_login_ip" varchar(64) COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "deleted_at" timestamptz(6)
)
;
COMMENT ON COLUMN "account"."account"."id" IS '全局账号ID';
COMMENT ON TABLE "account"."account" IS '全局账号表（跨租户身份）';

-- ----------------------------
-- Table structure for account_identity
-- ----------------------------
DROP TABLE IF EXISTS "account"."account_identity";
CREATE TABLE "account"."account_identity" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL,
  "provider" varchar(32) COLLATE "pg_catalog"."default" NOT NULL,
  "provider_account_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "provider_account_data" jsonb,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  "deleted_at" timestamptz(6)
)
;
COMMENT ON COLUMN "account"."account_identity"."account_id" IS '全局账号ID';
COMMENT ON TABLE "account"."account_identity" IS '账号身份信息表';

-- ----------------------------
-- Table structure for account_oauth_provider
-- ----------------------------
DROP TABLE IF EXISTS "account"."account_oauth_provider";
CREATE TABLE "account"."account_oauth_provider" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "code" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "name" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "client_id" varchar(255) COLLATE "pg_catalog"."default",
  "client_secret" varchar(255) COLLATE "pg_catalog"."default",
  "scope" varchar(512) COLLATE "pg_catalog"."default",
  "auth_url" varchar(512) COLLATE "pg_catalog"."default",
  "token_url" varchar(512) COLLATE "pg_catalog"."default",
  "account_info_url" varchar(512) COLLATE "pg_catalog"."default",
  "redirect_uri" varchar(512) COLLATE "pg_catalog"."default",
  "is_enabled" bool NOT NULL DEFAULT true,
  "sort" int4 NOT NULL DEFAULT 999,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now()
)
;
COMMENT ON TABLE "account"."account_oauth_provider" IS '账号第三方OAuth授权提供商';

-- ----------------------------
-- Table structure for account_oauth_state
-- ----------------------------
DROP TABLE IF EXISTS "account"."account_oauth_state";
CREATE TABLE "account"."account_oauth_state" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "state" varchar(128) COLLATE "pg_catalog"."default" NOT NULL,
  "provider_code" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "redirect_uri" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "expires_at" timestamptz(6) NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
)
;
COMMENT ON TABLE "account"."account_oauth_state" IS '账号OAuth授权请求状态表';

-- ----------------------------
-- Indexes structure for table account
-- ----------------------------
CREATE INDEX "idx_account_deleted_at" ON "account"."account" USING btree (
  "deleted_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "idx_account_email" ON "account"."account" USING btree (
  "email" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_account_phone" ON "account"."account" USING btree (
  "phone" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_account_status" ON "account"."account" USING btree (
  "status" "pg_catalog"."bool_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table account
-- ----------------------------
CREATE TRIGGER "trg_account_updated" BEFORE UPDATE ON "account"."account"
FOR EACH ROW
EXECUTE PROCEDURE "tenancy"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table account
-- ----------------------------
ALTER TABLE "account"."account" ADD CONSTRAINT "account_email_key" UNIQUE ("email");
ALTER TABLE "account"."account" ADD CONSTRAINT "account_phone_key" UNIQUE ("phone");
ALTER TABLE "account"."account" ADD CONSTRAINT "account_username_key" UNIQUE ("username");

-- ----------------------------
-- Primary Key structure for table account
-- ----------------------------
ALTER TABLE "account"."account" ADD CONSTRAINT "account_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table account_identity
-- ----------------------------
CREATE INDEX "idx_account_identities_account_id" ON "account"."account_identity" USING btree (
  "account_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_account_identities_deleted_at" ON "account"."account_identity" USING btree (
  "deleted_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "idx_account_identities_provider" ON "account"."account_identity" USING btree (
  "provider" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_account_identities_provider_account_id" ON "account"."account_identity" USING btree (
  "provider_account_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table account_identity
-- ----------------------------
CREATE TRIGGER "trg_account_identity_updated" BEFORE UPDATE ON "account"."account_identity"
FOR EACH ROW
EXECUTE PROCEDURE "tenancy"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table account_identity
-- ----------------------------
ALTER TABLE "account"."account_identity" ADD CONSTRAINT "account_identities_account_id_provider_key" UNIQUE ("account_id", "provider");
ALTER TABLE "account"."account_identity" ADD CONSTRAINT "account_identities_provider_provider_account_id_key" UNIQUE ("provider", "provider_account_id");

-- ----------------------------
-- Primary Key structure for table account_identity
-- ----------------------------
ALTER TABLE "account"."account_identity" ADD CONSTRAINT "account_identities_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table account_oauth_provider
-- ----------------------------
CREATE INDEX "oauth_providers_is_enabled_idx" ON "account"."account_oauth_provider" USING btree (
  "is_enabled" "pg_catalog"."bool_ops" ASC NULLS LAST
);
CREATE INDEX "oauth_providers_sort_idx" ON "account"."account_oauth_provider" USING btree (
  "sort" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table account_oauth_provider
-- ----------------------------
CREATE TRIGGER "trg_account_oauth_provider_updated" BEFORE UPDATE ON "account"."account_oauth_provider"
FOR EACH ROW
EXECUTE PROCEDURE "tenancy"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table account_oauth_provider
-- ----------------------------
ALTER TABLE "account"."account_oauth_provider" ADD CONSTRAINT "oauth_providers_code_key" UNIQUE ("code");

-- ----------------------------
-- Primary Key structure for table account_oauth_provider
-- ----------------------------
ALTER TABLE "account"."account_oauth_provider" ADD CONSTRAINT "oauth_providers_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table account_oauth_state
-- ----------------------------
CREATE INDEX "oauth_states_expires_at_idx" ON "account"."account_oauth_state" USING btree (
  "expires_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);
CREATE INDEX "oauth_states_provider_code_idx" ON "account"."account_oauth_state" USING btree (
  "provider_code" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table account_oauth_state
-- ----------------------------
CREATE TRIGGER "trg_account_oauth_state_updated" BEFORE UPDATE ON "account"."account_oauth_state"
FOR EACH ROW
EXECUTE PROCEDURE "tenancy"."set_updated_at"();

-- ----------------------------
-- Uniques structure for table account_oauth_state
-- ----------------------------
ALTER TABLE "account"."account_oauth_state" ADD CONSTRAINT "oauth_states_state_key" UNIQUE ("state");

-- ----------------------------
-- Primary Key structure for table account_oauth_state
-- ----------------------------
ALTER TABLE "account"."account_oauth_state" ADD CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Table structure for account_profile
-- ----------------------------
DROP TABLE IF EXISTS "account"."account_profile";
CREATE TABLE "account"."account_profile" (
  "account_id" uuid NOT NULL,
  "display_name" varchar(96) COLLATE "pg_catalog"."default",
  "avatar_url" varchar(512) COLLATE "pg_catalog"."default",
  "headline" varchar(128) COLLATE "pg_catalog"."default",
  "bio" text COLLATE "pg_catalog"."default",
  "timezone" varchar(64) COLLATE "pg_catalog"."default",
  "language" varchar(32) COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now()
)
;
COMMENT ON COLUMN "account"."account_profile"."account_id" IS '关联全局账号ID';
COMMENT ON TABLE "account"."account_profile" IS '账号扩展资料表（与 account 一对一）';

-- ----------------------------
-- Triggers structure for table account_profile
-- ----------------------------
CREATE TRIGGER "trg_account_profile_updated" BEFORE UPDATE ON "account"."account_profile"
FOR EACH ROW
EXECUTE PROCEDURE "tenancy"."set_updated_at"();

-- ----------------------------
-- Primary Key structure for table account_profile
-- ----------------------------
ALTER TABLE "account"."account_profile" ADD CONSTRAINT "account_profile_pkey" PRIMARY KEY ("account_id");

-- ----------------------------
-- Foreign Keys structure for table account_profile
-- ----------------------------
ALTER TABLE "account"."account_profile" ADD CONSTRAINT "account_profile_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"."account" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Table structure for password_reset_token
-- ----------------------------
DROP TABLE IF EXISTS "account"."password_reset_token";
CREATE TABLE "account"."password_reset_token" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL,
  "token_hash" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "expires_at" timestamptz(6) NOT NULL,
  "used_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
)
;
COMMENT ON COLUMN "account"."password_reset_token"."token_hash" IS 'SHA-256 哈希，原始 token 仅在生成时返回一次';
COMMENT ON TABLE "account"."password_reset_token" IS '账号密码重置令牌表';

-- ----------------------------
-- Indexes structure for table password_reset_token
-- ----------------------------
CREATE INDEX "idx_password_reset_token_account_id" ON "account"."password_reset_token" USING btree (
  "account_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "idx_password_reset_token_expires_at" ON "account"."password_reset_token" USING btree (
  "expires_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST
);

-- ----------------------------
-- Uniques structure for table password_reset_token
-- ----------------------------
ALTER TABLE "account"."password_reset_token" ADD CONSTRAINT "password_reset_token_token_hash_key" UNIQUE ("token_hash");

-- ----------------------------
-- Primary Key structure for table password_reset_token
-- ----------------------------
ALTER TABLE "account"."password_reset_token" ADD CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table password_reset_token
-- ----------------------------
ALTER TABLE "account"."password_reset_token" ADD CONSTRAINT "password_reset_token_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"."account" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
