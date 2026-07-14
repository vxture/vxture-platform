/**
 * token-revocation.service.ts - Access token revocation store
 * @package @vxture/core-auth
 *
 * Redis key contract:
 *   {REDIS_KEY_PREFIX}blacklist:{jti}
 *   {REDIS_KEY_PREFIX}revoked-before:{customer|workforce}:{userId}
 */

import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import Redis from "ioredis";
import { JwtAuthScope, JwtUserType, type JwtAccessPayload } from "../types";
import {
  REDIS_REVOCATION_CONFIG,
  type RedisRevocationConfig,
} from "./redis-revocation-config";

export type AccessRevocationSurface = "customer" | "workforce";

export function buildAccessTokenBlacklistKey(
  prefix: string,
  jti: string,
): string {
  return `${prefix}blacklist:${jti}`;
}

export function buildSubjectRevokedBeforeKey(
  prefix: string,
  surface: AccessRevocationSurface,
  subject: string,
): string {
  return `${prefix}revoked-before:${surface}:${subject}`;
}

export function resolveAccessRevocationSurface(
  payload: Pick<JwtAccessPayload, "authScope" | "userType">,
): AccessRevocationSurface {
  if (
    payload.userType === JwtUserType.OPERATOR ||
    payload.authScope === JwtAuthScope.PLATFORM_ADMIN
  ) {
    return "workforce";
  }
  return "customer";
}

@Injectable()
export class AccessTokenRevocationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AccessTokenRevocationService.name);
  private client: Redis | null = null;
  private keyPrefix = "vx:";

  constructor(
    @Inject(REDIS_REVOCATION_CONFIG)
    private readonly redisConfig: RedisRevocationConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    const {
      REDIS_URL,
      REDIS_HOST,
      REDIS_PORT,
      REDIS_PASSWORD,
      REDIS_DB,
      REDIS_KEY_PREFIX,
    } = this.redisConfig;

    this.keyPrefix = REDIS_KEY_PREFIX ?? "vx:";
    this.client = REDIS_URL
      ? new Redis(REDIS_URL, { lazyConnect: true })
      : new Redis({
          host: REDIS_HOST ?? "localhost",
          port: REDIS_PORT ?? 6379,
          password: REDIS_PASSWORD,
          db: REDIS_DB,
          lazyConnect: true,
        });

    this.client.on("error", (err: Error) => {
      this.logger.warn(`Redis connection error: ${err.message}`);
    });

    try {
      await this.client.connect();
    } catch (err) {
      this.logger.error(`Redis initial connection failed: ${String(err)}`);
      throw new ServiceUnavailableException(
        "Token revocation store unavailable",
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch (err) {
      this.logger.warn(`Redis quit failed: ${String(err)}`);
    }
  }

  async isAccessTokenRevoked(jti: string): Promise<boolean> {
    const client = this.requireReadyClient();
    const key = buildAccessTokenBlacklistKey(this.keyPrefix, jti);

    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (err) {
      this.logger.error(`Access token revocation check failed: ${String(err)}`);
      throw new ServiceUnavailableException("Token revocation check failed");
    }
  }

  async getSubjectRevokedBefore(
    surface: AccessRevocationSurface,
    subject: string,
  ): Promise<number | null> {
    const client = this.requireReadyClient();
    const key = buildSubjectRevokedBeforeKey(this.keyPrefix, surface, subject);

    try {
      const value = await client.get(key);
      if (!value) return null;
      const timestamp = Number(value);
      return Number.isFinite(timestamp) ? timestamp : null;
    } catch (err) {
      this.logger.error(`Subject revocation check failed: ${String(err)}`);
      throw new ServiceUnavailableException("Token revocation check failed");
    }
  }

  async assertAccessTokenActive(
    payload: JwtAccessPayload,
    expectedSurface?: AccessRevocationSurface,
  ): Promise<void> {
    const jti = payload.jti?.trim();
    if (!jti) {
      throw new UnauthorizedException("Access token missing jti");
    }

    if (await this.isAccessTokenRevoked(jti)) {
      throw new UnauthorizedException("Access token has been revoked");
    }

    const surface = expectedSurface ?? resolveAccessRevocationSurface(payload);
    const revokedBefore = await this.getSubjectRevokedBefore(
      surface,
      payload.sub,
    );
    if (
      revokedBefore !== null &&
      (!payload.iat || payload.iat <= revokedBefore)
    ) {
      throw new UnauthorizedException("Access token has been revoked");
    }
  }

  private requireReadyClient(): Redis {
    if (!this.client || this.client.status !== "ready") {
      throw new ServiceUnavailableException(
        "Token revocation store unavailable",
      );
    }
    return this.client;
  }
}
