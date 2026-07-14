-- 0009_organization_profile
-- Tenant (organization) profile, decoupled 1:1 from the core organizations row.
-- Carries display / contact / localization fields (console info spec §3.2/3.3/
-- §3.6). The logo is stored inline as bytea (small images), versioned by
-- logo_hash and served through the BFF. All fields nullable / additive.

CREATE TABLE IF NOT EXISTS "identity"."organization_profile" (
  "organization_id"      UUID PRIMARY KEY
    REFERENCES "identity"."organizations"("id") ON DELETE CASCADE,
  "logo_data"            BYTEA,
  "logo_content_type"    VARCHAR(32),
  "logo_hash"            VARCHAR(64),
  "description"          TEXT,
  "industry"             VARCHAR(64),
  "scale"                VARCHAR(32),
  "website"              VARCHAR(255),
  "contact_name"         VARCHAR(96),
  "contact_role"         VARCHAR(96),
  "contact_email"        VARCHAR(128),
  "contact_phone"        VARCHAR(32),
  "country_code"         VARCHAR(8),
  "address"              VARCHAR(255),
  "postal_code"          VARCHAR(16),
  "is_billing_recipient" BOOLEAN NOT NULL DEFAULT false,
  "timezone"             VARCHAR(64),
  "language"             VARCHAR(16),
  "currency"             VARCHAR(8),
  "created_at"           TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"           TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
