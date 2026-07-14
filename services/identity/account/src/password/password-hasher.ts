/**
 * password-hasher.ts — Argon2id password hashing for the identity platform.
 *
 * docs/design/identity-platform-architecture.md §4: Argon2id 全量采用，无 bcrypt 债。
 * Pure-WASM (hash-wasm) — no native build, alpine-safe, matching the repo's
 * no-native-deps posture (the previous hashing lib, bcryptjs, is also pure-JS).
 *
 * Params (m=64MiB, t=3, p=1, 32-byte hash) match the seed-precomputed hash in
 *  deploy/database/prisma/seed-sample.mjs, so seeded credentials verify.
 * The PHC-encoded output is self-describing, so verify() works regardless of any
 * future param change.
 */

import { argon2id, argon2Verify } from "hash-wasm";

export const ARGON2ID_PARAMS = {
  parallelism: 1,
  iterations: 3,
  memorySize: 65536, // KiB = 64 MiB
  hashLength: 32,
} as const;

const SALT_BYTES = 16;

/** Hash a plaintext password, returning a PHC-encoded Argon2id string. */
export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new Error("hashPassword: password must be a non-empty string");
  }
  const salt = new Uint8Array(SALT_BYTES);
  globalThis.crypto.getRandomValues(salt);
  return argon2id({
    password: plain,
    salt,
    parallelism: ARGON2ID_PARAMS.parallelism,
    iterations: ARGON2ID_PARAMS.iterations,
    memorySize: ARGON2ID_PARAMS.memorySize,
    hashLength: ARGON2ID_PARAMS.hashLength,
    outputType: "encoded",
  });
}

/**
 * Verify a plaintext password against a PHC-encoded Argon2id hash.
 * Returns false (never throws) on malformed input so callers can treat it as a
 * failed login rather than a crash.
 */
export async function verifyPassword(
  plain: string,
  phc: string,
): Promise<boolean> {
  if (
    typeof plain !== "string" ||
    typeof phc !== "string" ||
    phc.length === 0
  ) {
    return false;
  }
  try {
    return await argon2Verify({ password: plain, hash: phc });
  } catch {
    return false;
  }
}

/**
 * Injectable wrapper for NestJS DI (module wiring lands in Task 2.2).
 * Thin pass-through so the rest of the service depends on an interface, not the lib.
 */
export class PasswordHasher {
  hash(plain: string): Promise<string> {
    return hashPassword(plain);
  }
  verify(plain: string, phc: string): Promise<boolean> {
    return verifyPassword(plain, phc);
  }
}
