/**
 * password-reset.repository.ts — one-time password-reset tokens in
 * session.password_reset_tokens.
 *
 * Email-link reset (D-BE=A): the raw token travels only in the emailed link;
 * the DB stores only its SHA-256 hash. A token is single-use (used_at) and
 * short-lived (expires_at, 15 min). Consume is a single atomic UPDATE so a
 * token cannot be replayed or raced.
 */
import { Inject, Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import { SESSION_PG_POOL } from "./tokens";

export function hashResetToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

@Injectable()
export class PasswordResetRepository {
  constructor(@Inject(SESSION_PG_POOL) private readonly pool: Pool) {}

  /** Issue a one-time reset token (stores only its SHA-256 hash); returns the raw token. */
  async issue(userId: string, ttlSeconds: number): Promise<string> {
    const raw = randomBytes(32).toString("hex");
    await this.pool.query(
      `insert into session.password_reset_tokens
         (user_id, token_hash, expires_at, created_at)
       values ($1, $2, now() + ($3 || ' seconds')::interval, now())`,
      [userId, hashResetToken(raw), String(ttlSeconds)],
    );
    return raw;
  }

  /**
   * Atomically consume a token: stamps used_at and returns the user_id only if the
   * token exists, is unused and unexpired. One-shot + race-safe; null otherwise.
   */
  async consume(rawToken: string): Promise<string | null> {
    const r = await this.pool.query<{ user_id: string }>(
      `update session.password_reset_tokens set used_at = now()
        where token_hash = $1 and used_at is null and expires_at > now()
        returning user_id`,
      [hashResetToken(rawToken)],
    );
    return r.rows[0]?.user_id ?? null;
  }
}
