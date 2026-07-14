import { describe, expect, it, vi } from "vitest";
import { TrialExpiryJob } from "./trial-expiry.job";
import type { SubscriptionService } from "@vxture/service-subscription";

// sweepIntervalMs itself is shared (sweep-interval.util.ts, used by both
// this job and sharing-expiry.job.ts) — its own tests live in
// sweep-interval.util.spec.ts, not duplicated here.

const jobWith = (sweepLapsedTrials: () => Promise<number>) =>
  new TrialExpiryJob({
    sweepLapsedTrials,
  } as unknown as SubscriptionService);

describe("TrialExpiryJob.tick", () => {
  it("runs one sweep pass per tick", async () => {
    const sweep = vi.fn().mockResolvedValue(0);
    const job = jobWith(sweep);
    await job.tick();
    await job.tick();
    expect(sweep).toHaveBeenCalledTimes(2);
  });

  it("skips a tick while a pass is still in flight (same-instance guard)", async () => {
    let release!: (n: number) => void;
    const gate = new Promise<number>((r) => (release = r));
    const sweep = vi.fn().mockImplementation(() => gate);
    const job = jobWith(sweep);

    const first = job.tick(); // holds the in-flight flag
    await job.tick(); // must no-op
    expect(sweep).toHaveBeenCalledTimes(1);

    release(0);
    await first;
    await job.tick(); // flag released → runs again
    expect(sweep).toHaveBeenCalledTimes(2);
  });

  it("survives a failing pass and keeps ticking", async () => {
    const sweep = vi
      .fn()
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce(0);
    const job = jobWith(sweep);
    await expect(job.tick()).resolves.toBeUndefined();
    await job.tick();
    expect(sweep).toHaveBeenCalledTimes(2);
  });
});
