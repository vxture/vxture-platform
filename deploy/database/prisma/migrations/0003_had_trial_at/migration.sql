-- Migration 0003: add had_trial_at to commerce.tenant_subscription
--
-- Records the timestamp when a tenant first activated a trial for a given
-- application. Written once via CAS (conditional update) when status=trial
-- and had_trial_at IS NULL; never overwritten afterwards.
-- Used to enforce the one-trial-per-tenant-per-app invariant in Phase C's
-- generic resolveAppScopeClaim resolver.

ALTER TABLE "commerce"."tenant_subscription"
  ADD COLUMN IF NOT EXISTS "had_trial_at" TIMESTAMPTZ(6);
