-- 0007_user_profile_prefs
-- Personal profile preference fields (console info spec §1.1): bio / timezone /
-- language. Nullable, additive. Backs the profile editor whose bio/timezone/
-- language values were previously dropped on save because no backing column
-- existed (updateProfile only persisted name + email).

ALTER TABLE "identity"."users" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "identity"."users" ADD COLUMN IF NOT EXISTS "timezone" VARCHAR(64);
ALTER TABLE "identity"."users" ADD COLUMN IF NOT EXISTS "language" VARCHAR(16);
