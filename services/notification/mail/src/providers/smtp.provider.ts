/**
 * smtp.provider.ts - 阿里云 SMTP 邮件驱动
 * @package @vxture/service-mail
 * @layer Domain
 * @category Provider
 *
 * 通过环境变量配置 SMTP 连接（端口 465 + SSL），发送成功返回，失败抛出错误。
 * 重试逻辑由上层 MailService 负责。
 *
 * @author AI-Generated
 * @date 2026-05-02
 * @version 1.0
 * @copyright Vxture Team
 */

import { Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";
import type { IMailProvider, MailMessage } from "../types/mail.types";

// ─── 环境变量读取 ──────────────────────────────────────────────────────────────

const SMTP_HOST = process.env["SMTP_HOST"] ?? "smtpdm.aliyun.com";
const SMTP_PORT = Number(process.env["SMTP_PORT"] ?? 465);
const SMTP_USER = process.env["SMTP_USER"] ?? "no-reply@mail.vxture.com";
const SMTP_PASS = process.env["SMTP_PASS"] ?? "";
const SMTP_FROM =
  process.env["SMTP_FROM"] ?? '"vxture studio" <no-reply@mail.vxture.com>';

// ─── Provider ─────────────────────────────────────────────────────────────────

@Injectable()
export class SmtpMailProvider implements IMailProvider {
  private readonly transporter: ReturnType<typeof nodemailer.createTransport>;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true, // 端口 465 使用 SSL 直连
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: SMTP_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}
