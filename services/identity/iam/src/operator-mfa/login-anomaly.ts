/**
 * login-anomaly.ts — pure operator login anomaly detection.
 * @package @vxture/service-iam
 * @layer Domain
 *
 * Compares a successful operator login's context (ip / user-agent) against the
 * operator's prior successful logins to flag a new location ("异地" ≈ a
 * previously-unseen IP) or a new device (previously-unseen user-agent) — the
 * detection inputs come from admin.operator_login_attempt (operator-identity-
 * security.md §5). A first-ever login (no history) is never anomalous. Pure +
 * testable; the alert delivery (audit + email) is the caller's concern.
 */

export interface OperatorLoginHistory {
  /** Distinct IPs from prior successful logins. */
  knownIps: string[];
  /** Distinct user-agents from prior successful logins. */
  knownUserAgents: string[];
}

export interface OperatorLoginContext {
  ip?: string | undefined;
  userAgent?: string | undefined;
}

/** Anomaly reasons for a successful login; empty when nothing stands out. */
export function detectLoginAnomalies(
  history: OperatorLoginHistory,
  current: OperatorLoginContext,
): string[] {
  // No prior successful logins → first login, nothing to compare against.
  if (history.knownIps.length === 0 && history.knownUserAgents.length === 0) {
    return [];
  }
  const reasons: string[] = [];
  if (
    current.ip &&
    current.ip !== "unknown" &&
    !history.knownIps.includes(current.ip)
  ) {
    reasons.push("new_ip");
  }
  if (
    current.userAgent &&
    !history.knownUserAgents.includes(current.userAgent)
  ) {
    reasons.push("new_device");
  }
  return reasons;
}
