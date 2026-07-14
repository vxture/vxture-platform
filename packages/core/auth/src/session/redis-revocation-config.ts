/**
 * redis-revocation-config.ts - DI contract for Redis revocation store
 * @package @vxture/core-auth
 *
 * Consumers must provide REDIS_REVOCATION_CONFIG in their AppModule.
 * RedisConfig from @vxture/core-config satisfies RedisRevocationConfig
 * structurally — assign configService.redis directly.
 */

export interface RedisRevocationConfig {
  REDIS_URL?: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  REDIS_DB: number;
  REDIS_KEY_PREFIX: string;
}

export const REDIS_REVOCATION_CONFIG = Symbol("REDIS_REVOCATION_CONFIG");
