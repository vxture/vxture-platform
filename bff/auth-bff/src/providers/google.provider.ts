/**
 * google.provider.ts - Google OAuth 2.0 / OIDC upstream broker
 * @package @vxture/bff-auth
 *
 * Inbound brokered IdP ("Sign in with Google"). Consumes Google as an upstream
 * provider via the #166 table-driven oauth.router (createProvider factory). Same
 * OAuthProvider shape as feishu/dingtalk; constructed (clientId, clientSecret).
 *
 * Google returns NO phone, so every new Google login must go through the phone
 * binding flow (B3 anchor) — the router resolves identity by verified phone, not
 * by Google's email (no email-based auto-merge). See
 * docs/design/identity-platform-account.md.
 */
import { OAuthProviderType } from "@vxture/core-auth";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
}

interface GoogleUserInfoResponse {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
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
  /** Provider-asserted email verification (Google email_verified). Gates
   * email-as-login-anchor; feishu/dingtalk have no signal → false. */
  emailVerified?: boolean;
  phone?: string;
  name: string;
  avatar?: string;
  raw: Record<string, unknown>;
}

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const SCOPE = "openid email profile";

export class GoogleProvider {
  readonly name = OAuthProviderType.GOOGLE;

  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  buildAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: SCOPE,
      state,
      access_type: "online",
      prompt: "select_account",
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Google token exchange failed: ${response.status} ${text}`,
      );
    }

    const data = (await response.json()) as GoogleTokenResponse;
    return {
      accessToken: data.access_token,
      ...(data.refresh_token !== undefined
        ? { refreshToken: data.refresh_token }
        : {}),
      expiresIn: data.expires_in ?? 3600,
    };
  }

  async getUserInfo(accessToken: string): Promise<OAuthUserProfileResponse> {
    const response = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Google userinfo failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as GoogleUserInfoResponse;
    // Diagnostic: log only presence, never values. Google never returns a phone,
    // so the router always routes new Google users through phone binding (B3).
    console.log(
      `[oauth google] userinfo hasEmail=${Boolean(data.email)} ` +
        `emailVerified=${Boolean(data.email_verified)} hasPhone=false`,
    );
    return {
      providerId: data.sub,
      provider: OAuthProviderType.GOOGLE,
      ...(data.email !== undefined ? { email: data.email } : {}),
      emailVerified: Boolean(data.email_verified),
      // No phone from Google → omitted, forcing phone binding (B3 anchor).
      name: data.name ?? data.email ?? data.sub,
      ...(data.picture !== undefined ? { avatar: data.picture } : {}),
      raw: data as unknown as Record<string, unknown>,
    };
  }
}
