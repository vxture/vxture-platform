/**
 * app.schema.ts - Application configuration schema
 * @package @vxture/core-config
 * @description
 *   Zod schema for application configuration
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

import { z } from "zod";

// ============================================================================
// App Schema
// ============================================================================

export const AppEnvEnum = z.enum([
  "development",
  "staging",
  "production",
  "test",
]);

export const appSchema = z.object({
  /** Current runtime environment */
  NODE_ENV: AppEnvEnum.default("development"),

  /** HTTP listening port */
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  /** Paired internal upstream API base URL, primarily used by agent BFFs */
  AGENT_SERVER_BASE_URL: z.string().url().default("http://127.0.0.1:3112"),

  /** Log level */
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "debug", "verbose"])
    .default("info"),

  /** Application name, used for logging and monitoring identification */
  APP_NAME: z.string().min(1).default("vxture"),
});

export type AppConfig = z.infer<typeof appSchema>;
export type AppEnv = z.infer<typeof AppEnvEnum>;
