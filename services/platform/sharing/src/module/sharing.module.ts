import { Module } from "@nestjs/common";
import { VxConfigModule, VxConfigService } from "@vxture/core-config";
import { ProvisioningModule } from "@vxture/service-provisioning";
import { Pool } from "pg";
import { SHARING_CONFIG, SHARING_PG_POOL } from "../tokens";
import { PgSharingRepository } from "../repository/pg-sharing.repository";
import { SharingService } from "../service/sharing.service";
import type { SharingConfig } from "../types/sharing.types";

const num = (v: string | undefined, d: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

@Module({
  // ProvisioningModule: grant.invalidated rides the provisioning delivery
  // queue (data_sharing_100 §1 — same infra, new event producer).
  imports: [
    VxConfigModule.register({ domains: ["database"] }),
    ProvisioningModule,
  ],
  providers: [
    {
      provide: SHARING_PG_POOL,
      inject: [VxConfigService],
      useFactory: (config: VxConfigService) => {
        const db = config.database;
        return new Pool(
          db.DATABASE_URL
            ? { connectionString: db.DATABASE_URL }
            : {
                host: db.DB_HOST,
                port: db.DB_PORT,
                database: db.DB_NAME,
                user: db.DB_USER,
                password: db.DB_PASSWORD,
                max: db.DB_POOL_MAX,
                ssl:
                  db.DB_SSL === "require"
                    ? { rejectUnauthorized: false }
                    : undefined,
              },
        );
      },
    },
    {
      provide: SHARING_CONFIG,
      useFactory: (): SharingConfig => ({
        // D2 short-TTL contract (30–60s); server-side anchor uses the low end.
        ttlSeconds: num(process.env.SHARING_VISIBLE_SET_TTL_SECONDS, 30),
        sweepBatch: num(process.env.SHARING_EXPIRY_SWEEP_BATCH, 100),
      }),
    },
    PgSharingRepository,
    SharingService,
  ],
  exports: [SharingService],
})
export class SharingModule {}
