/**
 * token.module.ts — the token authority module (RS256 access + opaque refresh).
 * Self-contained (own PG pool + OidcKeyService) so it wires independently; the
 * flat app.module consolidates duplicate providers in Task 4.4.
 */
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { VxConfigModule, VxConfigService } from "@vxture/core-config";
import { Pool } from "pg";
import { OidcKeyService } from "../oidc/oidc-key.service";
import { OperatorRefreshTokenRepository } from "./operator-refresh-token.repository";
import { RefreshTokenRepository } from "./refresh-token.repository";
import { TokenService } from "./token.service";
import { LoginAttemptRepository } from "./login-attempt.repository";
import {
  OPERATOR_REFRESH_TOKEN_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
  TOKEN_PG_POOL,
} from "./tokens";

@Module({
  imports: [
    VxConfigModule.register({ domains: ["database", "auth"] }),
    JwtModule.register({}),
  ],
  providers: [
    LoginAttemptRepository,
    OidcKeyService,
    {
      provide: TOKEN_PG_POOL,
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
    RefreshTokenRepository,
    { provide: REFRESH_TOKEN_REPOSITORY, useExisting: RefreshTokenRepository },
    OperatorRefreshTokenRepository,
    {
      provide: OPERATOR_REFRESH_TOKEN_REPOSITORY,
      useExisting: OperatorRefreshTokenRepository,
    },
    TokenService,
  ],
  exports: [
    TokenService,
    OidcKeyService,
    OperatorRefreshTokenRepository,
    LoginAttemptRepository,
  ],
})
export class TokenModule {}
