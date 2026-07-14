/**
 * 认证常量配置
 * @package @vxture/website
 * @layer Presentation
 * @category Constants
 */

export const AUTH_CONSTANTS = {
  STORAGE_KEY: "auth_storage_key",
  PERSIST_KEY: "auth-persist",
  DEFAULT_TOKEN_EXPIRY: 3600 * 24,
  TOKEN_REFRESH_BUFFER: 60000,
  AUTO_LOGOUT_COUNTDOWN: 5000,
  PERMISSIONS: {
    ADMIN: "admin",
    USER: "user",
  },
};
