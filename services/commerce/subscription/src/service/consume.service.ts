import { Inject, Injectable } from "@nestjs/common";
import { PgConsumeRepository } from "../repository/pg-consume.repository";
import type { ConsumeInput, ConsumeResult } from "../types/consume.types";

/**
 * Usage consume service (§8.3) — the single writer of commerce usage. Product /
 * Model Platform call this and never write metering.usage_* directly.
 *
 * Model Platform's bounded fail-open (allow limited usage when commerce is briefly
 * unavailable) + async reconciliation live on the caller side; this service is the
 * strict, transactional writer (idempotent, total-order quota_pool waterfall).
 */
@Injectable()
export class ConsumeService {
  // Explicit token: bff bundles (esbuild) emit no decorator metadata, so an
  // implicit constructor type silently injects undefined (repo-wide pattern).
  constructor(
    @Inject(PgConsumeRepository) private readonly repo: PgConsumeRepository,
  ) {}

  consume(input: ConsumeInput): Promise<ConsumeResult> {
    return this.repo.consume(input);
  }
}
