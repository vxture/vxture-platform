/**
 * provisioning-dispatch.job.ts — interval driver for the provisioning webhook
 * dispatcher (product_310 P2.3; contract = identity-platform-rp-integration.md
 * §4–§6, engine = @vxture/service-provisioning).
 *
 * admin-bff is the designated host (the engine's own module comment): each
 * tick runs one dispatchPending() pass — recover expired leases, claim a
 * batch (SKIP LOCKED, multi-instance safe), deliver with HMAC signature +
 * retry/backoff/dead-letter. The in-flight guard only prevents same-instance
 * pile-up when a pass outlives the interval; cross-instance overlap is
 * already safe via the DB lease.
 *
 * PROVISION_DISPATCH_INTERVAL_MS tunes the cadence (default 10s; the value is
 * read once at class definition, matching the engine's own env-read pattern).
 */
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { ProvisioningService } from "@vxture/service-provisioning";

export function dispatchIntervalMs(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1000 ? n : 10_000;
}

@Injectable()
export class ProvisioningDispatchJob {
  private readonly logger = new Logger(ProvisioningDispatchJob.name);
  private inFlight = false;

  constructor(
    @Inject(ProvisioningService)
    private readonly provisioning: ProvisioningService,
  ) {}

  @Interval(dispatchIntervalMs(process.env.PROVISION_DISPATCH_INTERVAL_MS))
  async tick(): Promise<void> {
    if (this.inFlight) return;
    this.inFlight = true;
    try {
      await this.provisioning.dispatchPending();
    } catch (err) {
      // Never let a pass kill the interval; the next tick retries.
      this.logger.error(`dispatch pass failed: ${String(err)}`);
    } finally {
      this.inFlight = false;
    }
  }
}
