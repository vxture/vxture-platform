/**
 * redis.schema.ts - Redis configuration schema
 * @package @vxture/core-config
 * @description
 *   Zod schema for Redis configuration
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

import { z } from "zod";

// ============================================================================
// Redis Schema  (缓存 + BullMQ broker)
// ============================================================================

export const redisSchema = z.object({
  /** Redis connection URL, highest priority */
  REDIS_URL: z.string().url().startsWith("redis").optional(),

  /** Individual connection parameters */
  REDIS_HOST: z.string().min(1).default("localhost"),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),

  /** Default TTL (seconds), used for cache keys */
  REDIS_TTL: z.coerce.number().int().min(1).default(3600),

  /** Key prefix, for isolation when multiple tenants/apps share the same Redis */
  REDIS_KEY_PREFIX: z.string().default("vx:"),
});

export type RedisConfig = z.infer<typeof redisSchema>;
