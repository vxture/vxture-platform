-- 0008_user_account_changed_at
-- Tracks when the username (account) was last changed, to enforce the
-- "at most once per 30 days" rule (console info spec §1.1). Nullable: NULL
-- means never changed since registration, so the first change is always
-- allowed. Additive.

ALTER TABLE "identity"."users" ADD COLUMN IF NOT EXISTS "account_changed_at" TIMESTAMPTZ(6);
