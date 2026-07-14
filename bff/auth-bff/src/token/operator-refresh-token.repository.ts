/**
 * operator-refresh-token.repository.ts — opaque refresh tokens for the operator
 * realm, persisted to admin.operator_refresh_token (NOT session.refresh_tokens).
 *
 * identity-platform-operator.md §1, §6: the operator plane (ops.*) is hard-isolated
 * from the tenant plane (identity / iam) — no FK, no cross-read. The IdP mints
 * operator refresh tokens just like tenant ones (opaque, server-stored hash,
 * rotation, replay detection), but they land in this table keyed by operator_id so
 * no operator data leaks into identity.*. Same contract as RefreshTokenRepository.
 */
import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import type {
  RefreshInsert,
  RefreshRecord,
  RefreshStore,
} from "./refresh-token.repository";
import { TOKEN_PG_POOL } from "./tokens";

interface OperatorRefreshRow {
  id: string;
  operator_id: string;
  session_id: string;
  client_id: string;
  status: string;
  expires_at: Date;
}

@Injectable()
export class OperatorRefreshTokenRepository implements RefreshStore {
  constructor(@Inject(TOKEN_PG_POOL) private readonly pool: Pool) {}

  /** Insert a new active operator refresh token (hash only); returns the row id. */
  async insert(input: RefreshInsert): Promise<string> {
    const r = await this.pool.query<{ id: string }>(
      `insert into admin.operator_refresh_token
         (operator_id, session_id, client_id, token_hash, rotated_from, status, expires_at, created_at)
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
    const r = await this.pool.query<OperatorRefreshRow>(
      `select id, operator_id, session_id, client_id, status, expires_at
         from admin.operator_refresh_token where token_hash = $1 limit 1`,
      [tokenHash],
    );
    const row = r.rows[0];
    return row
      ? {
          id: row.id,
          userId: row.operator_id,
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
      `update admin.operator_refresh_token set status = 'rotated'
        where id = $1 and status = 'active'`,
      [id],
    );
    return (r.rowCount ?? 0) > 0;
  }

  /** Revoke every still-live token for a session (replay response / logout). */
  async revokeSession(sessionId: string): Promise<void> {
    await this.pool.query(
      `update admin.operator_refresh_token set status = 'revoked'
        where session_id = $1 and status in ('active', 'rotated')`,
      [sessionId],
    );
  }

  /**
   * Revoke every still-live token for an operator (admin force-logout / disable).
   * Returns the number of tokens revoked. Short access-token TTL + this makes the
   * operator effectively logged out platform-wide.
   */
  async revokeAllForOperator(operatorId: string): Promise<number> {
    const r = await this.pool.query(
      `update admin.operator_refresh_token set status = 'revoked'
        where operator_id = $1 and status in ('active', 'rotated')`,
      [operatorId],
    );
    return r.rowCount ?? 0;
  }
}
