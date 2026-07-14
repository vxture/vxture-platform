/**
 * feishu.provider.ts - 飞书 OAuth 2.0 提供方实现
 * @package @vxture/bff-auth
 *
 * 从 @vxture/bff-website 的 feishu.provider.ts 迁移而来。
 *
 * 环境变量：
 * - FEISHU_APP_ID
 * - FEISHU_APP_SECRET
 *
 * @author AI-Generated
 * @date 2026-05-07
 * @version 1.0
 */

import { OAuthProviderType } from "@vxture/core-auth";

// ============================================================================
// 类型
// ============================================================================

// New-style (OAuth 2.0 v3) token response is FLAT — no nested `data`, no `code`.
// Success carries access_token; failures carry error / error_description.
interface FeishuTokenResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

// 飞书 authen/v1/user_info 实际返回字段（扁平结构，非 OIDC）。
interface FeishuUserResponse {
  code: number;
  msg: string;
  data: {
    // 身份标识：union_id 跨应用稳定，open_id 应用内，user_id 企业内。
    union_id?: string;
    open_id?: string;
    user_id?: string;
    // 资料
    name?: string;
    en_name?: string;
    email?: string;
    mobile?: string;
    // 头像多尺寸（扁平字段）
    avatar_url?: string;
    avatar_thumb?: string;
    avatar_middle?: string;
    avatar_big?: string;
    tenant_key?: string;
  } | null;
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
  /** Feishu gives no email-verification signal → always false (display only). */
  emailVerified?: boolean;
  phone?: string;
  name: string;
  avatar?: string;
  raw: Record<string, unknown>;
}

// ============================================================================
// Feishu Provider
// ============================================================================

export class FeishuProvider {
  readonly name = "feishu";

  private readonly appId: string;
  private readonly appSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.appId = clientId;
    this.appSecret = clientSecret;
  }

  /**
   * 用授权码换取用户 access token
   * @see https://open.feishu.cn/document/common-capabilities/sso/api/authentication-code-flow
   */
  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch("https://accounts.feishu.cn/oauth/v3/token", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: this.appId,
        client_secret: this.appSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Feishu token exchange failed: ${response.status} ${text}`,
      );
    }

    const data = (await response.json()) as FeishuTokenResponse;
    if (!data.access_token) {
      throw new Error(
        `Feishu token exchange error: ${data.error ?? "unknown"} ${data.error_description ?? ""}`,
      );
    }

    return {
      accessToken: data.access_token,
      ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
      expiresIn: data.expires_in,
    };
  }

  /**
   * 用 access token 获取用户信息
   * @see https://open.feishu.cn/document/common-capabilities/sso/api/authentication-code-flow
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserProfileResponse> {
    const response = await fetch(
      "https://open.feishu.cn/open-apis/authen/v1/user_info",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Feishu userinfo failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as FeishuUserResponse;
    if (data.code !== 0 || !data.data) {
      throw new Error(`Feishu userinfo error: ${data.code} ${data.msg}`);
    }

    // 身份优先取跨应用稳定的 union_id（与 dingtalk providerId=unionId 约定一致）。
    const providerId =
      data.data.union_id ?? data.data.open_id ?? data.data.user_id;
    if (!providerId?.trim()) {
      throw new Error("Feishu userinfo missing provider id");
    }

    // Personal email only — enterprise_email is intentionally NOT read.
    const email = data.data.email;
    // 头像取最大可用尺寸。
    const avatar =
      data.data.avatar_big ??
      data.data.avatar_middle ??
      data.data.avatar_thumb ??
      data.data.avatar_url;
    // name 必填，保证非空：显示名 → 英文名 → 邮箱前缀 → 身份标识。
    const name =
      data.data.name ?? data.data.en_name ?? email?.split("@")[0] ?? providerId;
    const phone = data.data.mobile;

    // Diagnostic (P0 verification): log only whether mobile/email arrived,
    // never the values. Confirms the Feishu phone permission/scope is effective.
    console.log(
      `[oauth feishu] userinfo hasMobile=${Boolean(phone)} hasEmail=${Boolean(email)}`,
    );

    return {
      providerId,
      provider: OAuthProviderType.FEISHU,
      ...(email !== undefined ? { email } : {}),
      emailVerified: false,
      ...(phone !== undefined ? { phone } : {}),
      name,
      ...(avatar !== undefined ? { avatar } : {}),
      raw: data as unknown as Record<string, unknown>,
    };
  }

  /**
   * 构建飞书授权页面 URL
   */
  buildAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      response_type: "code",
      // New-style granular scopes (space-separated). Personal info only —
      // enterprise email is intentionally omitted. mobile needs
      // contact:user.phone:readonly, email needs contact:user.email:readonly;
      // both must be granted in the Feishu console.
      scope:
        "contact:user.base:readonly contact:user.email:readonly contact:user.phone:readonly contact:user.id:readonly",
      state,
    });
    // URLSearchParams encodes spaces as "+"; Feishu's authorize endpoint expects
    // "%20" per the docs, so normalize the scope separators.
    return `https://accounts.feishu.cn/open-apis/authen/v1/authorize?${params
      .toString()
      .replace(/\+/g, "%20")}`;
  }
}
