/**
 * logger.utils.ts - Logger utilities
 * @package @vxture/core-utils
 * @description
 *   Structured logging utility with multi-level logging, context binding and cross-platform output
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

import { LogLevel } from "../types/utils.types";
import type { LogRecord, LoggerConfig } from "../types/utils.types";
import { isBrowser } from "./env.utils";

// ============================================================================
// Log Level Priority
// ============================================================================

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// ============================================================================
// Colors (Node.js terminal only)
// ============================================================================

const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  fatal: "\x1b[35m", // magenta
};
const RESET = "\x1b[0m";

// ============================================================================
// VxLogger
// ============================================================================

export class VxLogger {
  private readonly config: Required<LoggerConfig>;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: config.level ?? LogLevel.INFO,
      enableTimestamp: config.enableTimestamp ?? true,
      enableColors: config.enableColors ?? !isBrowser(),
      context: config.context ?? "",
    };
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.write(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.write(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.write(LogLevel.WARN, message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.write(LogLevel.ERROR, message, metadata);
  }

  fatal(message: string, metadata?: Record<string, unknown>): void {
    this.write(LogLevel.FATAL, message, metadata);
  }

  /** Create child logger with fixed context */
  child(context: string): VxLogger {
    return new VxLogger({ ...this.config, context });
  }

  // --------------------------------------------------------------------------

  private write(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.level])
      return;

    const record: LogRecord = {
      level,
      message,
      timestamp: new Date(),
      ...(this.config.context ? { context: this.config.context } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    };

    const formatted = this.format(record);

    if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
      console.error(formatted);
    } else if (level === LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  private format(record: LogRecord): string {
    const parts: string[] = [];

    if (this.config.enableTimestamp) {
      parts.push(`[${record.timestamp.toISOString()}]`);
    }

    const levelStr = record.level.toUpperCase().padEnd(5);

    if (this.config.enableColors) {
      const color = COLORS[record.level];
      parts.push(`${color}${levelStr}${RESET}`);
    } else {
      parts.push(levelStr);
    }

    if (record.context) {
      parts.push(`[${record.context}]`);
    }

    parts.push(record.message);

    if (record.metadata && Object.keys(record.metadata).length > 0) {
      parts.push(JSON.stringify(record.metadata));
    }

    return parts.join(" ");
  }
}

// ============================================================================
// Default global logger instance
// ============================================================================

export const logger = new VxLogger();
