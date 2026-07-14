/**
 * sms.module.ts - 短信服务 NestJS 模块
 * @package @vxture/service-sms
 * @description 注册阿里云号码认证服务（PNVS / Dypnsapi）短信验证码的发送与校验。
 *
 * 环境变量：
 *   ALIYUN_SMS_ACCESS_KEY_ID       - 阿里云 AccessKey ID（必填）
 *   ALIYUN_SMS_ACCESS_KEY_SECRET   - 阿里云 AccessKey Secret（必填）
 *   ALIYUN_SMS_SIGN_NAME           - 短信签名（必填，号码认证服务预置签名）
 *   ALIYUN_SMS_TEMPLATE_CODE       - 验证码模板 Code（必填，含 ${code} 变量）
 *   ALIYUN_SMS_SCHEME_NAME         - 方案名（可选，默认走默认方案）
 *   ALIYUN_SMS_CODE_LENGTH         - 验证码位数 4–8（可选，默认阿里云侧 4）
 *   ALIYUN_SMS_VALID_SECONDS       - 验证码有效期秒（可选，默认阿里云侧 300）
 *
 * 未配置上述凭据时降级为控制台输出 + 固定开发验证码（见 SmsService）。
 *
 * @author AI-Generated
 * @date 2026-06-29
 */

import { Module } from "@nestjs/common";
import { SmsService } from "../service/sms.service";
import { PhoneCodeService } from "../service/phone-code.service";

@Module({
  providers: [SmsService, PhoneCodeService],
  exports: [SmsService, PhoneCodeService],
})
export class SmsModule {}
