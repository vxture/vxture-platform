/**
 * mail.service.ts - 事务邮件发送服务
 * @package @vxture/core-mail
 * @layer Infrastructure
 * @category Service
 *
 * @description
 *   封装 nodemailer，提供单一 send() 接口。
 *   SMTP 配置通过 MailModule.forRoot(config) 或 forRootAsync 注入。
 *   smtp 为 null 时进入 no-op 模式：send() 仅打印警告，不抛出异常。
 *
 * @author AI-Generated
 * @date 2026-05-03
 */

import { Injectable, Logger } from "@nestjs/common";
import nodemailer from "nodemailer";
import type { MailPayload, SmtpConfig } from "./mail.types";

// ============================================================================
// MailService
// ============================================================================

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: ReturnType<
    typeof nodemailer.createTransport
  > | null;
  private readonly from: string;

  constructor() {
    const smtp = resolveSmtpConfig();

    if (!smtp) {
      this.transporter = null;
      this.from = "";
      this.logger.warn(
        "SMTP 未配置，邮件服务以 no-op 模式运行，所有 send() 调用将被静默跳过",
      );
      return;
    }

    this.from = smtp.from;
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    this.logger.log(
      `邮件服务已初始化 [${smtp.host}:${smtp.port}，from: ${smtp.from}]`,
    );
  }

  // ============================================================================
  // 公共接口
  // ============================================================================

  /**
   * 发送一封事务邮件。
   * smtp 未配置时静默返回，不抛出异常。
   * 发送失败时抛出原始 Error，由调用方决定是否 swallow。
   */
  async send(payload: MailPayload): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `[no-op] 跳过发送邮件：subject="${payload.subject}" to="${[payload.to].flat().join(", ")}"`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    this.logger.log(
      `邮件已发送：subject="${payload.subject}" to="${[payload.to].flat().join(", ")}"`,
    );
  }
}

function resolveSmtpConfig(): SmtpConfig | null {
  const host = process.env["SMTP_HOST"];
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port: Number(process.env["SMTP_PORT"] ?? 465),
    secure: process.env["SMTP_SECURE"] !== "false",
    user,
    pass,
    from: process.env["SMTP_FROM"] ?? `Vxture Studio <no-reply@${host}>`,
  };
}
