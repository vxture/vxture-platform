/**
 * index.ts - Auth utility exports
 * @package @vxture/core-auth
 */

export {
  extractBearerToken,
  extractBearerTokenFromHeaders,
  isTokenExpired,
  getTokenRemainingMs,
} from "./auth.utils";

export {
  resolveInternalAuthToken,
  assertInternalAuth,
} from "./internal-auth.utils";

export {
  hasPermission,
  hasRole,
  isAdmin,
  isTenantAdmin,
} from "./permission.utils";

export {
  isValidProvider,
  buildOAuthProfile,
  generateJti,
} from "./provider.utils";
