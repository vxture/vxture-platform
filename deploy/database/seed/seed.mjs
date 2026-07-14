/**
 * seed.mjs — orchestrator for the split platform seed (raw `pg`, targets the 18-schema DDL).
 *
 * Splits:
 *   ① seed-catalog.mjs — system catalog (governance RBAC, operator realm, oidc_clients,
 *      signing_keys, product/model catalog, oauth_providers, loyalty/kyc config). Safe for production.
 *   ② seed-sample.mjs   — sample data (test user + personal tenant + default workspace).
 *      Test data — gated behind SAMPLE_USER_PASSWORD_HASH; NOT for production by default.
 *
 * Runs ① then ② in one transaction. To seed catalog only (e.g. production), run
 * `node seed-catalog.mjs` directly.
 *
 * Usage:  DATABASE_URL="postgresql://..." node seed.mjs
 */

import { runSeed } from './seed-lib.mjs';
import { seedCatalog } from './seed-catalog.mjs';
import { seedSample } from './seed-sample.mjs';

runSeed('all', async (client) => {
  await seedCatalog(client);
  await seedSample(client);
});
