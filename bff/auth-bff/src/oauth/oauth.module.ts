/**
 * oauth.module.ts — inbound-broker OAuth wiring (social login).
 * @package @vxture/bff-auth
 *
 * Provides the table-driven provider registry (over service-iam's
 * PgOAuthProviderRepository). The social start/callback + bind-phone routes
 * (16d.2/16d.3) consume this registry; OAuth state/bind persistence lives in
 * RedisService. See docs/design/identity-platform-account.md.
 */
import { Module } from "@nestjs/common";
import { IamModule } from "@vxture/service-iam";
import { OAuthProviderRegistry } from "./provider-registry";

@Module({
  imports: [IamModule],
  providers: [OAuthProviderRegistry],
  exports: [OAuthProviderRegistry],
})
export class OauthModule {}
