-- 0006_user_no
-- Stable, human-readable public user number (design: identity-account-consolidation.md §3/§8).
-- A 10-digit sequential id starting at 1000010000, immutable, parallel to the uuid PK.
-- Seeds the default username (`_{user_no}`); never exposes the phone number.

CREATE SEQUENCE IF NOT EXISTS "identity"."user_no_seq" START WITH 1000010000 INCREMENT BY 1;

ALTER TABLE "identity"."users" ADD COLUMN "user_no" BIGINT;

-- Backfill existing users in creation order: 1000010000, 1000010001, ...
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM "identity"."users"
)
UPDATE "identity"."users" u
SET "user_no" = 1000009999 + o.rn
FROM ordered o
WHERE u.id = o.id;

-- Advance the sequence past the backfilled range so new users never collide.
-- count=0 -> setval(1000009999) -> first nextval = 1000010000.
SELECT setval(
  '"identity"."user_no_seq"',
  1000009999 + (SELECT count(*) FROM "identity"."users"),
  true
);

-- Default covers any insert path that omits user_no; createUser still reads
-- nextval explicitly so it can build the default username from it.
ALTER TABLE "identity"."users"
  ALTER COLUMN "user_no" SET DEFAULT nextval('"identity"."user_no_seq"');
ALTER TABLE "identity"."users" ALTER COLUMN "user_no" SET NOT NULL;
ALTER TABLE "identity"."users" ADD CONSTRAINT "users_user_no_key" UNIQUE ("user_no");
CREATE INDEX "idx_users_user_no" ON "identity"."users" ("user_no");
