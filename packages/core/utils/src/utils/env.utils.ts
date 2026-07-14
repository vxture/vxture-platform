/**
 * env.utils.ts - Environment utilities
 * @package @vxture/core-utils
 * @description
 *   Environment detection utilities including Node.js environment detection, browser environment detection and NODE_ENV detection
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

// ============================================================================
// Environment Checks
// ============================================================================

/** Current NODE_ENV value, defaults to 'development' if not set */
export function getNodeEnv(): string {
  return process.env["NODE_ENV"] ?? "development";
}

/** Is production environment */
export function isProduction(): boolean {
  return getNodeEnv() === "production";
}

/** Is development environment */
export function isDevelopment(): boolean {
  return getNodeEnv() === "development";
}

/** Is test environment */
export function isTest(): boolean {
  return getNodeEnv() === "test";
}

/** Is staging environment */
export function isStaging(): boolean {
  return getNodeEnv() === "staging";
}

// ============================================================================
// Process Checks
// ============================================================================

/** Is running in Node.js environment */
export function isNode(): boolean {
  return typeof process !== "undefined" && process.versions?.node !== undefined;
}

/** Is running in browser environment */
export function isBrowser(): boolean {
  return "window" in globalThis && "document" in globalThis;
}
