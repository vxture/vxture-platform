/**
 * index.ts - Shared utility function exports
 * @package @vxture/shared
 * @description Unified export entry for all shared utility functions, organized by functional category.
 */

// Debug utils
export { debugLog, debugWarn, debugError } from "./debug.utils";

// Format utils
export { formatCurrency, formatDate, formatNumber } from "./format.utils";

// Object utils
export { deepMerge, deepClone, isPlainObject } from "./object.utils";

// Portal Context utils
export {
  encodePortalContext,
  decodePortalContext,
} from "./portal-context.utils";
