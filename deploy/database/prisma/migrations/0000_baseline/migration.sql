-- 0000_baseline — 平台控制面单一干净基线（schema.prisma 经 prisma migrate diff 生成）+ PG service roles。
-- 覆盖 identity/iam/product/commerce/model/ops/support 全部 72 表（ops 运营身份域 = operator_*，见 docs/design/operator-identity-security.md §6）。
-- tenant 域已退役并入 identity。单一权威基线；不保留增量（service roles 已并入文件末尾）。

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "commerce";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "iam";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "identity";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "model";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ops";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "product";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "support";

-- CreateTable
CREATE TABLE "identity"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account" VARCHAR(64) NOT NULL,
    "email" VARCHAR(128),
    "email_verified_at" TIMESTAMPTZ(6),
    "phone" VARCHAR(32) NOT NULL,
    "phone_verified_at" TIMESTAMPTZ(6) NOT NULL,
    "name" VARCHAR(96),
    "avatar_url" VARCHAR(512),
    "avatar_hash" VARCHAR(64),
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."user_avatar" (
    "user_id" UUID NOT NULL,
    "data" BYTEA NOT NULL,
    "content_type" VARCHAR(32) NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "source" VARCHAR(16) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_avatar_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "identity"."user_credential" (
    "user_id" UUID NOT NULL,
    "password_hash" VARCHAR(255),
    "password_changed_at" TIMESTAMPTZ(6),
    "force_password_change" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_credential_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "identity"."identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "provider_subject" VARCHAR(255) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(128) NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."workspaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."org_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(32) NOT NULL DEFAULT 'member',
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."workspace_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(32) NOT NULL DEFAULT 'member',
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."invitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope" VARCHAR(16) NOT NULL,
    "organization_id" UUID,
    "workspace_id" UUID,
    "target_type" VARCHAR(16) NOT NULL,
    "target" VARCHAR(128) NOT NULL,
    "role" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."auth_session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sid" VARCHAR(64) NOT NULL,
    "user_id" UUID NOT NULL,
    "realm" VARCHAR(16) NOT NULL,
    "auth_method" VARCHAR(32) NOT NULL,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "last_active_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."refresh_token" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "client_id" VARCHAR(64) NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "rotated_from" UUID,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."user_verification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "target_type" VARCHAR(16) NOT NULL,
    "target" VARCHAR(128) NOT NULL,
    "purpose" VARCHAR(32) NOT NULL,
    "code_hash" VARCHAR(64) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."password_reset_token" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."login_attempt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "identifier" VARCHAR(128) NOT NULL,
    "auth_method" VARCHAR(32) NOT NULL DEFAULT 'password',
    "result" VARCHAR(32) NOT NULL,
    "ip_address" VARCHAR(64) NOT NULL,
    "country_code" CHAR(2),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."oauth_provider" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "client_id" VARCHAR(255),
    "client_secret" VARCHAR(255),
    "scope" VARCHAR(512),
    "auth_url" VARCHAR(512),
    "token_url" VARCHAR(512),
    "account_info_url" VARCHAR(512),
    "redirect_uri" VARCHAR(512),
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 999,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."oauth_state" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_code" VARCHAR(64) NOT NULL,
    "state" VARCHAR(128) NOT NULL,
    "redirect_uri" VARCHAR(512) NOT NULL,
    "code_verifier" VARCHAR(128),
    "nonce" VARCHAR(128),
    "ip_address" VARCHAR(64),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."audit_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" VARCHAR(32) NOT NULL,
    "user_id" UUID,
    "organization_id" UUID,
    "workspace_id" UUID,
    "result" VARCHAR(16) NOT NULL,
    "ip_address" VARCHAR(64),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(64) NOT NULL,
    "scope" VARCHAR(16) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."permission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(128) NOT NULL,
    "description" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."role_permission" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "iam"."oidc_client" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "display_name" VARCHAR(128),
    "logo_url" VARCHAR(512),
    "realm" VARCHAR(16) NOT NULL DEFAULT 'tenant',
    "client_secret_hash" VARCHAR(255),
    "redirect_uris" TEXT[],
    "post_logout_redirect_uris" TEXT[],
    "back_channel_logout_uri" VARCHAR(512),
    "allowed_scopes" TEXT[],
    "access_token_ttl" INTEGER NOT NULL DEFAULT 900,
    "refresh_token_ttl" INTEGER NOT NULL DEFAULT 2592000,
    "pkce_required" BOOLEAN NOT NULL DEFAULT true,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oidc_client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iam"."signing_key" (
    "kid" VARCHAR(64) NOT NULL,
    "algorithm" VARCHAR(16) NOT NULL DEFAULT 'RS256',
    "public_jwk" JSONB NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'next',
    "activated_at" TIMESTAMPTZ(6),
    "retiring_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signing_key_pkey" PRIMARY KEY ("kid")
);

-- CreateTable
CREATE TABLE "product"."agent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_code" VARCHAR(64) NOT NULL,
    "agent_name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "agent_type" VARCHAR(32) DEFAULT 'chat',
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "visibility" VARCHAR(32) NOT NULL DEFAULT 'public',
    "agent_category" INTEGER DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort" INTEGER DEFAULT 0,
    "icon_url" VARCHAR(512),
    "config_json" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product"."agent_feature" (
    "agent_id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "is_required" BOOLEAN DEFAULT false,
    "status" BOOLEAN DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "agent_feature_pkey" PRIMARY KEY ("agent_id","feature_id")
);

-- CreateTable
CREATE TABLE "product"."feature" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "feature_code" VARCHAR(128) NOT NULL,
    "feature_name" VARCHAR(128) NOT NULL,
    "parent_code" VARCHAR(128),
    "feature_type" VARCHAR(32) DEFAULT 'function',
    "description" TEXT,
    "status" BOOLEAN DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product"."plan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID,
    "plan_code" VARCHAR(64) NOT NULL,
    "plan_name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "plan_type" VARCHAR(32) DEFAULT 'normal',
    "level" INTEGER DEFAULT 0,
    "is_free" BOOLEAN DEFAULT false,
    "is_public" BOOLEAN DEFAULT true,
    "status" BOOLEAN DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product"."application" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "app_code" VARCHAR(64) NOT NULL,
    "app_name" VARCHAR(128) NOT NULL,
    "app_name_zh" VARCHAR(128),
    "description" TEXT,
    "app_type" VARCHAR(32) NOT NULL DEFAULT 'business',
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "visibility" VARCHAR(32) NOT NULL DEFAULT 'public',
    "home_url" VARCHAR(512),
    "icon_url" VARCHAR(512),
    "webhook_url" VARCHAR(512),
    "webhook_secret_ref" VARCHAR(128),
    "sort" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product"."plan_agent" (
    "plan_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "is_allowed" BOOLEAN DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "plan_agent_pkey" PRIMARY KEY ("agent_id","plan_id")
);

-- CreateTable
CREATE TABLE "product"."plan_feature" (
    "plan_id" UUID NOT NULL,
    "feature_id" UUID NOT NULL,
    "quota_value" BIGINT DEFAULT 0,
    "is_unlimited" BOOLEAN DEFAULT false,
    "config_json" JSONB,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "plan_feature_pkey" PRIMARY KEY ("plan_id","feature_id")
);

-- CreateTable
CREATE TABLE "product"."plan_price" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_id" UUID NOT NULL,
    "price" DECIMAL(18,6) NOT NULL,
    "original_price" DECIMAL(18,6),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'CNY',
    "period_type" VARCHAR(20) NOT NULL,
    "period_value" INTEGER NOT NULL,
    "sort" INTEGER DEFAULT 100,
    "status" BOOLEAN DEFAULT true,
    "is_default" BOOLEAN DEFAULT false,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "plan_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_invoice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "bill_no" VARCHAR(64) NOT NULL,
    "subscription_id" UUID,
    "bill_cycle" VARCHAR(8) NOT NULL,
    "cycle_start_date" DATE NOT NULL,
    "cycle_end_date" DATE NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) DEFAULT 0,
    "payable_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(12,2) DEFAULT 0,
    "currency" VARCHAR(16) DEFAULT 'CNY',
    "bill_status" VARCHAR(32) NOT NULL DEFAULT 'unpaid',
    "bill_type" VARCHAR(32) DEFAULT 'normal',
    "paid_at" TIMESTAMPTZ(6),
    "payment_method" VARCHAR(64),
    "transaction_no" VARCHAR(128),
    "operator_id" UUID,
    "operate_remark" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenant_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_invoice_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bill_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_id" UUID,
    "feature_id" UUID,
    "subscription_id" UUID,
    "item_name" VARCHAR(128) NOT NULL,
    "item_type" VARCHAR(32) NOT NULL,
    "item_unit" VARCHAR(64),
    "quantity" DECIMAL(12,4) DEFAULT 1,
    "unit_price" DECIMAL(12,4) DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "usage_record_id" UUID,
    "remark" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenant_invoice_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_invoice_receipt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "invoice_no" VARCHAR(64) NOT NULL,
    "invoice_type" VARCHAR(32) NOT NULL,
    "invoice_tax_type" VARCHAR(32) NOT NULL,
    "invoice_title" VARCHAR(256) NOT NULL,
    "tax_no" VARCHAR(128),
    "company_info" JSONB NOT NULL,
    "bank_info" JSONB,
    "address_info" JSONB,
    "invoice_amount" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) DEFAULT 0,
    "currency" VARCHAR(16) DEFAULT 'CNY',
    "invoice_status" VARCHAR(32) NOT NULL DEFAULT 'applying',
    "status_remark" TEXT,
    "invoice_code" VARCHAR(64),
    "invoice_electronic_no" VARCHAR(64),
    "invoice_file_url" TEXT,
    "issued_at" TIMESTAMPTZ(6),
    "express_company" VARCHAR(64),
    "express_no" VARCHAR(64),
    "send_at" TIMESTAMPTZ(6),
    "created_by" UUID NOT NULL,
    "auditor_id" UUID,
    "audit_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenant_invoice_receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_payment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "pay_order_no" VARCHAR(64) NOT NULL,
    "pay_source" VARCHAR(32) NOT NULL DEFAULT 'online',
    "pay_channel" VARCHAR(32),
    "pay_method" VARCHAR(32),
    "offline_pay_type" VARCHAR(32),
    "offline_payer_name" VARCHAR(128),
    "offline_pay_time" TIMESTAMPTZ(6),
    "offline_evidence_url" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) DEFAULT 0,
    "currency" VARCHAR(16) DEFAULT 'CNY',
    "pay_status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "status_msg" TEXT,
    "channel_order_no" VARCHAR(128),
    "channel_transaction_no" VARCHAR(128),
    "channel_raw_data" JSONB,
    "pay_expire_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "operator_id" UUID,
    "operate_remark" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_refund" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "bill_id" UUID NOT NULL,
    "pay_record_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "refund_no" VARCHAR(64) NOT NULL,
    "refund_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(16) DEFAULT 'CNY',
    "refund_reason" VARCHAR(512),
    "refund_type" VARCHAR(32) DEFAULT 'normal',
    "audit_status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "audit_remark" TEXT,
    "auditor_id" UUID,
    "audit_at" TIMESTAMPTZ(6),
    "channel_refund_no" VARCHAR(128),
    "refund_status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "refund_at" TIMESTAMPTZ(6),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_subscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "application_id" UUID,
    "plan_id" UUID NOT NULL,
    "cycle_type" VARCHAR(32) NOT NULL DEFAULT 'monthly',
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6),
    "trial_end_at" TIMESTAMPTZ(6),
    "had_trial_at" TIMESTAMPTZ(6),
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "auto_renew" BOOLEAN DEFAULT true,
    "order_no" VARCHAR(128),
    "pay_amount" DECIMAL(12,2),
    "currency" VARCHAR(16) DEFAULT 'CNY',
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenant_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."bundle_plan_component" (
    "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
    "plan_id"           UUID         NOT NULL,
    "app_code"          VARCHAR(64)  NOT NULL,
    "component_plan_id" UUID         NOT NULL,
    "sort_order"        INTEGER      NOT NULL DEFAULT 0,
    "created_by"        UUID         NOT NULL,
    "created_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at"        TIMESTAMPTZ(6),

    CONSTRAINT "bundle_plan_component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."bundle_subscription" (
    "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"  UUID         NOT NULL,
    "plan_id"    UUID         NOT NULL,
    "status"     VARCHAR(32)  NOT NULL DEFAULT 'active',
    "start_at"   TIMESTAMPTZ(6) NOT NULL,
    "end_at"     TIMESTAMPTZ(6),
    "created_by" UUID         NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."bundle_subscription_component" (
    "id"                     UUID        NOT NULL DEFAULT gen_random_uuid(),
    "bundle_subscription_id" UUID        NOT NULL,
    "app_code"               VARCHAR(64) NOT NULL,
    "component_plan_id"      UUID        NOT NULL,
    "disposition"            VARCHAR(32) NOT NULL,
    "tenant_subscription_id" UUID,
    "created_at"             TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_subscription_component_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bsc_disposition_check"
        CHECK ("disposition" IN ('added', 'deferred', 'bypassed')),
    CONSTRAINT "bsc_bundle_sub_fk"
        FOREIGN KEY ("bundle_subscription_id")
        REFERENCES "commerce"."bundle_subscription" ("id")
        ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "commerce"."tenant_app_provisioning" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "version" INTEGER NOT NULL DEFAULT 0,
    "plan_id" UUID,
    "provisioned_at" TIMESTAMPTZ(6),
    "deprovisioned_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_app_provisioning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."app_webhook_delivery" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "response_code" INTEGER,
    "last_attempt_at" TIMESTAMPTZ(6),
    "next_retry_at" TIMESTAMPTZ(6),
    "leased_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_webhook_delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_subscription_quota" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "subscription_id" UUID,
    "max_users" INTEGER NOT NULL DEFAULT 10,
    "max_api_keys" INTEGER NOT NULL DEFAULT 5,
    "max_workflows" INTEGER NOT NULL DEFAULT 20,
    "max_concurrent" INTEGER NOT NULL DEFAULT 5,
    "rate_limit_per_minute" INTEGER NOT NULL DEFAULT 60,
    "period_tokens" BIGINT NOT NULL DEFAULT 1000000,
    "quota_cycle" VARCHAR(32) NOT NULL DEFAULT 'monthly',
    "allowed_models" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allow_custom_model" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenant_subscription_quota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_usage_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "application_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    "application_type" VARCHAR(32) NOT NULL DEFAULT 'internal_service',
    "feature_id" UUID NOT NULL,
    "user_id" UUID,
    "used_quota" BIGINT NOT NULL DEFAULT 0,
    "input_quota" BIGINT DEFAULT 0,
    "output_quota" BIGINT DEFAULT 0,
    "request_id" VARCHAR(128),
    "business_id" VARCHAR(128),
    "usage_type" VARCHAR(32) NOT NULL DEFAULT 'normal',
    "cycle_date" DATE NOT NULL,
    "cycle_month" VARCHAR(6) NOT NULL,
    "model_code" VARCHAR(64),
    "latency_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_usage_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_usage_summary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "feature_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    "agent_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    "application_id" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    "application_type" VARCHAR(32) NOT NULL DEFAULT 'internal_service',
    "cycle_month" VARCHAR(6) NOT NULL,
    "total_quota" BIGINT NOT NULL DEFAULT 0,
    "input_quota" BIGINT NOT NULL DEFAULT 0,
    "output_quota" BIGINT NOT NULL DEFAULT 0,
    "request_count" BIGINT NOT NULL DEFAULT 0,
    "last_synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stat_type" VARCHAR(32) NOT NULL DEFAULT 'detail',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_usage_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_subscription_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "change_type" VARCHAR(32) NOT NULL,
    "from_plan_id" UUID,
    "to_plan_id" UUID,
    "from_status" VARCHAR(32),
    "to_status" VARCHAR(32),
    "operator_type" VARCHAR(32) NOT NULL DEFAULT 'system',
    "operator_id" UUID,
    "operator_remark" VARCHAR(512),
    "client_ip" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_subscription_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_subscription_override" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "agent_id" UUID,
    "feature_id" UUID NOT NULL,
    "custom_quota" BIGINT NOT NULL DEFAULT 0,
    "is_unlimited" BOOLEAN DEFAULT false,
    "is_enabled" BOOLEAN DEFAULT true,
    "effective_start_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_end_at" TIMESTAMPTZ(6),
    "reason" VARCHAR(512),
    "operator_remark" TEXT,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenant_subscription_override_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_transaction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "bill_id" UUID,
    "transaction_no" VARCHAR(64) NOT NULL,
    "trade_type" VARCHAR(32) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(16) DEFAULT 'CNY',
    "balance_before" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "trade_status" VARCHAR(32) NOT NULL DEFAULT 'success',
    "related_no" VARCHAR(128),
    "remark" VARCHAR(512),
    "operator_id" UUID,
    "client_ip" VARCHAR(64),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_credit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "currency" VARCHAR(16) NOT NULL DEFAULT 'CNY',
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_granted" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_consumed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_billing_address" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invoice_type" VARCHAR(32) NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "tax_no" VARCHAR(64),
    "phone" VARCHAR(64),
    "address" VARCHAR(512),
    "bank_name" VARCHAR(256),
    "bank_account" VARCHAR(256),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenant_billing_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."tenant_payment_method" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "method_type" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "display_name" VARCHAR(128) NOT NULL,
    "external_id" VARCHAR(256),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "tenant_payment_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model"."provider" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_code" VARCHAR(64) NOT NULL,
    "provider_type" VARCHAR(32) NOT NULL DEFAULT 'online',
    "provider_name" VARCHAR(128) NOT NULL,
    "description" VARCHAR(512),
    "logo_url" TEXT,
    "homepage_url" TEXT,
    "console_url" TEXT,
    "billing_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model"."model" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID,
    "model_code" VARCHAR(128) NOT NULL,
    "provider" VARCHAR(64) NOT NULL,
    "model_type" VARCHAR(32) NOT NULL DEFAULT 'chat',
    "protocol" VARCHAR(64) NOT NULL,
    "model_name" VARCHAR(128) NOT NULL,
    "description" VARCHAR(512),
    "endpoint_url" TEXT NOT NULL,
    "context_window" INTEGER,
    "max_output_tokens" INTEGER,
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supports_streaming" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 999,
    "config" JSONB,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model"."model_grant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "model_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID,
    "application_type" VARCHAR(32),
    "agent_id" UUID,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "reason" VARCHAR(512),
    "expires_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "model_grant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model"."model_price_rule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "model_id" UUID NOT NULL,
    "billing_mode" VARCHAR(32) NOT NULL DEFAULT 'token',
    "currency" VARCHAR(16) NOT NULL DEFAULT 'CNY',
    "unit_tokens" INTEGER NOT NULL DEFAULT 1000000,
    "input_unit_price" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "output_unit_price" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "request_unit_price" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_price_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model"."model_policy" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "model_id" UUID NOT NULL,
    "tenant_id" UUID,
    "name" VARCHAR(128),
    "priority" INTEGER NOT NULL DEFAULT 100,
    "max_concurrent" INTEGER,
    "rate_limit_rpm" INTEGER,
    "rate_limit_tpm" BIGINT,
    "rate_limit_tpd" BIGINT,
    "max_context_tokens" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."operator_account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" UUID NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "email" VARCHAR(128),
    "phone" VARCHAR(32),
    "display_name" VARCHAR(50) NOT NULL DEFAULT '',
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "account_type" VARCHAR(16) NOT NULL DEFAULT 'personal',
    "sort" INTEGER NOT NULL DEFAULT 999,
    "last_login_at" TIMESTAMPTZ(6),
    "last_login_ip" VARCHAR(64),
    "remark" VARCHAR(255),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "operator_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."operator_credential" (
    "operator_id" UUID NOT NULL,
    "password_hash" VARCHAR(255),
    "password_changed_at" TIMESTAMPTZ(6),
    "force_password_change" BOOLEAN NOT NULL DEFAULT false,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_credential_pkey" PRIMARY KEY ("operator_id")
);

-- CreateTable
CREATE TABLE "ops"."operator_mfa" (
    "operator_id" UUID NOT NULL,
    "policy" VARCHAR(16) NOT NULL DEFAULT 'optional',
    "totp_secret" VARCHAR(255),
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "totp_confirmed_at" TIMESTAMPTZ(6),
    "webauthn_required" BOOLEAN NOT NULL DEFAULT false,
    "enrolled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_mfa_pkey" PRIMARY KEY ("operator_id")
);

-- CreateTable
CREATE TABLE "ops"."operator_webauthn_credential" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operator_id" UUID NOT NULL,
    "credential_id" VARCHAR(255) NOT NULL,
    "public_key" BYTEA NOT NULL,
    "sign_count" BIGINT NOT NULL DEFAULT 0,
    "aaguid" VARCHAR(64),
    "transports" TEXT[],
    "label" VARCHAR(64),
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_webauthn_credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."operator_recovery_code" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operator_id" UUID NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_recovery_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."operator_verification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operator_id" UUID,
    "target_type" VARCHAR(16) NOT NULL,
    "target" VARCHAR(128) NOT NULL,
    "purpose" VARCHAR(32) NOT NULL,
    "code_hash" VARCHAR(64) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."operator_login_attempt" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operator_id" UUID,
    "identifier" VARCHAR(128) NOT NULL,
    "auth_method" VARCHAR(32) NOT NULL DEFAULT 'password',
    "result" VARCHAR(32) NOT NULL,
    "ip_address" VARCHAR(64) NOT NULL,
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_login_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."operator_refresh_token" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operator_id" UUID NOT NULL,
    "session_id" VARCHAR(64) NOT NULL,
    "client_id" VARCHAR(64) NOT NULL DEFAULT 'admin',
    "token_hash" VARCHAR(64) NOT NULL,
    "rotated_from" UUID,
    "status" VARCHAR(16) NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."operator_role" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_code" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "name_en" VARCHAR(128) NOT NULL,
    "name_i18n_key" VARCHAR(128) NOT NULL,
    "description" VARCHAR(255) NOT NULL DEFAULT '',
    "description_i18n_key" VARCHAR(128),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 999,
    "mfa_min_level" VARCHAR(16) NOT NULL DEFAULT 'optional',
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."operator_permission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID,
    "perm_code" VARCHAR(64) NOT NULL,
    "perm_type" VARCHAR(20) NOT NULL,
    "perm_name" VARCHAR(64) NOT NULL,
    "route_path" VARCHAR(255),
    "component" VARCHAR(255),
    "icon" VARCHAR(64),
    "description" VARCHAR(255) NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 999,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."operator_role_permission" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operator_role_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "ops"."setting" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "config_group" VARCHAR(64) NOT NULL,
    "config_key" VARCHAR(128) NOT NULL,
    "value_type" VARCHAR(20) NOT NULL DEFAULT 'string',
    "config_value" TEXT NOT NULL,
    "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "is_encrypted" BOOLEAN NOT NULL DEFAULT false,
    "is_readonly" BOOLEAN NOT NULL DEFAULT false,
    "validation_rule" VARCHAR(512),
    "description" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."governance_record" (
    "id" VARCHAR(64) NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'normal',
    "scope" VARCHAR(160) NOT NULL,
    "owner" VARCHAR(120) NOT NULL,
    "policy" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_table" VARCHAR(128),
    "source_id" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "pk_ops_governance_record" PRIMARY KEY ("kind","id")
);

-- CreateTable
CREATE TABLE "ops"."feature_flag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "flag_key" VARCHAR(128) NOT NULL,
    "category" VARCHAR(64) NOT NULL DEFAULT 'release',
    "environment" VARCHAR(32) NOT NULL DEFAULT 'all',
    "description" VARCHAR(512),
    "is_globally_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "rollout_percentage" INTEGER NOT NULL DEFAULT 0,
    "tenant_overrides" JSONB NOT NULL DEFAULT '{}',
    "expires_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."announcement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "announcement_type" VARCHAR(32) NOT NULL,
    "severity" VARCHAR(16) NOT NULL DEFAULT 'info',
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "lang" VARCHAR(16) NOT NULL DEFAULT 'zh-CN',
    "title" VARCHAR(256) NOT NULL,
    "content" TEXT NOT NULL,
    "cta_label" VARCHAR(64),
    "cta_url" VARCHAR(512),
    "target_plans" VARCHAR(64)[] DEFAULT ARRAY[]::VARCHAR(64)[],
    "target_tenant_types" VARCHAR(32)[] DEFAULT ARRAY[]::VARCHAR(32)[],
    "is_dismissible" BOOLEAN NOT NULL DEFAULT true,
    "publish_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "meta" JSONB,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ops"."maintenance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "severity" VARCHAR(16) NOT NULL DEFAULT 'minor',
    "status" VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    "title" VARCHAR(256) NOT NULL,
    "description" TEXT,
    "impact_description" TEXT,
    "affected_services" VARCHAR(64)[] DEFAULT ARRAY[]::VARCHAR(64)[],
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "actual_end_at" TIMESTAMPTZ(6),
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support"."ticket" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "account_id" UUID,
    "ticket_no" VARCHAR(64) NOT NULL,
    "category" VARCHAR(64) NOT NULL DEFAULT 'general',
    "priority" VARCHAR(16) NOT NULL DEFAULT 'p2',
    "source" VARCHAR(64) NOT NULL DEFAULT 'console',
    "status" VARCHAR(32) NOT NULL DEFAULT 'open',
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "reporter_name" VARCHAR(100),
    "assignee_id" UUID,
    "assignee_name" VARCHAR(100),
    "tags" VARCHAR(64)[] DEFAULT ARRAY[]::VARCHAR(64)[],
    "satisfaction_score" INTEGER,
    "satisfaction_comment" VARCHAR(512),
    "sla_breach_at" TIMESTAMPTZ(6),
    "first_response_at" TIMESTAMPTZ(6),
    "due_at" TIMESTAMPTZ(6),
    "resolved_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support"."ticket_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "actor_type" VARCHAR(32) NOT NULL,
    "actor_id" UUID,
    "actor_name" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support"."audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_type" VARCHAR(32) NOT NULL,
    "actor_id" UUID NOT NULL,
    "tenant_id" UUID,
    "action" VARCHAR(128) NOT NULL,
    "result" VARCHAR(32) NOT NULL DEFAULT 'success',
    "resource_type" VARCHAR(64) NOT NULL,
    "resource_id" VARCHAR(128) NOT NULL,
    "error_code" VARCHAR(64),
    "before" JSONB,
    "after" JSONB,
    "request_id" VARCHAR(128),
    "duration_ms" INTEGER,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support"."notification_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "account_id" UUID,
    "channel" VARCHAR(32) NOT NULL,
    "template_code" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "reference_type" VARCHAR(64),
    "reference_id" VARCHAR(128),
    "recipient" VARCHAR(256) NOT NULL,
    "subject" VARCHAR(256),
    "provider" VARCHAR(64),
    "provider_message_id" VARCHAR(256),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "delivered_at" TIMESTAMPTZ(6),
    "opened_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_account_key" ON "identity"."users"("account");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "identity"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "identity"."users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "identity"."users"("email");

-- CreateIndex
CREATE INDEX "idx_users_phone" ON "identity"."users"("phone");

-- CreateIndex
CREATE INDEX "idx_users_status" ON "identity"."users"("status");

-- CreateIndex
CREATE INDEX "idx_users_deleted_at" ON "identity"."users"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_identities_user_id" ON "identity"."identities"("user_id");

-- CreateIndex
CREATE INDEX "idx_identities_provider" ON "identity"."identities"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "identities_provider_subject_key" ON "identity"."identities"("provider", "provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "identities_user_provider_key" ON "identity"."identities"("user_id", "provider");

-- CreateIndex
CREATE INDEX "idx_organizations_owner_user_id" ON "identity"."organizations"("owner_user_id");

-- CreateIndex
CREATE INDEX "idx_organizations_type" ON "identity"."organizations"("type");

-- CreateIndex
CREATE INDEX "idx_organizations_status" ON "identity"."organizations"("status");

-- CreateIndex
CREATE INDEX "idx_organizations_deleted_at" ON "identity"."organizations"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_workspaces_organization_id" ON "identity"."workspaces"("organization_id");

-- CreateIndex
CREATE INDEX "idx_workspaces_deleted_at" ON "identity"."workspaces"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_org_memberships_user_id" ON "identity"."org_memberships"("user_id");

-- CreateIndex
CREATE INDEX "idx_org_memberships_role" ON "identity"."org_memberships"("role");

-- CreateIndex
CREATE INDEX "idx_org_memberships_status" ON "identity"."org_memberships"("status");

-- CreateIndex
CREATE UNIQUE INDEX "org_memberships_org_user_key" ON "identity"."org_memberships"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_workspace_memberships_user_id" ON "identity"."workspace_memberships"("user_id");

-- CreateIndex
CREATE INDEX "idx_workspace_memberships_role" ON "identity"."workspace_memberships"("role");

-- CreateIndex
CREATE INDEX "idx_workspace_memberships_status" ON "identity"."workspace_memberships"("status");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_memberships_ws_user_key" ON "identity"."workspace_memberships"("workspace_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_token_hash_key" ON "identity"."invitation"("token_hash");

-- CreateIndex
CREATE INDEX "idx_invitation_organization_id" ON "identity"."invitation"("organization_id");

-- CreateIndex
CREATE INDEX "idx_invitation_workspace_id" ON "identity"."invitation"("workspace_id");

-- CreateIndex
CREATE INDEX "idx_invitation_status" ON "identity"."invitation"("status");

-- CreateIndex
CREATE INDEX "idx_invitation_expires_at" ON "identity"."invitation"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_session_sid_key" ON "identity"."auth_session"("sid");

-- CreateIndex
CREATE INDEX "idx_auth_session_user_id" ON "identity"."auth_session"("user_id");

-- CreateIndex
CREATE INDEX "idx_auth_session_expires_at" ON "identity"."auth_session"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "identity"."refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "idx_refresh_token_user_id" ON "identity"."refresh_token"("user_id");

-- CreateIndex
CREATE INDEX "idx_refresh_token_session_id" ON "identity"."refresh_token"("session_id");

-- CreateIndex
CREATE INDEX "idx_refresh_token_expires_at" ON "identity"."refresh_token"("expires_at");

-- CreateIndex
CREATE INDEX "idx_user_verification_user_id" ON "identity"."user_verification"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_verification_target_expires" ON "identity"."user_verification"("target", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_token_token_hash_key" ON "identity"."password_reset_token"("token_hash");

-- CreateIndex
CREATE INDEX "idx_password_reset_token_user_id" ON "identity"."password_reset_token"("user_id");

-- CreateIndex
CREATE INDEX "idx_password_reset_token_expires_at" ON "identity"."password_reset_token"("expires_at");

-- CreateIndex
CREATE INDEX "idx_login_attempt_identifier_created" ON "identity"."login_attempt"("identifier", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_login_attempt_ip_created" ON "identity"."login_attempt"("ip_address", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_login_attempt_user_id" ON "identity"."login_attempt"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_provider_code_key" ON "identity"."oauth_provider"("code");

-- CreateIndex
CREATE INDEX "idx_oauth_provider_is_enabled" ON "identity"."oauth_provider"("is_enabled");

-- CreateIndex
CREATE INDEX "idx_oauth_provider_sort" ON "identity"."oauth_provider"("sort");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_state_state_key" ON "identity"."oauth_state"("state");

-- CreateIndex
CREATE INDEX "idx_oauth_state_expires_at" ON "identity"."oauth_state"("expires_at");

-- CreateIndex
CREATE INDEX "idx_oauth_state_provider_code" ON "identity"."oauth_state"("provider_code");

-- CreateIndex
CREATE INDEX "idx_audit_event_type_created" ON "identity"."audit_event"("event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_event_user_id" ON "identity"."audit_event"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_event_organization_id" ON "identity"."audit_event"("organization_id");

-- CreateIndex
CREATE INDEX "idx_role_scope" ON "iam"."role"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "role_scope_code_key" ON "iam"."role"("scope", "code");

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "iam"."permission"("code");

-- CreateIndex
CREATE INDEX "idx_role_permission_permission_id" ON "iam"."role_permission"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "oidc_client_client_id_key" ON "iam"."oidc_client"("client_id");

-- CreateIndex
CREATE INDEX "idx_oidc_client_realm" ON "iam"."oidc_client"("realm");

-- CreateIndex
CREATE INDEX "idx_oidc_client_is_enabled" ON "iam"."oidc_client"("is_enabled");

-- CreateIndex
CREATE INDEX "idx_signing_key_status" ON "iam"."signing_key"("status");

-- CreateIndex
CREATE UNIQUE INDEX "agent_code_key" ON "product"."agent"("agent_code");

-- CreateIndex
CREATE INDEX "idx_agents_agent_category" ON "product"."agent"("agent_category");

-- CreateIndex
CREATE INDEX "idx_agents_agent_code" ON "product"."agent"("agent_code");

-- CreateIndex
CREATE INDEX "idx_agents_created_by" ON "product"."agent"("created_by");

-- CreateIndex
CREATE INDEX "idx_agents_deleted_at" ON "product"."agent"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_agents_status" ON "product"."agent"("status");

-- CreateIndex
CREATE INDEX "idx_agents_visibility" ON "product"."agent"("visibility");

-- CreateIndex
CREATE INDEX "idx_paf_agent_id" ON "product"."agent_feature"("agent_id");

-- CreateIndex
CREATE INDEX "idx_paf_deleted_at" ON "product"."agent_feature"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_paf_feature_id" ON "product"."agent_feature"("feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_code_key" ON "product"."feature"("feature_code");

-- CreateIndex
CREATE INDEX "idx_features_deleted_at" ON "product"."feature"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_features_feature_code" ON "product"."feature"("feature_code");

-- CreateIndex
CREATE INDEX "idx_features_parent_code" ON "product"."feature"("parent_code");

-- CreateIndex
CREATE INDEX "idx_plans_application_id" ON "product"."plan"("application_id");

-- CreateIndex
CREATE INDEX "idx_plans_deleted_at" ON "product"."plan"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_plans_plan_code" ON "product"."plan"("plan_code");

-- CreateIndex
CREATE INDEX "idx_plans_status" ON "product"."plan"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_plan_application_code" ON "product"."plan"("application_id", "plan_code");

-- CreateIndex
CREATE UNIQUE INDEX "application_app_code_key" ON "product"."application"("app_code");

-- CreateIndex
CREATE INDEX "idx_application_app_code" ON "product"."application"("app_code");

-- CreateIndex
CREATE INDEX "idx_application_status" ON "product"."application"("status");

-- CreateIndex
CREATE INDEX "idx_application_deleted_at" ON "product"."application"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_ppa_agent_id" ON "product"."plan_agent"("agent_id");

-- CreateIndex
CREATE INDEX "idx_ppa_deleted_at" ON "product"."plan_agent"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_ppa_plan_id" ON "product"."plan_agent"("plan_id");

-- CreateIndex
CREATE INDEX "idx_ppf_deleted_at" ON "product"."plan_feature"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_ppf_feature_id" ON "product"."plan_feature"("feature_id");

-- CreateIndex
CREATE INDEX "idx_ppf_plan_id" ON "product"."plan_feature"("plan_id");

-- CreateIndex
CREATE INDEX "idx_plan_price_deleted" ON "product"."plan_price"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_plan_price_plan_id" ON "product"."plan_price"("plan_id");

-- CreateIndex
CREATE INDEX "idx_plan_price_status" ON "product"."plan_price"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uk_plan_price_period" ON "product"."plan_price"("plan_id", "period_type", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_bill_bill_no_key" ON "commerce"."tenant_invoice"("bill_no");

-- CreateIndex
CREATE INDEX "idx_ti_cycle" ON "commerce"."tenant_invoice"("bill_cycle");

-- CreateIndex
CREATE INDEX "idx_ti_invoice_no" ON "commerce"."tenant_invoice"("bill_no");

-- CreateIndex
CREATE INDEX "idx_ti_status" ON "commerce"."tenant_invoice"("bill_status");

-- CreateIndex
CREATE INDEX "idx_ti_deleted_at" ON "commerce"."tenant_invoice"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_ti_tenant_id" ON "commerce"."tenant_invoice"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tenant_bill_tenant_cycle" ON "commerce"."tenant_invoice"("tenant_id", "bill_cycle");

-- CreateIndex
CREATE INDEX "idx_tii_agent_id" ON "commerce"."tenant_invoice_item"("agent_id");

-- CreateIndex
CREATE INDEX "idx_tii_invoice_id" ON "commerce"."tenant_invoice_item"("bill_id");

-- CreateIndex
CREATE INDEX "idx_tii_deleted_at" ON "commerce"."tenant_invoice_item"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_tii_item_type" ON "commerce"."tenant_invoice_item"("item_type");

-- CreateIndex
CREATE INDEX "idx_tii_tenant_id" ON "commerce"."tenant_invoice_item"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_bill_invoice_invoice_no_key" ON "commerce"."tenant_invoice_receipt"("invoice_no");

-- CreateIndex
CREATE INDEX "idx_tbi_invoice_no" ON "commerce"."tenant_invoice_receipt"("invoice_no");

-- CreateIndex
CREATE INDEX "idx_tbi_invoice_status" ON "commerce"."tenant_invoice_receipt"("invoice_status");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_bill_payment_pay_order_no_key" ON "commerce"."tenant_payment"("pay_order_no");

-- CreateIndex
CREATE INDEX "idx_tp_invoice_id" ON "commerce"."tenant_payment"("bill_id");

-- CreateIndex
CREATE INDEX "idx_tp_pay_order_no" ON "commerce"."tenant_payment"("pay_order_no");

-- CreateIndex
CREATE INDEX "idx_tp_pay_status" ON "commerce"."tenant_payment"("pay_status");

-- CreateIndex
CREATE INDEX "idx_tp_tenant_id" ON "commerce"."tenant_payment"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_bill_refund_refund_no_key" ON "commerce"."tenant_refund"("refund_no");

-- CreateIndex
CREATE INDEX "idx_tr_audit_status" ON "commerce"."tenant_refund"("audit_status");

-- CreateIndex
CREATE INDEX "idx_tr_refund_no" ON "commerce"."tenant_refund"("refund_no");

-- CreateIndex
CREATE INDEX "idx_tr_tenant_id" ON "commerce"."tenant_refund"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_ts_deleted_at" ON "commerce"."tenant_subscription"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_ts_end_at" ON "commerce"."tenant_subscription"("end_at");

-- CreateIndex
CREATE INDEX "idx_ts_plan_id" ON "commerce"."tenant_subscription"("plan_id");

-- CreateIndex
CREATE INDEX "idx_ts_status" ON "commerce"."tenant_subscription"("status");

-- CreateIndex
CREATE INDEX "idx_ts_tenant_id" ON "commerce"."tenant_subscription"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_ts_tenant_application" ON "commerce"."tenant_subscription"("tenant_id", "application_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_bpc_plan_app" ON "commerce"."bundle_plan_component"("plan_id", "app_code") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_bpc_plan_id"  ON "commerce"."bundle_plan_component"("plan_id");
CREATE INDEX "idx_bpc_app_code" ON "commerce"."bundle_plan_component"("app_code");
CREATE INDEX "idx_bs_tenant_id" ON "commerce"."bundle_subscription"("tenant_id");
CREATE INDEX "idx_bs_plan_id"   ON "commerce"."bundle_subscription"("plan_id");
CREATE INDEX "idx_bs_status"    ON "commerce"."bundle_subscription"("status");
CREATE INDEX "idx_bsc_bundle_subscription_id" ON "commerce"."bundle_subscription_component"("bundle_subscription_id");
CREATE INDEX "idx_bsc_app_code" ON "commerce"."bundle_subscription_component"("app_code");

-- CreateIndex
CREATE INDEX "idx_tap_application_id" ON "commerce"."tenant_app_provisioning"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_tap_tenant_application" ON "commerce"."tenant_app_provisioning"("tenant_id", "application_id");

-- CreateIndex
CREATE INDEX "idx_awd_status_retry" ON "commerce"."app_webhook_delivery"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "idx_awd_tenant_application" ON "commerce"."app_webhook_delivery"("tenant_id", "application_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_tsq_subscription" ON "commerce"."tenant_subscription_quota"("subscription_id");

-- CreateIndex
CREATE INDEX "idx_tsq_tenant_id" ON "commerce"."tenant_subscription_quota"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tue_tenant_id" ON "commerce"."tenant_usage_event"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tue_agent_id" ON "commerce"."tenant_usage_event"("agent_id");

-- CreateIndex
CREATE INDEX "idx_tue_application_id" ON "commerce"."tenant_usage_event"("application_id");

-- CreateIndex
CREATE INDEX "idx_tue_application_type" ON "commerce"."tenant_usage_event"("application_type");

-- CreateIndex
CREATE INDEX "idx_tue_feature_id" ON "commerce"."tenant_usage_event"("feature_id");

-- CreateIndex
CREATE INDEX "idx_tue_cycle_date" ON "commerce"."tenant_usage_event"("cycle_date");

-- CreateIndex
CREATE INDEX "idx_tue_cycle_month" ON "commerce"."tenant_usage_event"("cycle_month");

-- CreateIndex
CREATE INDEX "idx_tue_tenant_month" ON "commerce"."tenant_usage_event"("tenant_id", "cycle_month");

-- CreateIndex
CREATE INDEX "idx_tus_tenant_id" ON "commerce"."tenant_usage_summary"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tus_agent_id" ON "commerce"."tenant_usage_summary"("agent_id");

-- CreateIndex
CREATE INDEX "idx_tus_feature_id" ON "commerce"."tenant_usage_summary"("feature_id");

-- CreateIndex
CREATE INDEX "idx_tus_cycle_month" ON "commerce"."tenant_usage_summary"("cycle_month");

-- CreateIndex
CREATE INDEX "idx_tus_stat_type" ON "commerce"."tenant_usage_summary"("stat_type");

-- CreateIndex
CREATE INDEX "idx_tus_tenant_month" ON "commerce"."tenant_usage_summary"("tenant_id", "cycle_month");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_usage_summary_unique" ON "commerce"."tenant_usage_summary"("tenant_id", "feature_id", "application_id", "application_type", "cycle_month", "stat_type");

-- CreateIndex
CREATE INDEX "idx_tscl_change_type" ON "commerce"."tenant_subscription_history"("change_type");

-- CreateIndex
CREATE INDEX "idx_tscl_created_at" ON "commerce"."tenant_subscription_history"("created_at");

-- CreateIndex
CREATE INDEX "idx_tscl_subscription_id" ON "commerce"."tenant_subscription_history"("subscription_id");

-- CreateIndex
CREATE INDEX "idx_tscl_tenant_id" ON "commerce"."tenant_subscription_history"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tsc_agent_id" ON "commerce"."tenant_subscription_override"("agent_id");

-- CreateIndex
CREATE INDEX "idx_tsc_deleted_at" ON "commerce"."tenant_subscription_override"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_tsc_feature_id" ON "commerce"."tenant_subscription_override"("feature_id");

-- CreateIndex
CREATE INDEX "idx_tsc_is_enabled" ON "commerce"."tenant_subscription_override"("is_enabled");

-- CreateIndex
CREATE INDEX "idx_tsc_tenant_id" ON "commerce"."tenant_subscription_override"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_sub_customs_tenant_id_agent_id_feature_id_key" ON "commerce"."tenant_subscription_override"("tenant_id", "agent_id", "feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_bill_transaction_transaction_no_key" ON "commerce"."tenant_transaction"("transaction_no");

-- CreateIndex
CREATE INDEX "idx_tt_tenant_id" ON "commerce"."tenant_transaction"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tt_trade_type" ON "commerce"."tenant_transaction"("trade_type");

-- CreateIndex
CREATE INDEX "idx_tt_transaction_no" ON "commerce"."tenant_transaction"("transaction_no");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_credit_tenant_id_key" ON "commerce"."tenant_credit"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tc_credit_tenant_id" ON "commerce"."tenant_credit"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tba_tenant_id" ON "commerce"."tenant_billing_address"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tpm_tenant_id" ON "commerce"."tenant_payment_method"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_tpm_status" ON "commerce"."tenant_payment_method"("status");

-- CreateIndex
CREATE UNIQUE INDEX "model_provider_code_key" ON "model"."provider"("provider_code");

-- CreateIndex
CREATE INDEX "idx_model_provider_is_active" ON "model"."provider"("is_active");

-- CreateIndex
CREATE INDEX "idx_model_provider_type" ON "model"."provider"("provider_type");

-- CreateIndex
CREATE UNIQUE INDEX "model_definition_code_key" ON "model"."model"("model_code");

-- CreateIndex
CREATE INDEX "idx_model_def_is_active" ON "model"."model"("is_active");

-- CreateIndex
CREATE INDEX "idx_model_def_type" ON "model"."model"("model_type");

-- CreateIndex
CREATE INDEX "idx_model_def_provider" ON "model"."model"("provider");

-- CreateIndex
CREATE INDEX "idx_model_def_provider_id" ON "model"."model"("provider_id");

-- CreateIndex
CREATE INDEX "idx_model_grant_application" ON "model"."model_grant"("application_id");

-- CreateIndex
CREATE INDEX "idx_model_grant_application_type" ON "model"."model_grant"("application_type");

-- CreateIndex
CREATE INDEX "idx_model_grant_agent" ON "model"."model_grant"("agent_id");

-- CreateIndex
CREATE INDEX "idx_model_grant_is_active" ON "model"."model_grant"("is_active");

-- CreateIndex
CREATE INDEX "idx_model_grant_model" ON "model"."model_grant"("model_id");

-- CreateIndex
CREATE INDEX "idx_model_grant_tenant" ON "model"."model_grant"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_model_price_effective" ON "model"."model_price_rule"("effective_at");

-- CreateIndex
CREATE INDEX "idx_model_price_is_active" ON "model"."model_price_rule"("is_active");

-- CreateIndex
CREATE INDEX "idx_model_price_model" ON "model"."model_price_rule"("model_id");

-- CreateIndex
CREATE INDEX "idx_model_policy_is_active" ON "model"."model_policy"("is_active");

-- CreateIndex
CREATE INDEX "idx_model_policy_model" ON "model"."model_policy"("model_id");

-- CreateIndex
CREATE INDEX "idx_model_policy_tenant" ON "model"."model_policy"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "model_policy_model_tenant_key" ON "model"."model_policy"("model_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_operator_account_username" ON "ops"."operator_account"("username");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_operator_account_email" ON "ops"."operator_account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_operator_account_phone" ON "ops"."operator_account"("phone");

-- CreateIndex
CREATE INDEX "idx_operator_account_role_id" ON "ops"."operator_account"("role_id");

-- CreateIndex
CREATE INDEX "idx_operator_account_status" ON "ops"."operator_account"("status");

-- CreateIndex
CREATE INDEX "idx_operator_account_deleted_at" ON "ops"."operator_account"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_operator_account_sort" ON "ops"."operator_account"("sort");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_operator_webauthn_credential_id" ON "ops"."operator_webauthn_credential"("credential_id");

-- CreateIndex
CREATE INDEX "idx_operator_webauthn_credential_operator_id" ON "ops"."operator_webauthn_credential"("operator_id");

-- CreateIndex
CREATE INDEX "idx_operator_recovery_code_operator_id" ON "ops"."operator_recovery_code"("operator_id");

-- CreateIndex
CREATE INDEX "idx_operator_verification_target_expires" ON "ops"."operator_verification"("target", "expires_at");

-- CreateIndex
CREATE INDEX "idx_operator_verification_operator_id" ON "ops"."operator_verification"("operator_id");

-- CreateIndex
CREATE INDEX "idx_operator_login_attempt_identifier_created" ON "ops"."operator_login_attempt"("identifier", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_operator_login_attempt_ip_created" ON "ops"."operator_login_attempt"("ip_address", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_operator_login_attempt_operator_id" ON "ops"."operator_login_attempt"("operator_id");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_operator_refresh_token_hash" ON "ops"."operator_refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "idx_operator_refresh_token_operator_id" ON "ops"."operator_refresh_token"("operator_id");

-- CreateIndex
CREATE INDEX "idx_operator_refresh_token_session_id" ON "ops"."operator_refresh_token"("session_id");

-- CreateIndex
CREATE INDEX "idx_operator_refresh_token_expires_at" ON "ops"."operator_refresh_token"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_operator_role_code" ON "ops"."operator_role"("role_code");

-- CreateIndex
CREATE INDEX "idx_operator_role_status" ON "ops"."operator_role"("status");

-- CreateIndex
CREATE INDEX "idx_operator_role_sort" ON "ops"."operator_role"("sort");

-- CreateIndex
CREATE UNIQUE INDEX "uidx_operator_permission_code" ON "ops"."operator_permission"("perm_code");

-- CreateIndex
CREATE INDEX "idx_operator_permission_parent_id" ON "ops"."operator_permission"("parent_id");

-- CreateIndex
CREATE INDEX "idx_operator_permission_type" ON "ops"."operator_permission"("perm_type");

-- CreateIndex
CREATE INDEX "idx_operator_permission_sort" ON "ops"."operator_permission"("sort");

-- CreateIndex
CREATE UNIQUE INDEX "uk_ops_setting_key" ON "ops"."setting"("config_key");

-- CreateIndex
CREATE INDEX "idx_ops_setting_group" ON "ops"."setting"("config_group");

-- CreateIndex
CREATE INDEX "idx_ops_governance_kind_status" ON "ops"."governance_record"("kind", "status");

-- CreateIndex
CREATE INDEX "idx_ops_governance_kind_updated" ON "ops"."governance_record"("kind", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ops_feature_flag_key_key" ON "ops"."feature_flag"("flag_key");

-- CreateIndex
CREATE INDEX "idx_ops_ff_category" ON "ops"."feature_flag"("category");

-- CreateIndex
CREATE INDEX "idx_ops_ff_environment" ON "ops"."feature_flag"("environment");

-- CreateIndex
CREATE INDEX "idx_ops_ann_publish_at" ON "ops"."announcement"("publish_at");

-- CreateIndex
CREATE INDEX "idx_ops_ann_status" ON "ops"."announcement"("status");

-- CreateIndex
CREATE INDEX "idx_ops_maint_start_at" ON "ops"."maintenance"("start_at");

-- CreateIndex
CREATE INDEX "idx_ops_maint_status" ON "ops"."maintenance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_support_ticket_no" ON "support"."ticket"("ticket_no");

-- CreateIndex
CREATE INDEX "idx_support_ticket_deleted_at" ON "support"."ticket"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_support_ticket_priority_updated" ON "support"."ticket"("priority", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_support_ticket_tenant_status" ON "support"."ticket"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "idx_support_ticket_event_ticket_created" ON "support"."ticket_event"("ticket_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_log_actor_id" ON "support"."audit_log"("actor_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_action" ON "support"."audit_log"("action");

-- CreateIndex
CREATE INDEX "idx_audit_log_created_at" ON "support"."audit_log"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_log_request_id" ON "support"."audit_log"("request_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_tenant_id" ON "support"."audit_log"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_notif_log_account_id" ON "support"."notification_log"("account_id");

-- CreateIndex
CREATE INDEX "idx_notif_log_channel" ON "support"."notification_log"("channel");

-- CreateIndex
CREATE INDEX "idx_notif_log_status" ON "support"."notification_log"("status");

-- CreateIndex
CREATE INDEX "idx_notif_log_tenant_id" ON "support"."notification_log"("tenant_id");

-- AddForeignKey
ALTER TABLE "identity"."user_avatar" ADD CONSTRAINT "user_avatar_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."user_credential" ADD CONSTRAINT "user_credential_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."identities" ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."organizations" ADD CONSTRAINT "organizations_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."workspaces" ADD CONSTRAINT "workspaces_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "identity"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."org_memberships" ADD CONSTRAINT "org_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "identity"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."org_memberships" ADD CONSTRAINT "org_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "identity"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."workspace_memberships" ADD CONSTRAINT "workspace_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."invitation" ADD CONSTRAINT "invitation_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "identity"."organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."invitation" ADD CONSTRAINT "invitation_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "identity"."workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "iam"."role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iam"."role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "iam"."permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product"."agent_feature" ADD CONSTRAINT "agent_feature_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "product"."agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product"."agent_feature" ADD CONSTRAINT "agent_feature_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "product"."feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product"."plan" ADD CONSTRAINT "plan_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "product"."application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product"."plan_agent" ADD CONSTRAINT "plan_agent_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "product"."plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product"."plan_agent" ADD CONSTRAINT "plan_agent_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "product"."agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product"."plan_feature" ADD CONSTRAINT "plan_feature_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "product"."plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product"."plan_feature" ADD CONSTRAINT "plan_feature_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "product"."feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product"."plan_price" ADD CONSTRAINT "plan_price_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "product"."plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."tenant_invoice_item" ADD CONSTRAINT "tenant_invoice_item_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "commerce"."tenant_invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."tenant_payment" ADD CONSTRAINT "tenant_payment_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "commerce"."tenant_invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."tenant_subscription_history" ADD CONSTRAINT "tenant_subscription_history_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "commerce"."tenant_subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model"."model" ADD CONSTRAINT "model_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "model"."provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model"."model_grant" ADD CONSTRAINT "model_grant_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "model"."model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model"."model_price_rule" ADD CONSTRAINT "model_price_rule_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "model"."model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model"."model_policy" ADD CONSTRAINT "model_policy_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "model"."model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."operator_account" ADD CONSTRAINT "operator_account_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "ops"."operator_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."operator_credential" ADD CONSTRAINT "operator_credential_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "ops"."operator_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."operator_mfa" ADD CONSTRAINT "operator_mfa_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "ops"."operator_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."operator_webauthn_credential" ADD CONSTRAINT "operator_webauthn_credential_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "ops"."operator_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."operator_recovery_code" ADD CONSTRAINT "operator_recovery_code_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "ops"."operator_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."operator_refresh_token" ADD CONSTRAINT "operator_refresh_token_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "ops"."operator_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."operator_permission" ADD CONSTRAINT "operator_permission_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ops"."operator_permission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."operator_role_permission" ADD CONSTRAINT "operator_role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "ops"."operator_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ops"."operator_role_permission" ADD CONSTRAINT "operator_role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "ops"."operator_permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support"."ticket_event" ADD CONSTRAINT "ticket_event_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support"."ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ═══════════════════════════════════════════════════════════════
-- PostgreSQL service roles + per-schema grants（折叠自原 0001_service_roles）
-- ═══════════════════════════════════════════════════════════════
-- Migration: 0001_service_roles
-- Create PostgreSQL service roles and grant per-schema access.
-- 注：tenant 域已退役（Identity Platform 重建）；org/workspace 表并入 identity schema，由 identity_svc 服务。
--
-- 密码管理：生产环境通过 Docker Secrets / K8s Secrets 注入。
--   部署前执行：ALTER ROLE identity_svc PASSWORD 'your-secret';
--   禁止将真实密码写入此文件或任何代码仓库。
--
-- 执行方式：pnpm --filter @vxture/core-database migrate:deploy
--   (使用 vxture 超级用户连接，此账号仅用于 migration，不用于应用)

-- ── 工具函数：幂等创建角色 ─────────────────────────────────────────────────

-- identity-service: identity + iam schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'identity_svc') THEN
    CREATE ROLE identity_svc LOGIN PASSWORD 'REPLACE_ME_identity_svc';
  END IF;
END
$$;

-- commerce-service: commerce schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'commerce_svc') THEN
    CREATE ROLE commerce_svc LOGIN PASSWORD 'REPLACE_ME_commerce_svc';
  END IF;
END
$$;

-- product-service: product schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'product_svc') THEN
    CREATE ROLE product_svc LOGIN PASSWORD 'REPLACE_ME_product_svc';
  END IF;
END
$$;

-- model-service: model schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'model_svc') THEN
    CREATE ROLE model_svc LOGIN PASSWORD 'REPLACE_ME_model_svc';
  END IF;
END
$$;

-- ops-service: ops schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ops_svc') THEN
    CREATE ROLE ops_svc LOGIN PASSWORD 'REPLACE_ME_ops_svc';
  END IF;
END
$$;

-- support-service: support schema
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'support_svc') THEN
    CREATE ROLE support_svc LOGIN PASSWORD 'REPLACE_ME_support_svc';
  END IF;
END
$$;

-- reporting_ro: admin-bff 跨 schema 报表只读
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'reporting_ro') THEN
    CREATE ROLE reporting_ro LOGIN PASSWORD 'REPLACE_ME_reporting_ro';
  END IF;
END
$$;

-- ── GRANT: identity-service ───────────────────────────────────────────────

GRANT USAGE ON SCHEMA identity, iam TO identity_svc;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA identity, iam TO identity_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO identity_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA iam
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO identity_svc;

-- ── GRANT: commerce-service ───────────────────────────────────────────────

GRANT USAGE ON SCHEMA commerce TO commerce_svc;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA commerce TO commerce_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA commerce
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO commerce_svc;

-- ── GRANT: product-service ────────────────────────────────────────────────

GRANT USAGE ON SCHEMA product TO product_svc;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA product TO product_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA product
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO product_svc;

-- ── GRANT: model-service ──────────────────────────────────────────────────

GRANT USAGE ON SCHEMA model TO model_svc;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA model TO model_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA model
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO model_svc;

-- ── GRANT: ops-service ────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA ops TO ops_svc;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA ops TO ops_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ops_svc;

-- ── GRANT: support-service ────────────────────────────────────────────────

GRANT USAGE ON SCHEMA support TO support_svc;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA support TO support_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA support
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO support_svc;

-- ── GRANT: reporting_ro（只读，所有 schema）────────────────────────────────

GRANT USAGE ON SCHEMA
  identity, iam, commerce, product, model, ops, support
  TO reporting_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA
  identity TO reporting_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA
  iam TO reporting_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA
  commerce TO reporting_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA
  product TO reporting_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA
  model TO reporting_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA
  ops TO reporting_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA
  support TO reporting_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity
  GRANT SELECT ON TABLES TO reporting_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA iam
  GRANT SELECT ON TABLES TO reporting_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA commerce
  GRANT SELECT ON TABLES TO reporting_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA product
  GRANT SELECT ON TABLES TO reporting_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA model
  GRANT SELECT ON TABLES TO reporting_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops
  GRANT SELECT ON TABLES TO reporting_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA support
  GRANT SELECT ON TABLES TO reporting_ro;
