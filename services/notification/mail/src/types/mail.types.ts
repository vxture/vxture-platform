/**
 * mail.types.ts - 邮件服务类型定义
 * @package @vxture/service-mail
 * @layer Domain
 * @category Types
 *
 * @author AI-Generated
 * @date 2026-05-02
 * @version 1.0
 * @copyright Vxture Team
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/** 邮件发送驱动统一接口，Smtp 和 Console 各自实现 */
export interface IMailProvider {
  send(message: MailMessage): Promise<void>;
}
