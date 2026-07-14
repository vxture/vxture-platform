-- 0011_account_login_disabled
-- Lets a user disable username+password login while keeping other login paths
-- (phone code / email code / social) intact. Additive, NOT NULL with a false
-- default so existing rows keep account login enabled. Console personal-profile
-- account-security toggle (info spec §1.5).

ALTER TABLE "identity"."users"
  ADD COLUMN IF NOT EXISTS "account_login_disabled" BOOLEAN NOT NULL DEFAULT false;
