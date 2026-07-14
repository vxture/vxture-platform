/**
 * mail.module.ts - 邮件服务 NestJS 模块
 * @package @vxture/service-mail
 * @layer Domain
 * @category Module
 *
 * 启动逻辑：
 *   - SMTP_PASS 已配置 → SmtpMailProvider（生产）
 *   - SMTP_PASS 未配置 → ConsoleMailProvider（开发 fallback）
 *   - REDIS_URL / REDIS_HOST+REDIS_PORT → ioredis 客户端
 *
 * @author AI-Generated
 * @date 2026-05-02
 * @version 1.0
 * @copyright Vxture Team
 */

import { Module } from "@nestjs/common";
import Redis from "ioredis";
import { MAIL_PROVIDER, REDIS_CLIENT } from "../constants/tokens";
import { ConsoleMailProvider } from "../providers/console.provider";
import { SmtpMailProvider } from "../providers/smtp.provider";
import { MailService } from "../service/mail.service";
import { VerifyCodeService } from "../service/verifycode.service";

@Module({
  providers: [
    // ─── Redis 客户端 ──────────────────────────────────────────────────────
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const url = process.env["REDIS_URL"];
        if (url) {
          return new Redis(url);
        }
        return new Redis({
          host: process.env["REDIS_HOST"] ?? "localhost",
          port: Number(process.env["REDIS_PORT"] ?? 6379),
        });
      },
    },

    // ─── 邮件驱动：生产用 SMTP，开发用 Console ─────────────────────────────
    SmtpMailProvider,
    ConsoleMailProvider,
    {
      provide: MAIL_PROVIDER,
      inject: [SmtpMailProvider, ConsoleMailProvider],
      useFactory: (smtp: SmtpMailProvider, console: ConsoleMailProvider) => {
        return process.env["SMTP_PASS"] ? smtp : console;
      },
    },

    MailService,
    VerifyCodeService,
  ],
  exports: [MailService, VerifyCodeService],
})
export class MailModule {}
