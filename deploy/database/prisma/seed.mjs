/**
 * seed.mjs — backward-compatible orchestrator for the split seed.
 *
 * Identity Platform rebuild (docs/design/identity-platform-architecture.md) splits the seed:
 *   ① seed-catalog.mjs — system catalog (governance RBAC, oidc_client, signing_key,
 *      + ported ops/product/model catalog). Safe for production.
 *   ② seed-sample.mjs   — sample data (test user + personal org + default workspace).
 *      Test data — NOT for production by default.
 *
 * This entrypoint runs ① then ② in one transaction, preserving the existing deploy
 * behavior (23-seed-platform-database.sh calls `node seed.mjs`). To seed catalog
 * only (e.g. production), run `node seed-catalog.mjs` directly; splitting the deploy
 * wiring (catalog-only in prod, +sample in dev) is a follow-up.
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
