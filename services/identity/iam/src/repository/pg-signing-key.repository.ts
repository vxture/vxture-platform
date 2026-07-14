/**
 * pg-signing-key.repository.ts - appoidc.signing_keys 公钥仓储（JWKS 轮换来源）
 * @package @vxture/service-iam
 * @layer Infrastructure
 * @category repository
 *
 * 提供可发布到 JWKS 的公钥集（status ∈ active/next/retiring），供 IdP `/jwks` 在
 * 密钥轮换期同时暴露新旧公钥。私钥不在本层（secret manager）。
 * 见 docs/design/identity-platform-idp.md §1.3 / §3。
 */
import { Inject, Injectable } from "@nestjs/common";
import type { Pool } from "pg";
import { IAM_PG_POOL } from "../tokens";

interface SigningKeyRow {
  public_jwk: Record<string, unknown>;
}

@Injectable()
export class PgSigningKeyRepository {
  constructor(@Inject(IAM_PG_POOL) private readonly pool: Pool) {}

  /** 可发布到 JWKS 的公钥集（active / next / retiring）。 */
  async listPublishableJwks(): Promise<Record<string, unknown>[]> {
    const result = await this.pool.query<SigningKeyRow>(
      `select public_jwk
         from appoidc.signing_keys
        where status in ('active', 'next', 'retiring')`,
    );
    return result.rows.map((r) => r.public_jwk);
  }
}
