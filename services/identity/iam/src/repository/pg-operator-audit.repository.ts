/**
 * pg-operator-audit.repository.ts — operator login telemetry + audit.
 * @package @vxture/service-iam
 * @layer Infrastructure
 *
 * Two append-only sinks for operator authentication events
 * (identity-platform-operator.md §5):
 *   - admin.operator_login_attempt — per-attempt risk/rate-limit telemetry; the
 *     operator_id is nullable so anonymous/bad-credential attempts are captured.
 *   - support.audit_logs (actor_type='operator') — actor-attributed audit trail
 *     (login/MFA events); actor_id is required, so only known-operator events are
 *     logged here. Both live in the same DB as ops.*, written via the shared pool.
 * Writes are best-effort: an audit failure must not break a successful login, so
 * callers wrap these in a guard.
 */
import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { IAM_PG_POOL } from "../tokens";

/** A single authentication attempt (first or second factor). */
export interface OperatorLoginAttemptInput {
  operatorId?: string | null;
  identifier: string;
  /** password | email_otp | phone_otp | totp | webauthn | recovery */
  authMethod: string;
  /** success | bad_credential | mfa_required | mfa_failed | locked */
  result: string;
  ipAddress: string;
  userAgent?: string | null;
}

/** An actor-attributed operator audit event. */
export interface OperatorAuditInput {
  operatorId: string;
  /** e.g. OperatorLogin | MfaVerify | MfaEnroll */
  action: string;
  /** success | failure */
  result: string;
  resourceId: string;
  errorCode?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class PgOperatorAuditRepository {
  constructor(@Inject(IAM_PG_POOL) private readonly pool: Pool) {}

  /** Append a login attempt to admin.operator_login_attempt (risk telemetry). */
  async recordLoginAttempt(input: OperatorLoginAttemptInput): Promise<void> {
    await this.pool.query(
      `insert into admin.operator_login_attempt
         (operator_id, identifier, auth_method, result, ip_address, user_agent, created_at)
       values ($1, $2, $3, $4, $5, $6, now())`,
      [
        input.operatorId ?? null,
        input.identifier.slice(0, 128),
        input.authMethod,
        input.result,
        input.ipAddress.slice(0, 64),
        input.userAgent ? input.userAgent.slice(0, 512) : null,
      ],
    );
  }

  /**
   * Distinct ip/user-agent from an operator's prior SUCCESSFUL logins (recent
   * window), for new-location / new-device anomaly detection.
   */
  async getOperatorLoginHistory(
    operatorId: string,
    windowDays = 180,
  ): Promise<{ knownIps: string[]; knownUserAgents: string[] }> {
    const r = await this.pool.query<{
      ip_address: string | null;
      user_agent: string | null;
    }>(
      `select distinct ip_address, user_agent
         from admin.operator_login_attempt
        where operator_id = $1
          and result = 'success'
          and created_at > now() - ($2 || ' days')::interval`,
      [operatorId, String(windowDays)],
    );
    const knownIps = new Set<string>();
    const knownUserAgents = new Set<string>();
    for (const row of r.rows) {
      if (row.ip_address) knownIps.add(row.ip_address);
      if (row.user_agent) knownUserAgents.add(row.user_agent);
    }
    return { knownIps: [...knownIps], knownUserAgents: [...knownUserAgents] };
  }

  /** Count an operator's recent failed attempts (failure-spike detection). */
  async countRecentOperatorFailures(
    operatorId: string,
    sinceSeconds: number,
  ): Promise<number> {
    const r = await this.pool.query<{ count: string }>(
      `select count(*)::int as count
         from admin.operator_login_attempt
        where operator_id = $1
          and result in ('bad_credential', 'mfa_failed', 'locked')
          and created_at > now() - ($2 || ' seconds')::interval`,
      [operatorId, String(sinceSeconds)],
    );
    return Number(r.rows[0]?.count ?? 0);
  }

  /** Append an actor-attributed event to support.audit_logs (actor_type=operator). */
  async recordAuditEvent(input: OperatorAuditInput): Promise<void> {
    await this.pool.query(
      `insert into support.audit_logs
         (actor_type, actor_id, action, result, resource_type, resource_id,
          error_code, after, ip_address, user_agent, created_at)
       values ('operator', $1, $2, $3, 'operator_account', $4, $5, $6, $7, $8, now())`,
      [
        input.operatorId,
        input.action,
        input.result,
        input.resourceId.slice(0, 128),
        input.errorCode ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        input.ipAddress ? input.ipAddress.slice(0, 64) : null,
        input.userAgent ? input.userAgent.slice(0, 512) : null,
      ],
    );
  }
}
