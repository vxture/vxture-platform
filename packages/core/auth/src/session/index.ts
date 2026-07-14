export {
  AccessTokenRevocationService,
  buildAccessTokenBlacklistKey,
  buildSubjectRevokedBeforeKey,
  resolveAccessRevocationSurface,
} from "./token-revocation.service";
export type { AccessRevocationSurface } from "./token-revocation.service";

export { REDIS_REVOCATION_CONFIG } from "./redis-revocation-config";
export type { RedisRevocationConfig } from "./redis-revocation-config";
