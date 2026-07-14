/**
 * index.ts - @vxture/core-mail 公共导出入口
 * @package @vxture/core-mail
 * @layer Infrastructure
 *
 * @author AI-Generated
 * @date 2026-05-03
 */

export { MailModule, MAIL_SMTP_OPTIONS } from "./mail.module";
export { MailService } from "./mail.service";
export type {
  MailPayload,
  SmtpConfig,
  MailModuleAsyncOptions,
} from "./mail.types";
