/**
 * pg-pool.provider.ts - website-bff 只读 PG 连接池
 * @package @vxture/bff-website
 *
 * website-bff 原本只经 service 包读账户/组织；product_320 §4.5 需读平台订阅态
 * （metering.subscriptions + product.*）驱动官网产品卡片，故补一个只读池。
 * 从 core-config 的 database 域构建；与 admin-bff 池工厂同款。
 */
import { Provider } from "@nestjs/common";
import { VxConfigService } from "@vxture/core-config";
import { Pool } from "pg";

export const WEBSITE_BFF_RO_POOL = "WEBSITE_BFF_RO_POOL";

export const websiteBffPoolProvider: Provider = {
  provide: WEBSITE_BFF_RO_POOL,
  inject: [VxConfigService],
  useFactory: (config: VxConfigService): Pool => {
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
};
