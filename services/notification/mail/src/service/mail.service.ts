/**
 * mail.service.ts - 邮件发送服务
 * @package @vxture/service-mail
 * @layer Domain
 * @category Service
 *
 * 封装发送逻辑：失败自动重试 1 次并记录日志，提供业务模板方法。
 *
 * @author AI-Generated
 * @date 2026-05-02
 * @version 1.0
 * @copyright Vxture Team
 */

import { Inject, Injectable } from "@nestjs/common";
import { MAIL_PROVIDER } from "../constants/tokens";
import type { IMailProvider, MailMessage } from "../types/mail.types";

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class MailService {
  constructor(
    @Inject(MAIL_PROVIDER)
    private readonly provider: IMailProvider,
  ) {}

  /** 发送邮件，失败后重试 1 次；两次均失败则抛出错误 */
  async send(message: MailMessage): Promise<void> {
    try {
      await this.provider.send(message);
    } catch (firstError) {
      console.error(
        "[mail] 首次发送失败，重试中...",
        firstError instanceof Error ? firstError.message : firstError,
      );
      try {
        await this.provider.send(message);
      } catch (retryError) {
        console.error(
          "[mail] 重试发送失败",
          retryError instanceof Error ? retryError.message : retryError,
        );
        throw retryError;
      }
    }
  }

  /** 发送邮箱验证码（简洁模板，防垃圾邮件） */
  async sendVerifyCode(to: string, code: string): Promise<void> {
    await this.send({
      to,
      subject: `您的 Vxture Studio 验证码是 ${code}`,
      text: `您的验证码是 ${code}，10分钟内有效，请勿泄露给他人。如非本人操作，请忽略此邮件。`,
    });
  }

  /**
   * 发送密码重置链接。expiresInMinutes 须与调用方实际 TTL 一致（customer 15
   * min / operator 30 min 各自不同，此前硬编码"15分钟"对 operator 调用方是
   * 错误文案——见 PR #609 安全评审），默认 15 保持向后兼容。
   */
  async sendPasswordReset(
    to: string,
    resetUrl: string,
    expiresInMinutes = 15,
  ): Promise<void> {
    await this.send({
      to,
      subject: "重置您的 Vxture Studio 密码",
      text: `您收到此邮件，是因为有人申请重置您的账号密码。\n\n请在 ${expiresInMinutes} 分钟内点击以下链接完成重置：\n\n${resetUrl}\n\n如非本人操作，请忽略此邮件，您的账号安全不受影响。`,
    });
  }
}
