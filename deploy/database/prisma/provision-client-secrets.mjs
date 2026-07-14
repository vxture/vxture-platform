#!/usr/bin/env node
/**
 * provision-client-secrets.mjs - generate confidential OIDC client secrets.
 * @package  @vxture/repo
 * @layer    Infrastructure
 * @category deployment-script
 * @author   AI-Generated
 * @date     2026-06-17
 *
 * For each client in CLIENTS (space-separated, e.g. "website console admin"),
 * generate a random secret and its bcrypt hash, and print one TSV line:
 *   <client>\t<secret>\t<hash>
 * The wrapper (scripts/27-provision-client-secrets.sh) writes the plaintext into
 * the RP runtime env (OIDC_CLIENT_SECRET in .env.<client>-bff) and the hash into
 * .env.auth-bff (OIDC_CLIENT_SECRET_HASH_<CLIENT>), which the seed projects into
 * iam.oidc_client.client_secret_hash. The IdP verifies presented secrets with
 * bcryptjs.compare (services/identity/iam pg-oidc-client.repository), so the hash
 * MUST be bcrypt. Secrets are generated here and never committed; idempotency
 * (skip already-provisioned clients) is the wrapper's responsibility.
 */
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// bcryptjs (pure JS, no native build) — same library the IdP verifies with.
const bcrypt = require("bcryptjs");

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || "10");
const clients = (process.env.CLIENTS || "").split(/\s+/u).filter(Boolean);

if (clients.length === 0) {
  process.stderr.write("CLIENTS env is empty — nothing to provision.\n");
  process.exit(1);
}

for (const client of clients) {
  // base64url: alphabet [A-Za-z0-9_-], no '$'/'='/quote → safe to write unquoted
  // into the RP env file and safe to bcrypt-compare verbatim.
  const secret = crypto.randomBytes(32).toString("base64url");
  const hash = bcrypt.hashSync(secret, BCRYPT_ROUNDS);
  process.stdout.write(`${client}\t${secret}\t${hash}\n`);
}
