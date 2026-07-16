-- =============================================================================
-- Vxture DB Migration — 2026-05-03
-- 作用：在已有数据库上安全追加缺失表，并迁移 account_oauth → account_identity
-- 执行方式：psql -U <user> -d vxture_beta -f db-migrate-0503.sql
-- 幂等保证：所有语句在重复执行时不会破坏数据
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. 补建 account.account_profile
--    代码中通过 JOIN 此表获取用户头像/显示名，之前由 ensureProfileTable() 建表
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "account"."account_profile" (
  "account_id" uuid NOT NULL,
  "display_name" varchar(96) COLLATE "pg_catalog"."default",
  "avatar_url" varchar(512) COLLATE "pg_catalog"."default",
  "headline" varchar(128) COLLATE "pg_catalog"."default",
  "bio" text COLLATE "pg_catalog"."default",
  "timezone" varchar(64) COLLATE "pg_catalog"."default",
  "language" varchar(32) COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "account_profile_pkey" PRIMARY KEY ("account_id"),
  CONSTRAINT "account_profile_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "account"."account" ("id") ON DELETE CASCADE
);

DO $$ BEGIN
  CREATE TRIGGER "trg_account_profile_updated"
    BEFORE UPDATE ON "account"."account_profile"
    FOR EACH ROW EXECUTE PROCEDURE "tenancy"."set_updated_at"();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. 补建 account.password_reset_token
--    密码重置令牌，之前由 ensureTokenTable() 建表
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "account"."password_reset_token" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "account_id" uuid NOT NULL,
  "token_hash" varchar(64) COLLATE "pg_catalog"."default" NOT NULL,
  "expires_at" timestamptz(6) NOT NULL,
  "used_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "password_reset_token_token_hash_key" UNIQUE ("token_hash"),
  CONSTRAINT "password_reset_token_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "account"."account" ("id") ON DELETE CASCADE
);

DO $$ BEGIN
  CREATE INDEX "idx_password_reset_token_account_id"
    ON "account"."password_reset_token" ("account_id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX "idx_password_reset_token_expires_at"
    ON "account"."password_reset_token" ("expires_at");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 3. 迁移 account.account_oauth → account.account_identity
--    旧表由 ensureOAuthTable() 建立，字段名不同（provider_id vs provider_account_id）
--    迁移策略：先将旧数据写入新表，再删除旧表
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  -- 仅当旧表存在时才执行迁移
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'account' AND tablename = 'account_oauth'
  ) THEN

    -- 确保目标表 account_identity 已存在（由 account-0420.sql 建立）
    IF EXISTS (
      SELECT FROM pg_tables
      WHERE schemaname = 'account' AND tablename = 'account_identity'
    ) THEN
      -- 将旧数据写入新表，忽略已存在的 (account_id, provider) 组合
      INSERT INTO account.account_identity (
        account_id,
        provider,
        provider_account_id,
        provider_account_data,
        created_at,
        updated_at
      )
      SELECT
        account_id,
        provider,
        provider_id,   -- 旧表字段名
        NULL::jsonb,   -- 旧表无此字段，填 NULL
        created_at,
        now()
      FROM account.account_oauth
      ON CONFLICT (account_id, provider) DO NOTHING;

      RAISE NOTICE '已将 account.account_oauth 数据迁移至 account.account_identity';
    END IF;

    -- 删除旧表
    DROP TABLE account.account_oauth;
    RAISE NOTICE '已删除旧表 account.account_oauth';

  ELSE
    RAISE NOTICE 'account.account_oauth 不存在，跳过迁移';
  END IF;
END $$;

-- =============================================================================
-- 迁移完成
-- =============================================================================
