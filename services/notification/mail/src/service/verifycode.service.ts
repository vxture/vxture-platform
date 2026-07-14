/**
 * verifycode.service.ts - 邮箱验证码服务
 * @package @vxture/service-mail
 * @layer Domain
 * @category Service
 *
 * 功能：
 *   - 生成 6 位数字验证码，存入 Redis（TTL 10 分钟，一次性）
 *   - 限流：同一邮箱 1 分钟 ≤ 1 条 / 1 小时 ≤ 5 条 / 1 天 ≤ 10 条
 *   - 验证码核对正确后立即删除（防重放）
 *
 * Redis Key 规范：
 *   vc:code:{email}      验证码本体，TTL 600s
 *   vc:rl:1m:{email}     1 分钟计数器，TTL 60s
 *   vc:rl:1h:{email}     1 小时计数器，TTL 3600s
 *   vc:rl:1d:{email}     1 天计数器，TTL 86400s
 *
 * @author AI-Generated
 * @date 2026-05-02
 * @version 1.0
 * @copyright Vxture Team
 */

import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../constants/tokens";
import { MailService } from "./mail.service";

// ─── 常量 ──────────────────────────────────────────────────────────────────────

const CODE_TTL = 600; // 验证码有效期，秒
const RL_1M_LIMIT = 1; // 每分钟上限
const RL_1H_LIMIT = 5; // 每小时上限
const RL_1D_LIMIT = 10; // 每天上限

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class VerifyCodeService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(MailService) private readonly mailService: MailService,
  ) {}

  // ─── 公开接口 ─────────────────────────────────────────────────────────────

  /** 发送验证码；若命中限流则抛出 429 */
  async sendCode(email: string): Promise<void> {
    const key = email.trim().toLowerCase();

    await this.checkRateLimits(key);

    const code = this.generateCode();
    await this.redis.set(`vc:code:${key}`, code, "EX", CODE_TTL);

    await this.mailService.sendVerifyCode(email, code);

    await this.incrementCounters(key);
  }

  /** 验证验证码；正确返回 true 并销毁，否则返回 false */
  async verifyCode(email: string, code: string): Promise<boolean> {
    const key = email.trim().toLowerCase();
    const stored = await this.redis.get(`vc:code:${key}`);

    if (!stored) {
      return false;
    }

    if (stored !== code.trim()) {
      return false;
    }

    // 验证通过，立即删除（一次性）
    await this.redis.del(`vc:code:${key}`);
    return true;
  }

  // ─── 私有方法 ─────────────────────────────────────────────────────────────

  private generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private async checkRateLimits(key: string): Promise<void> {
    const [per1m, per1h, per1d] = await Promise.all([
      this.redis.get(`vc:rl:1m:${key}`),
      this.redis.get(`vc:rl:1h:${key}`),
      this.redis.get(`vc:rl:1d:${key}`),
    ]);

    if (Number(per1m ?? 0) >= RL_1M_LIMIT) {
      throw new HttpException(
        "操作过于频繁，请 1 分钟后再试",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (Number(per1h ?? 0) >= RL_1H_LIMIT) {
      throw new HttpException(
        "1 小时内发送次数已达上限，请稍后再试",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (Number(per1d ?? 0) >= RL_1D_LIMIT) {
      throw new HttpException(
        "今日验证码发送次数已达上限",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** 仅在发送成功后计数，避免把发送失败也算入限流 */
  private async incrementCounters(key: string): Promise<void> {
    await Promise.all([
      this.incrWithTtl(`vc:rl:1m:${key}`, 60),
      this.incrWithTtl(`vc:rl:1h:${key}`, 3600),
      this.incrWithTtl(`vc:rl:1d:${key}`, 86400),
    ]);
  }

  /** INCR + 仅在第一次自增时设置 TTL（保证窗口从首次发送开始计算） */
  private async incrWithTtl(
    redisKey: string,
    ttlSeconds: number,
  ): Promise<void> {
    const count = await this.redis.incr(redisKey);
    if (count === 1) {
      await this.redis.expire(redisKey, ttlSeconds);
    }
  }
}
