/**
 * utils.types.ts - Utility type definitions
 * @package @vxture/core-utils
 * @description
 *   Core utilities types and constants
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

// ============================================================================
// Utility Types
// ============================================================================

export type Maybe<T> = T | null | undefined;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type Class<T = any> = new (...args: any[]) => T;

export type FunctionType = (...args: any[]) => any;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// ============================================================================
// Log Types
// ============================================================================

export const LogLevel = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
  FATAL: "fatal",
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export interface LogRecord {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  metadata?: Record<string, unknown>;
}

export interface LoggerConfig {
  level?: LogLevel;
  enableTimestamp?: boolean;
  enableColors?: boolean;
  context?: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  enableTimestamp: true,
  enableColors: true,
};
