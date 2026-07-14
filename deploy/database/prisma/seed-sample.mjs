/**
 * seed-sample.mjs — ② SAMPLE DATA seed (idempotent).
 *
 * Identity Platform rebuild; field-level authority docs/design/platform-data-architecture-schema.md +
 * docs/design/platform-data-architecture-schema.md §4 identity. Creates one end-to-end sample identity
 * matching the §13 acceptance shape (unified model: personal org auto-gets a
 * default workspace + owner membership at both levels):
 *   identity.users + user_credential
 *   identity.tenant (type=personal) + workspaces (default)
 *   identity.tenant_membership(owner) + workspace_memberships(owner)
 *
 * NOT for production by default (test data). Run directly:
 *   DATABASE_URL=... node seed-sample.mjs
 *
 * Depends on seed-catalog.mjs (governance roles) for role-code references, but
 * memberships store role codes inline, so the two seeds are independently runnable.
 */

import { runSeed, isMain, ID } from './seed-lib.mjs';

// Sample login identity: account/email/phone "zhangsan". Fake but complete.
// SECURITY: the password is NOT hardcoded here. Its Argon2id PHC hash must be
// supplied via SAMPLE_USER_PASSWORD_HASH (a runtime secret, projected from
// .env.auth-bff by 23-seed) so no public credential ever ships in the repo —
// safe to seed in production. Generate with the platform hasher (hash-wasm
// argon2id, m=65536 t=3 p=1, 32-byte) and store the hash in the runtime secret.
const SAMPLE = {
  account: 'zhangsan',
  email: 'zhangsan@vxture.dev',
  phone: '+8613800000000',
  name: 'Zhang San',
  // Only a real Argon2id PHC hash counts; CHANGEME / empty / malformed → skip.
  passwordHash: (process.env.SAMPLE_USER_PASSWORD_HASH || '').startsWith(
    '$argon2',
  )
    ? process.env.SAMPLE_USER_PASSWORD_HASH
    : null,
};

export async function seedSample(client) {
  // No credential configured → skip the sample user rather than seed a
  // login-broken / public-default account. Loud warning so misconfig is visible.
  if (!SAMPLE.passwordHash) {
    console.warn(
      '⚠  SAMPLE_USER_PASSWORD_HASH not set — skipping sample user (zhangsan). ' +
        'Set it (Argon2id PHC hash) in the runtime secret to seed it.',
    );
    return;
  }
  // ── 1. identity.users (phone = verified strong anchor; email may be unverified) ─
  await client.query(`
    insert into identity.users
      (id, account, email, email_verified_at, phone, phone_verified_at, status, created_at, updated_at)
    values ($1, $2, $3, now(), $4, now(), 'active', now(), now())
    on conflict (account) do nothing
  `, [ID.userZhangsan, SAMPLE.account, SAMPLE.email, SAMPLE.phone]);

  const userRes = await client.query(
    `select id from identity.users where account = $1 limit 1`, [SAMPLE.account]);
  const userId = userRes.rows[0]?.id ?? ID.userZhangsan;

  await client.query(`
    insert into identity.user_credential (user_id, password_hash, created_at, updated_at)
    values ($1, $2, now(), now()) on conflict (user_id) do nothing
  `, [userId, SAMPLE.passwordHash]);

  // display_name moved off users to the 1:1 user_profile (§4.1.2); points balance row (§6.2.1)
  await client.query(`
    insert into identity.user_profile (user_id, display_name, created_at, updated_at)
    values ($1, $2, now(), now()) on conflict (user_id) do nothing
  `, [userId, SAMPLE.name]);
  await client.query(`
    insert into identity.user_points (user_id, total_points, updated_at)
    values ($1, 0, now()) on conflict (user_id) do nothing
  `, [userId]);
  console.log('✓  identity.users + user_credential + user_profile + user_points — zhangsan');

  // ── 2. organizations (personal) ─────────────────────────────────────────────
  await client.query(`
    insert into identity.tenant (id, name, type, owner_user_id, status, created_at, updated_at)
    values ($1, $2, 'personal', $3, 'active', now(), now())
    on conflict (id) do nothing
  `, [ID.orgZhangsan, SAMPLE.name, userId]);

  // ── 3. workspaces (default) ─────────────────────────────────────────────────
  await client.query(`
    insert into identity.workspaces (id, tenant_id, name, is_default, created_at, updated_at)
    values ($1, $2, 'Default', true, now(), now())
    on conflict (id) do nothing
  `, [ID.workspaceZhangsan, ID.orgZhangsan]);

  // ── 4. memberships (owner at both levels) ───────────────────────────────────
  await client.query(`
    insert into identity.tenant_membership (id, tenant_id, user_id, role, status, created_at, updated_at)
    values ($1, $2, $3, 'owner', 'active', now(), now())
    on conflict (tenant_id, user_id) do nothing
  `, [ID.orgMemZhangsan, ID.orgZhangsan, userId]);
  await client.query(`
    insert into identity.workspace_memberships (id, workspace_id, user_id, role, status, created_at, updated_at)
    values ($1, $2, $3, 'owner', 'active', now(), now())
    on conflict (workspace_id, user_id) do nothing
  `, [ID.wsMemZhangsan, ID.workspaceZhangsan, userId]);
  console.log('✓  organizations(personal) + default workspace + owner memberships');
}

if (isMain(import.meta.url)) {
  runSeed('sample', seedSample);
}
