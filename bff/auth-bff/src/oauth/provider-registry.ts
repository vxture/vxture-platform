/**
 * provider-registry.ts — table-driven OAuth upstream-provider factory.
 * @package @vxture/bff-auth
 *
 * Resolves an inbound-broker provider by code from identity.oauth_provider
 * (creds + endpoints, table-driven per #166) and instantiates the matching
 * adapter. The adapters (google/feishu/dingtalk) share one structural shape:
 * buildAuthorizationUrl(redirectUri, state) + exchangeCode + getUserInfo.
 * See docs/design/identity-platform-account.md §3.
 */
import { Inject, Injectable } from "@nestjs/common";
import {
  PgOAuthProviderRepository,
  type OAuthProviderConfig,
} from "@vxture/service-iam";
import { DingtalkProvider } from "../providers/dingtalk.provider";
import { FeishuProvider } from "../providers/feishu.provider";
import { GoogleProvider } from "../providers/google.provider";

/** Standardized upstream profile (provider-API differences masked by the adapter). */
export interface BrokeredProfile {
  providerId: string;
  email?: string;
  /** Provider-asserted email verification (Google true; feishu/dingtalk false). */
  emailVerified?: boolean;
  phone?: string;
  name: string;
  avatar?: string;
  raw: Record<string, unknown>;
}

/** Structural shape shared by the google/feishu/dingtalk adapters. */
export interface BrokeredProvider {
  buildAuthorizationUrl(redirectUri: string, state: string): string;
  exchangeCode(
    code: string,
    redirectUri: string,
  ): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }>;
  getUserInfo(accessToken: string): Promise<BrokeredProfile>;
}

export interface ResolvedProvider {
  provider: BrokeredProvider;
  config: OAuthProviderConfig;
}

/** Instantiate the adapter for a provider code (pure; null for unknown codes). */
export function createProvider(
  code: string,
  clientId: string,
  clientSecret: string,
): BrokeredProvider | null {
  switch (code) {
    case "google":
      return new GoogleProvider(clientId, clientSecret);
    case "feishu":
      return new FeishuProvider(clientId, clientSecret);
    case "dingtalk":
      return new DingtalkProvider(clientId, clientSecret);
    default:
      return null;
  }
}

@Injectable()
export class OAuthProviderRegistry {
  constructor(
    @Inject(PgOAuthProviderRepository)
    private readonly providers: PgOAuthProviderRepository,
  ) {}

  /**
   * Resolve an enabled provider by code: reads its config (creds + redirect_uri)
   * and instantiates the adapter. Returns null when the provider is unknown,
   * disabled, or missing credentials.
   */
  async resolve(code: string): Promise<ResolvedProvider | null> {
    const config = await this.providers.findEnabledByCode(code);
    if (!config || !config.clientId || !config.clientSecret) return null;
    const provider = createProvider(
      config.code,
      config.clientId,
      config.clientSecret,
    );
    return provider ? { provider, config } : null;
  }

  /** Enabled providers for the login surface (code + display name). */
  listEnabled(): Promise<OAuthProviderConfig[]> {
    return this.providers.listEnabled();
  }
}
