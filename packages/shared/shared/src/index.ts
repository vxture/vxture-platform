/**
 * index.ts - @vxture/shared entry point
 * @package @vxture/shared
 * @description Main entry point for the @vxture/shared package, exporting all public API types, constants, and utility functions.
 */

// =============================================================================
// Exports
// =============================================================================

// Type Exports
export type {
  // API Types
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  // Auth Types
  UserInfo,
  TokenData,
  // Common Types
  Link,
  Action,
  // Locale Types
  Locale,
  LocaleConfig,
  // Theme Types
  Theme,
  ThemeValue,
  // UI Types
  SemanticColor,
  // Error Types
  ErrorMetadata,
  // Portal Context Types
  PortalSource,
  PortalNavContext,
} from "./types";

// Catalog value-domain types — platform contract (product_220 §1/§2/§3)
export type {
  Tier,
  ComponentRole,
  SubscriptionStatus,
  MergeStrategy,
  ConsumeMode,
  MetricKind,
} from "./constants";

// Value Exports
export {
  // Auth constants
  AUTH_CONSTANTS,
  // Locale constants
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_CONFIGS,
  LOCALE_DEFAULT_CURRENCY,
  LOCALE_CONSTANTS,
  // Theme constants
  THEME_CONSTANTS,
  // Preference constants
  PREFERENCE_CONSTANTS,
  // UI constants
  SEMANTIC_COLORS,
  // Catalog value domains — platform contract, SoT (product_220 §1/§2/§3)
  TIERS,
  COMPONENT_ROLES,
  SUBSCRIPTION_STATUSES,
  MERGE_STRATEGIES,
  CONSUME_MODES,
  METRIC_KINDS,
} from "./constants";

// Utils
export {
  // Debug utils
  debugLog,
  debugWarn,
  debugError,
  // Format utils
  formatCurrency,
  formatDate,
  formatNumber,
  // Object utils
  deepMerge,
  deepClone,
  isPlainObject,
  // Portal Context utils
  encodePortalContext,
  decodePortalContext,
} from "./utils";

// Errors
export {
  VxtureError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  isVxtureError,
} from "./errors";
