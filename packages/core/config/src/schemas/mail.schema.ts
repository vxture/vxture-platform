/**
 * mail.schema.ts - SMTP mail configuration schema
 * @package @vxture/core-config
 * @description
 *   Zod schema for SMTP mail configuration.
 *   All fields are optional — omitting SMTP_HOST puts @vxture/core-mail in no-op mode.
 *   When SMTP_HOST is present, SMTP_USER and SMTP_PASS become required.
 */

import { z } from "zod";

// ============================================================================
// Mail Schema
// ============================================================================

export const mailSchema = z
  .object({
    /** SMTP server hostname. Omit to run MailService in no-op mode. */
    SMTP_HOST: z.string().min(1).optional(),
    /** SMTP port (default 465) */
    SMTP_PORT: z.coerce.number().int().positive().default(465),
    /** Use TLS (default true) */
    SMTP_SECURE: z.coerce.boolean().default(true),
    /** SMTP auth username */
    SMTP_USER: z.string().optional(),
    /** SMTP auth password */
    SMTP_PASS: z.string().optional(),
    /** Sender address, e.g. "Vxture <noreply@example.com>" */
    SMTP_FROM: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.SMTP_HOST) {
      if (!data.SMTP_USER) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SMTP_USER"],
          message: "SMTP_USER is required when SMTP_HOST is set",
        });
      }
      if (!data.SMTP_PASS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SMTP_PASS"],
          message: "SMTP_PASS is required when SMTP_HOST is set",
        });
      }
    }
  });

export type MailEnvConfig = z.infer<typeof mailSchema>;

/** Maps validated env vars to SmtpConfig shape expected by @vxture/core-mail */
export function toSmtpConfig(env: MailEnvConfig): {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
} | null {
  if (!env.SMTP_HOST) return null;
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER!,
    pass: env.SMTP_PASS!,
    from: env.SMTP_FROM ?? `Vxture <noreply@${env.SMTP_HOST}>`,
  };
}
