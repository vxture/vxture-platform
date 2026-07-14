/**
 * dingtalk.provider.ts - DingTalk OAuth 2.0 提供方实现
 * @package @vxture/bff-auth
 *
 * 从 @vxture/bff-website 的 dingtalk.provider.ts 迁移而来。
 * OAuth provider 只做 API 封装，不涉及 JWT 签发逻辑。
 *
 * 环境变量：
 * - DINGTALK_APP_KEY / DINGTALK_APP_SECRET （企业内部应用）
 * - DINGTALK_SUITE_KEY / DINGTALK_SUITE_SECRET （第三方企业应用，二选一）
 *
 * @author AI-Generated
 * @date 2026-05-07
 * @version 1.0
 */

import { OAuthProviderType } from "@vxture/core-auth";

// ============================================================================
// 类型
// ============================================================================

interface DingTalkTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expireIn: number;
  corpId?: string;
}

interface DingTalkUserResponse {
  unionId: string;
  openId: string;
  nick: string;
  avatarUrl?: string;
  email?: string;
  mobile?: string;
  stateCode?: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface OAuthUserProfileResponse {
  providerId: string;
  provider: OAuthProviderType;
  email?: string;
  /** DingTalk gives no email-verification signal → always false (display only). */
  emailVerified?: boolean;
  phone?: string;
  name: string;
  avatar?: string;
  raw: Record<string, unknown>;
}

// ============================================================================
// DingTalk Provider
// ============================================================================

export class DingtalkProvider {
  readonly name = "dingtalk";

  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async exchangeCode(code: string, _redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch(
      "https://api.dingtalk.com/v1.0/oauth2/userAccessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          code,
          grantType: "authorization_code",
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `DingTalk token exchange failed: ${response.status} ${text}`,
      );
    }

    const data = (await response.json()) as DingTalkTokenResponse;
    return {
      accessToken: data.accessToken,
      ...(data.refreshToken !== undefined
        ? { refreshToken: data.refreshToken }
        : {}),
      expiresIn: data.expireIn ?? 7200,
    };
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserProfileResponse> {
    const response = await fetch(
      "https://api.dingtalk.com/v1.0/contact/users/me",
      {
        headers: { "x-acs-dingtalk-access-token": accessToken },
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`DingTalk userinfo failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as DingTalkUserResponse;
    // Diagnostic (P0 verification): log only whether mobile/email arrived,
    // never the values. Confirms the DingTalk phone permission is effective.
    console.log(
      `[oauth dingtalk] userinfo hasMobile=${Boolean(data.mobile)} hasEmail=${Boolean(data.email)}`,
    );
    return {
      providerId: data.unionId,
      provider: OAuthProviderType.DINGTALK,
      ...(data.email !== undefined ? { email: data.email } : {}),
      emailVerified: false,
      ...(data.mobile !== undefined ? { phone: data.mobile } : {}),
      name: data.nick,
      ...(data.avatarUrl !== undefined ? { avatar: data.avatarUrl } : {}),
      raw: data as unknown as Record<string, unknown>,
    };
  }

  buildAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: "openid",
      prompt: "consent",
      state,
    });
    return `https://login.dingtalk.com/oauth2/auth?${params.toString()}`;
  }
}
