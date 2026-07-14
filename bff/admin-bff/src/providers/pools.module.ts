import { Module } from "@nestjs/common";
import { VxConfigModule, VxConfigService } from "@vxture/core-config";
import { Pool } from "pg";
import { ADMIN_BFF_RO_POOL, ADMIN_BFF_RW_POOL } from "../tokens";

function makePool(
  connectionString: string | undefined,
  config: VxConfigService["database"],
): Pool {
  if (connectionString) {
    return new Pool({ connectionString });
  }
  if (config.DATABASE_URL) {
    return new Pool({ connectionString: config.DATABASE_URL });
  }
  return new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    max: config.DB_POOL_MAX,
    ssl:
      config.DB_SSL === "require" ? { rejectUnauthorized: false } : undefined,
  });
}

@Module({
  imports: [VxConfigModule.register({ domains: ["database"] })],
  providers: [
    {
      provide: ADMIN_BFF_RW_POOL,
      inject: [VxConfigService],
      useFactory: (config: VxConfigService) =>
        makePool(undefined, config.database),
    },
    {
      provide: ADMIN_BFF_RO_POOL,
      inject: [VxConfigService],
      useFactory: (config: VxConfigService) =>
        makePool(config.database.REPORTING_RO_DATABASE_URL, config.database),
    },
  ],
  exports: [ADMIN_BFF_RO_POOL, ADMIN_BFF_RW_POOL],
})
export class AdminBffPoolsModule {}
