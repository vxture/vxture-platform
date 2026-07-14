/**
 * login-attempt.repository.ts — customer-realm login audit trail
 * (session.login_attempts). Mirror of the operator realm's
 * admin.operator_login_attempt store (realm hard-isolation: separate tables,
 * no cross-read).
 *
 * Fix 2026-07-06: the table previously had READ paths only (admin roster
 * "last login" was permanently empty) — this adds the write side. Writes are
 * best-effort at the call site (a logging failure must never fail a login).
 */
import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { TOKEN_PG_POOL } from "./tokens";

export interface LoginAttemptInput {
  /** Resolved user id when known (null for failed lookups). */
  userId?: string | null | undefined;
  /** The identifier the caller attempted with (account/email/phone/provider). */
  identifier: string;
  /** password / phone / email / social provider code / refresh. */
  authMethod: string;
  /** success / bad_credentials / invalid_phone_code / email_not_registered / … (open set). */
  result: string;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
}

@Injectable()
export class LoginAttemptRepository {
  constructor(@Inject(TOKEN_PG_POOL) private readonly pool: Pool) {}

  async record(input: LoginAttemptInput): Promise<void> {
    await this.pool.query(
      `insert into session.login_attempts
         (user_id, identifier, auth_method, result, ip_address, user_agent, created_at)
       values ($1, $2, $3, $4, $5, $6, now())`,
      [
        input.userId ?? null,
        input.identifier.slice(0, 128),
        input.authMethod,
        input.result,
        (input.ipAddress ?? "unknown").slice(0, 64),
        input.userAgent?.slice(0, 512) ?? null,
      ],
    );
  }
}
