/**
 * refresh-token.repository.ts — opaque refresh tokens in session.refresh_tokens.
 *
 * docs/design/identity-platform-architecture.md §4: opaque refresh, server-stored, rotation,
 * replay detection. The raw token is never stored — only its SHA-256 hash. A
 * presented token whose status is not 'active' is a reuse/replay → the whole
 * session chain is revoked.
 */
import { Inject, Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import { TOKEN_PG_POOL } from "./tokens";

export interface RefreshRecord {
  id: string;
  userId: string;
  sessionId: string;
  clientId: string;
  status: string;
  expiresAt: Date;
}

export interface RefreshInsert {
  /** Subject id (tenant user id, or operator id for the operator store). */
  userId: string;
  sessionId: string;
  clientId: string;
  tokenHash: string;
  ttlSeconds: number;
  rotatedFrom?: string | null;
}

/**
 * Realm-agnostic opaque-refresh store. The tenant realm persists to
 * session.refresh_tokens; the operator realm to admin.operator_refresh_token —
 * hard-isolated, no cross-read (identity-platform-operator.md §1, §6). TokenService
 * routes by realm so operator refresh tokens never land in identity.*.
 */
export interface RefreshStore {
  insert(input: RefreshInsert): Promise<string>;
  findByHash(tokenHash: string): Promise<RefreshRecord | null>;
  markRotated(id: string): Promise<boolean>;
  revokeSession(sessionId: string): Promise<void>;
}

interface RefreshRow {
  id: string;
  user_id: string;
  session_id: string;
  client_id: string;
  status: string;
  expires_at: Date;
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

@Injectable()
export class RefreshTokenRepository implements RefreshStore {
  constructor(@Inject(TOKEN_PG_POOL) private readonly pool: Pool) {}

  /** Insert a new active refresh token (hash only); returns the row id. */
  async insert(input: RefreshInsert): Promise<string> {
    const r = await this.pool.query<{ id: string }>(
      `insert into session.refresh_tokens
         (user_id, session_id, client_id, token_hash, rotated_from, status, expires_at, created_at)
       values ($1, $2, $3, $4, $5, 'active', now() + ($6 || ' seconds')::interval, now())
       returning id`,
      [
        input.userId,
        input.sessionId,
        input.clientId,
        input.tokenHash,
        input.rotatedFrom ?? null,
        String(input.ttlSeconds),
      ],
    );
    return r.rows[0]!.id;
  }

  async findByHash(tokenHash: string): Promise<RefreshRecord | null> {
    const r = await this.pool.query<RefreshRow>(
      `select id, user_id, session_id, client_id, status, expires_at
         from session.refresh_tokens where token_hash = $1 limit 1`,
      [tokenHash],
    );
    const row = r.rows[0];
    return row
      ? {
          id: row.id,
          userId: row.user_id,
          sessionId: row.session_id,
          clientId: row.client_id,
          status: row.status,
          expiresAt: row.expires_at,
        }
      : null;
  }

  /** Mark a token rotated; returns true if it was active (false ⇒ concurrent/replay). */
  async markRotated(id: string): Promise<boolean> {
    const r = await this.pool.query(
      `update session.refresh_tokens set status = 'rotated'
        where id = $1 and status = 'active'`,
      [id],
    );
    return (r.rowCount ?? 0) > 0;
  }

  /** Revoke every still-live token for a session (replay response / logout). */
  async revokeSession(sessionId: string): Promise<void> {
    await this.pool.query(
      `update session.refresh_tokens set status = 'revoked'
        where session_id = $1 and status in ('active', 'rotated')`,
      [sessionId],
    );
  }

  static newRawToken(): string {
    return randomBytes(32).toString("hex");
  }
}
