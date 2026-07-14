/**
 * webauthn-counter.ts — WebAuthn signature-counter clone/rollback guard.
 * @package @vxture/service-iam
 * @layer Domain
 *
 * A WebAuthn authenticator increments a per-credential signature counter on each
 * assertion. If a stored counter is non-zero and a later assertion presents a
 * counter that did not advance, the credential may have been cloned (or a replay
 * is in flight) — the assertion must be rejected (identity-platform-operator.md
 * §2.1, FIDO §6.1.1). Authenticators that always report 0 (many platform
 * passkeys) are exempt: a 0/0 pair is normal, not a regression. Pure + testable.
 */

/**
 * True when the presented counter indicates a clone/rollback and the assertion
 * must be rejected: only when the authenticator uses counters (stored > 0 OR
 * presented > 0) AND the presented counter did not strictly advance.
 */
export function isWebauthnCounterRegression(
  storedCounter: number,
  presentedCounter: number,
): boolean {
  if (storedCounter === 0 && presentedCounter === 0) return false;
  return presentedCounter <= storedCounter;
}
