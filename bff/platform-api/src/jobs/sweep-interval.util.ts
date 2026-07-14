/**
 * sweep-interval.util.ts — shared minute-cadence sweep interval clamp, used
 * by every minute-scale admin-bff sweep job (trial-expiry, sharing-expiry).
 * Floor 5s (guards against a misconfigured near-zero interval hammering the
 * DB), default 60s.
 *
 * `provisioning-dispatch.job.ts`'s `dispatchIntervalMs` is a genuinely
 * DIFFERENT clamp (1s floor / 10s default — a faster-cadence job) and stays
 * separate; only the two byte-identical 60s/5s sweeps share this one.
 */
export function sweepIntervalMs(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 5000 ? n : 60_000;
}
