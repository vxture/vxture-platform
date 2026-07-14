/**
 * mail.module.ts - 邮件模块
 * @package @vxture/core-mail
 * @layer Infrastructure
 * @category Module
 *
 * @description
 *   静态 MailModule：no-op 模式（CI / 本地开发无需邮件服务）。
 *   MailModule.forRoot(smtp)：传入 SmtpConfig，初始化真实 transporter。
 *   MailModule.forRootAsync(options)：异步工厂，用于从 VxConfigService 等 DI 依赖中获取配置。
 *
 * @author AI-Generated
 * @date 2026-05-03
 */

import { Global, Module, DynamicModule } from "@nestjs/common";
import { MailService } from "./mail.service";
import type { SmtpConfig, MailModuleAsyncOptions } from "./mail.types";

export const MAIL_SMTP_OPTIONS = "MAIL_SMTP_OPTIONS";

@Global()
@Module({
  providers: [{ provide: MAIL_SMTP_OPTIONS, useValue: null }, MailService],
  exports: [MailService],
})
export class MailModule {
  /** 传入已验证的 SmtpConfig，启用真实邮件发送 */
  static forRoot(smtp: SmtpConfig): DynamicModule {
    return {
      module: MailModule,
      global: true,
      providers: [{ provide: MAIL_SMTP_OPTIONS, useValue: smtp }, MailService],
      exports: [MailService],
    };
  }

  /**
   * 异步工厂，从 DI 中获取 SMTP 配置
   *
   * @example
   * MailModule.forRootAsync({
   *   inject: [VxConfigService],
   *   useFactory: (cfg: VxConfigService) => cfg.smtp ?? null,
   * })
   */
  static forRootAsync(options: MailModuleAsyncOptions): DynamicModule {
    return {
      module: MailModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: MAIL_SMTP_OPTIONS,
          inject: options.inject ?? [],
          useFactory: options.useFactory,
        },
        MailService,
      ],
      exports: [MailService],
    };
  }
}
