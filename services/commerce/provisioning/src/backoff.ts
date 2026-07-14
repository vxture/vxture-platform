/**
 * backoff.ts - capped exponential retry backoff (P4)
 * @package @vxture/service-provisioning
 *
 * Pure (no jitter) so it is deterministically testable. `attempts` is the count
 * AFTER the failed try (>=1): attempt 1 → base, 2 → 2·base, ... capped at cap.
 */
export function backoffSeconds(
  attempts: number,
  baseSec: number,
  capSec: number,
): number {
  const n = Math.max(1, attempts);
  // 2 ** (n-1) can overflow to Infinity for large n; Math.min clamps it to cap.
  const raw = baseSec * 2 ** (n - 1);
  return Math.min(raw, capSec);
}
