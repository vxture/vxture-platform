import { Module } from "@nestjs/common";
import { VxConfigModule, VxConfigService } from "@vxture/core-config";
import { Pool } from "pg";
import { COMMERCE_PG_POOL } from "../tokens";
import { PgPromotionRepository } from "../repository/pg-promotion.repository";
import { PromotionService } from "../service/promotion.service";

@Module({
  imports: [VxConfigModule.register({ domains: ["database"] })],
  providers: [
    {
      // Own pool, same token string as SubscriptionModule, deliberately NOT
      // exported (product_321 §5.1): two exported providers for one string
      // token would make consumer injection drift with module import order.
      // Two pools coexisting is the established pattern (BillingModule).
      provide: COMMERCE_PG_POOL,
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
    PgPromotionRepository,
    PromotionService,
  ],
  exports: [PromotionService],
})
export class PromotionModule {}
