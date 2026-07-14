/**
 * phone-change.service.ts — stateless HMAC-token orchestration for phone-change flow.
 * No Redis: identity verification tokens are self-contained signed payloads.
 * The secret is ephemeral (resets on restart) — outstanding tokens expire naturally.
 */
import { Inject, Injectable } from "@nestjs/common";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { MailService } from "@vxture/core-mail";

const EMAIL_OTP_TTL_MS = 5 * 60 * 1000;
const IDENTITY_TOKEN_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class PhoneChangeService {
  private readonly secret = randomBytes(32);

  constructor(@Inject(MailService) private readonly mail: MailService) {}

  private hmac(data: string): string {
    return createHmac("sha256", this.secret).update(data).digest("hex");
  }

  /** Generate and email a 6-digit OTP. Returns a signed token that binds the OTP to the user+email. */
  async sendEmailOtp(userId: string, email: string): Promise<string> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const exp = Date.now() + EMAIL_OTP_TTL_MS;
    const codeHmac = this.hmac(`${userId}:${email}:${code}`);
    const payload = JSON.stringify({ userId, email, codeHmac, exp });
    const sig = this.hmac(payload);
    const token = Buffer.from(payload).toString("base64url") + "." + sig;

    await this.mail.send({
      to: email,
      subject: "Vxture 手机号变更验证码",
      html: `<p>您正在更换账号绑定手机号。</p><p>验证码：<strong>${code}</strong></p><p>5 分钟内有效，请勿泄露给任何人。如非本人操作，请忽略此邮件。</p>`,
      text: `您正在更换账号绑定手机号。\n\n验证码：${code}\n\n5 分钟内有效，请勿泄露给任何人。如非本人操作，请忽略此邮件。`,
    });

    return token;
  }

  /** Verify the email OTP code against the token returned by sendEmailOtp. */
  verifyEmailOtp(token: string, code: string, userId: string): boolean {
    try {
      const dotIdx = token.lastIndexOf(".");
      if (dotIdx < 1) return false;
      const payloadB64 = token.slice(0, dotIdx);
      const sig = token.slice(dotIdx + 1);
      const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
      if (this.hmac(payload) !== sig) return false;
      const data = JSON.parse(payload) as {
        userId: string;
        email: string;
        codeHmac: string;
        exp: number;
      };
      if (data.userId !== userId) return false;
      if (data.exp < Date.now()) return false;
      const expected = this.hmac(`${data.userId}:${data.email}:${code}`);
      return timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(data.codeHmac, "hex"),
      );
    } catch {
      return false;
    }
  }

  /** Issue a 10-minute identity-verified token after step-1 succeeds. */
  issueIdentityToken(userId: string, currentPhone: string): string {
    const exp = Date.now() + IDENTITY_TOKEN_TTL_MS;
    const payload = JSON.stringify({
      userId,
      currentPhone,
      exp,
      purpose: "phone-change",
    });
    const sig = this.hmac(payload);
    return Buffer.from(payload).toString("base64url") + "." + sig;
  }

  /** Validate a phone-change identity token. Returns current phone on success, null otherwise. */
  validateIdentityToken(
    token: string,
    userId: string,
  ): { currentPhone: string } | null {
    try {
      const dotIdx = token.lastIndexOf(".");
      if (dotIdx < 1) return null;
      const payloadB64 = token.slice(0, dotIdx);
      const sig = token.slice(dotIdx + 1);
      const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
      if (this.hmac(payload) !== sig) return null;
      const data = JSON.parse(payload) as {
        userId: string;
        currentPhone: string;
        exp: number;
        purpose: string;
      };
      if (data.userId !== userId) return null;
      if (data.purpose !== "phone-change") return null;
      if (data.exp < Date.now()) return null;
      return { currentPhone: data.currentPhone };
    } catch {
      return null;
    }
  }
}
