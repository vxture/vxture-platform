import { Module } from "@nestjs/common";
import { VxConfigModule, VxConfigService } from "@vxture/core-config";
import { Pool } from "pg";
import {
  MockOrganizationRepository,
  PgOrganizationRepository,
} from "../repository";
import { ActiveContextService } from "../service/active-context.service";
import { GovernanceService } from "../service/governance.service";
import { OrganizationService } from "../service/organization.service";
import { ORGANIZATION_REPOSITORY, ORG_PG_POOL } from "../tokens";

@Module({
  imports: [
    VxConfigModule.register({
      domains: ["database"],
    }),
  ],
  providers: [
    {
      provide: ORG_PG_POOL,
      inject: [VxConfigService],
      useFactory: (config: VxConfigService) => {
        const database = config.database;
        return new Pool(
          database.DATABASE_URL
            ? { connectionString: database.DATABASE_URL }
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
    PgOrganizationRepository,
    MockOrganizationRepository,
    {
      provide: ORGANIZATION_REPOSITORY,
      inject: [
        VxConfigService,
        PgOrganizationRepository,
        MockOrganizationRepository,
      ],
      useFactory: (
        config: VxConfigService,
        pgRepository: PgOrganizationRepository,
        mockRepository: MockOrganizationRepository,
      ) => {
        const database = config.database;
        const hasDatabaseConfig = Boolean(
          database.DATABASE_URL || database.DB_PASSWORD,
        );
        return hasDatabaseConfig ? pgRepository : mockRepository;
      },
    },
    OrganizationService,
    GovernanceService,
    ActiveContextService,
  ],
  exports: [OrganizationService, GovernanceService, ActiveContextService],
})
export class OrganizationModule {}
