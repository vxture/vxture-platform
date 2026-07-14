/**
 * phone-code.service.ts - 手机验证码编排
 * @package @vxture/service-sms
 * @description
 *   验证码的生成 / 存储 / 校验 / 频控全部托管给阿里云号码认证服务（见
 *   SmsService）。本服务只做薄编排，对外保持 sendCode / verifyCode 接口不变，
 *   供 auth-bff 的手机登录、注册、社交绑号复用。
 *
 *   频控由两道前置闸门 + 阿里云内置 Interval(默认 60s) 承担：调用方先过 Turnstile，
 *   再到阿里云 SendSmsVerifyCode 的同号频控；本层不再维护 Redis 计数器。
 *
 * @author AI-Generated
 * @date 2026-06-29
 */

import { Inject, Injectable } from "@nestjs/common";
import { SmsService } from "./sms.service";

/** 保留以兼容调用方签名；scope 已无 Redis 命名空间语义，仅作占位。 */
export interface PhoneCodeOptions {
  scope?: string;
}

@Injectable()
export class PhoneCodeService {
  constructor(@Inject(SmsService) private readonly smsService: SmsService) {}

  /**
   * 发送验证码到手机（阿里云生成验证码并管理有效期 / 频控）。
   * @param phone 手机号（国内裸 11 位）
   */
  async sendCode(
    phone: string,
    _options: PhoneCodeOptions = {},
  ): Promise<void> {
    await this.smsService.sendVerifyCode(normalizePhone(phone));
  }

  /**
   * 校验验证码（阿里云服务端校验）。
   * @param phone 手机号（与发码时一致）
   * @param code 用户输入的验证码
   * @returns 正确返回 true，否则 false
   */
  async verifyCode(
    phone: string,
    code: string,
    _options: PhoneCodeOptions = {},
  ): Promise<boolean> {
    return this.smsService.checkVerifyCode(normalizePhone(phone), code);
  }
}

// ─── 工具函数 ──────────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s+/g, "");
}
