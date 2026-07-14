/**
 * pg-oauth-provider.repository.ts - identity.oauth_providers 表驱动配置仓储
 * @package @vxture/service-iam
 * @layer Infrastructure
 * @category repository
 *
 * 提供 OAuth provider 的运行时配置（client 凭证 / 端点 / 开关），供 auth-bff
 * 按 code 动态解析，替代 BFF 中的硬编码与 env。配置只读，secret 不外泄出本层。
 */
import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { IAM_PG_POOL } from "../tokens";

export interface OAuthProviderConfig {
  code: string;
  name: string;
  clientId: string | null;
  clientSecret: string | null;
  scope: string | null;
  authUrl: string | null;
  tokenUrl: string | null;
  accountInfoUrl: string | null;
  redirectUri: string | null;
  isEnabled: boolean;
}

interface OAuthProviderRow {
  code: string;
  name: string;
  client_id: string | null;
  client_secret: string | null;
  scope: string | null;
  auth_url: string | null;
  token_url: string | null;
  account_info_url: string | null;
  redirect_uri: string | null;
  is_enabled: boolean;
}

const SELECT_COLUMNS = `
  code, name, client_id, client_secret, scope,
  auth_url, token_url, account_info_url, redirect_uri, is_enabled
`;

function toConfig(row: OAuthProviderRow): OAuthProviderConfig {
  return {
    code: row.code,
    name: row.name,
    clientId: row.client_id,
    clientSecret: row.client_secret,
    scope: row.scope,
    authUrl: row.auth_url,
    tokenUrl: row.token_url,
    accountInfoUrl: row.account_info_url,
    redirectUri: row.redirect_uri,
    isEnabled: row.is_enabled,
  };
}

@Injectable()
export class PgOAuthProviderRepository {
  constructor(@Inject(IAM_PG_POOL) private readonly pool: Pool) {}

  /** 按 code 读取已启用的 provider 配置；未启用或不存在返回 null。 */
  async findEnabledByCode(code: string): Promise<OAuthProviderConfig | null> {
    const result = await this.pool.query<OAuthProviderRow>(
      `select ${SELECT_COLUMNS}
         from identity.oauth_providers
        where code = $1 and is_enabled = true
        limit 1`,
      [code],
    );
    const row = result.rows[0];
    return row ? toConfig(row) : null;
  }

  /** 列出所有已启用 provider（用于登录页展示可用入口）。 */
  async listEnabled(): Promise<OAuthProviderConfig[]> {
    const result = await this.pool.query<OAuthProviderRow>(
      `select ${SELECT_COLUMNS}
         from identity.oauth_providers
        where is_enabled = true
        order by sort asc, code asc`,
    );
    return result.rows.map(toConfig);
  }
}
