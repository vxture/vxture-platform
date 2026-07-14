/**
 * email-change.service.ts — stateless HMAC-token orchestration for the email
 * verify-current / change flows. Mirrors PhoneChangeService: no Redis, the OTP is
 * bound into a self-contained signed token. The token binds the target email AND
 * the purpose ("verify-current" | "change") so a code minted to verify the current
 * address can never be replayed to move the email to a new one, and vice versa.
 */
import { Inject, Injectable } from "@nestjs/common";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { MailService } from "@vxture/core-mail";

const EMAIL_OTP_TTL_MS = 5 * 60 * 1000;

export type EmailOtpPurpose = "verify-current" | "change";

@Injectable()
export class EmailChangeService {
  private readonly secret = randomBytes(32);

  constructor(@Inject(MailService) private readonly mail: MailService) {}

  private hmac(data: string): string {
    return createHmac("sha256", this.secret).update(data).digest("hex");
  }

  /**
   * Generate and email a 6-digit OTP to `email`. Returns a signed token binding
   * the OTP to user + email + purpose. For "change", `email` is the NEW address
   * (so confirming proves control of it); for "verify-current" it is the current one.
   */
  async sendCode(
    userId: string,
    email: string,
    purpose: EmailOtpPurpose,
  ): Promise<string> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const exp = Date.now() + EMAIL_OTP_TTL_MS;
    const codeHmac = this.hmac(`${userId}:${email}:${purpose}:${code}`);
    const payload = JSON.stringify({ userId, email, purpose, codeHmac, exp });
    const sig = this.hmac(payload);
    const token = Buffer.from(payload).toString("base64url") + "." + sig;

    const action =
      purpose === "change" ? "更换账号绑定邮箱" : "验证账号绑定邮箱";
    await this.mail.send({
      to: email,
      subject: "Vxture 邮箱验证码",
      html: `<p>您正在${action}。</p><p>验证码：<strong>${code}</strong></p><p>5 分钟内有效，请勿泄露给任何人。如非本人操作，请忽略此邮件。</p>`,
      text: `您正在${action}。\n\n验证码：${code}\n\n5 分钟内有效，请勿泄露给任何人。如非本人操作，请忽略此邮件。`,
    });

    return token;
  }

  /**
   * Verify an email OTP against the token from sendCode. Returns the bound email
   * on success (so the caller can use the new address for a change), null otherwise.
   */
  verifyCode(
    token: string,
    code: string,
    userId: string,
    purpose: EmailOtpPurpose,
  ): { email: string } | null {
    try {
      const dotIdx = token.lastIndexOf(".");
      if (dotIdx < 1) return null;
      const payloadB64 = token.slice(0, dotIdx);
      const sig = token.slice(dotIdx + 1);
      const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
      if (this.hmac(payload) !== sig) return null;
      const data = JSON.parse(payload) as {
        userId: string;
        email: string;
        purpose: EmailOtpPurpose;
        codeHmac: string;
        exp: number;
      };
      if (data.userId !== userId) return null;
      if (data.purpose !== purpose) return null;
      if (data.exp < Date.now()) return null;
      const expected = this.hmac(
        `${data.userId}:${data.email}:${data.purpose}:${code}`,
      );
      const ok = timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(data.codeHmac, "hex"),
      );
      return ok ? { email: data.email } : null;
    } catch {
      return null;
    }
  }
}
