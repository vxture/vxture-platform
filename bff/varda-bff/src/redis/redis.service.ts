/**
 * redis.service.ts - Redis 客户端封装（jti 黑名单）
 * @package @vxture/bff-varda
 * @layer Application
 * @category Service
 *
 * @description
 *   封装 ioredis 连接，提供 jti 黑名单查询。
 *
 *   黑名单键格式：{REDIS_KEY_PREFIX}jti:blacklist:{jti}
 *   写入方：其他服务（登出、token 吊销）调用 SET key 1 EX <ttl>。
 *   读取方：本服务在 auth.middleware.ts 中调用 isBlacklisted()。
 *
 *   容错策略（fail-open）：Redis 不可用时允许请求通过，
 *   同时输出 WARN 日志。优先保证服务可用性；
 *   如需 fail-closed，将 catch 块改为抛出 ServiceUnavailableException。
 *
 * @author AI-Generated
 * @date 2026-05-01
 */

import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { VxConfigService } from "@vxture/core-config";
import Redis from "ioredis";

// ============================================================================
// RedisService
// ============================================================================

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private keyPrefix!: string;

  constructor(
    @Inject(VxConfigService) private readonly config: VxConfigService,
  ) {}

  onModuleInit(): void {
    const {
      REDIS_URL,
      REDIS_HOST,
      REDIS_PORT,
      REDIS_PASSWORD,
      REDIS_DB,
      REDIS_KEY_PREFIX,
    } = this.config.redis;

    this.keyPrefix = REDIS_KEY_PREFIX ?? "vx:";

    this.client = REDIS_URL
      ? new Redis(REDIS_URL, { lazyConnect: true })
      : new Redis({
          host: REDIS_HOST,
          port: REDIS_PORT,
          password: REDIS_PASSWORD,
          db: REDIS_DB,
          lazyConnect: true,
        });

    this.client.on("error", (err: Error) => {
      this.logger.warn(`Redis connection error: ${err.message}`);
    });

    this.client.connect().catch((err: Error) => {
      this.logger.warn(
        `Redis initial connection failed: ${err.message} — jti checks will be skipped (fail-open)`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  /**
   * 检查 jti 是否在黑名单中。
   * Redis 不可用时返回 false（fail-open），并输出 WARN 日志。
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const key = `${this.keyPrefix}jti:blacklist:${jti}`;
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (err) {
      this.logger.warn(
        `jti blacklist check failed (fail-open): ${String(err)}`,
      );
      return false;
    }
  }
}
