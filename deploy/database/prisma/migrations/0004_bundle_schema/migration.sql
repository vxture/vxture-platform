-- Migration 0004: bundle subscription schema
--
-- Adds three tables that support the ops-configured bundle subscription model:
--
-- commerce.bundle_plan_component  — declares which component plans (and for which
--   app_code) make up a given bundle plan (product.plan with plan_type='bundle').
--   One row per (bundle_plan_id, app_code). Soft-deletable for ops flexibility.
--
-- commerce.bundle_subscription  — records a tenant's purchase of a bundle plan.
--   Status lifecycle mirrors tenant_subscription (active → cancelled).
--
-- commerce.bundle_subscription_component  — per-component disposition result from
--   BundlePurchaseService.fanOut(): 'added' | 'deferred' | 'bypassed' (Strategy A).
--   When disposition='added', tenant_subscription_id links the newly created row.

-- ── bundle_plan_component ─────────────────────────────────────────────────────

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

-- Unique: one component per app per bundle plan (enforced on non-deleted rows).
CREATE UNIQUE INDEX "uq_bpc_plan_app"
    ON "commerce"."bundle_plan_component" ("plan_id", "app_code")
    WHERE "deleted_at" IS NULL;

CREATE INDEX "idx_bpc_plan_id"   ON "commerce"."bundle_plan_component" ("plan_id");
CREATE INDEX "idx_bpc_app_code"  ON "commerce"."bundle_plan_component" ("app_code");

-- ── bundle_subscription ───────────────────────────────────────────────────────

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

CREATE INDEX "idx_bs_tenant_id"  ON "commerce"."bundle_subscription" ("tenant_id");
CREATE INDEX "idx_bs_plan_id"    ON "commerce"."bundle_subscription" ("plan_id");
CREATE INDEX "idx_bs_status"     ON "commerce"."bundle_subscription" ("status");

-- ── bundle_subscription_component ────────────────────────────────────────────

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

CREATE INDEX "idx_bsc_bundle_subscription_id"
    ON "commerce"."bundle_subscription_component" ("bundle_subscription_id");
CREATE INDEX "idx_bsc_app_code"
    ON "commerce"."bundle_subscription_component" ("app_code");
