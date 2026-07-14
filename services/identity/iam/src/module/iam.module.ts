import { Module } from "@nestjs/common";
import { VxConfigModule, VxConfigService } from "@vxture/core-config";
import { Pool } from "pg";
import {
  PgOAuthProviderRepository,
  PgOidcClientRepository,
  PgSigningKeyRepository,
  PgEntitlementRepository,
  PgOperatorRepository,
  PgOperatorAuditRepository,
} from "../repository";
import { IAM_PG_POOL } from "../tokens";

@Module({
  imports: [
    VxConfigModule.register({
      domains: ["database"],
    }),
  ],
  providers: [
    {
      provide: IAM_PG_POOL,
      inject: [VxConfigService],
      useFactory: (config: VxConfigService) => {
        const database = config.database;
        return new Pool(
          database.DATABASE_URL
            ? {
                connectionString: database.DATABASE_URL,
              }
            : {
                host: database.DB_HOST,
                port: database.DB_PORT,
                database: database.DB_NAME,
                user: database.DB_USER,
                password: database.DB_PASSWORD,
                max: database.DB_POOL_MAX,
                ssl:
                  database.DB_SSL === "require"
                    ? { rejectUnauthorized: false }
                    : undefined,
              },
        );
      },
    },
    PgOAuthProviderRepository,
    PgOidcClientRepository,
    PgSigningKeyRepository,
    PgEntitlementRepository,
    PgOperatorRepository,
    PgOperatorAuditRepository,
  ],
  exports: [
    PgOAuthProviderRepository,
    PgOidcClientRepository,
    PgSigningKeyRepository,
    PgEntitlementRepository,
    PgOperatorRepository,
    PgOperatorAuditRepository,
  ],
})
export class IamModule {}
