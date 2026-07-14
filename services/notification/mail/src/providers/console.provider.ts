/**
 * console.provider.ts - 开发环境控制台邮件驱动（fallback）
 * @package @vxture/service-mail
 * @layer Domain
 * @category Provider
 *
 * SMTP_PASS 未配置时自动启用，邮件内容打印到控制台，不发送真实邮件。
 *
 * @author AI-Generated
 * @date 2026-05-02
 * @version 1.0
 * @copyright Vxture Team
 */

import { Injectable } from "@nestjs/common";
import type { IMailProvider, MailMessage } from "../types/mail.types";

@Injectable()
export class ConsoleMailProvider implements IMailProvider {
  async send(message: MailMessage): Promise<void> {
    console.log(
      "[mail:dev] ─────────────────────────────────────",
      `\n  To      : ${message.to}`,
      `\n  Subject : ${message.subject}`,
      `\n  Body    : ${message.text}`,
      "\n─────────────────────────────────────────────────",
    );
  }
}
