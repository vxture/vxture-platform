/**
 * mail.types.ts - 邮件发送参数类型
 * @package @vxture/core-mail
 * @layer Infrastructure
 * @category Types
 *
 * @author AI-Generated
 * @date 2026-05-03
 */

// ============================================================================
// 发送参数
// ============================================================================

export interface MailPayload {
  /** 收件人，单个地址或地址数组 */
  to: string | string[];
  /** 邮件主题 */
  subject: string;
  /** HTML 正文（优先显示） */
  html: string;
  /** 纯文本降级正文（可选） */
  text?: string;
}

// ============================================================================
// SMTP 配置（由消费方通过 MailModule.forRoot / forRootAsync 注入）
// ============================================================================

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

// ============================================================================
// 模块异步配置（用于 MailModule.forRootAsync）
// ============================================================================

export interface MailModuleAsyncOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inject?: any[];
  useFactory: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => SmtpConfig | null | Promise<SmtpConfig | null>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imports?: any[];
}
