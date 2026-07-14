/**
 * ai.schema.ts - AI configuration schema
 * @package @vxture/core-config
 * @description
 *   Zod schema for AI (LLM provider) configuration
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

import { z } from "zod";

// ============================================================================
// AI Schema (LLM provider credentials + endpoints)
//
// Only consumed by agent-server/*, BFF/services do not inject AI config
// ============================================================================

// ----------------------------------------------------------------------------
// Doubao (豆包) — ByteDance LLM
// ----------------------------------------------------------------------------
const doubaoSchema = z.object({
  /** Doubao API Key — optional; agent-server must assert presence before invoking Doubao */
  DOUBAO_API_KEY: z.string().min(1).optional(),

  /** Doubao API Endpoint, defaults to official address */
  DOUBAO_API_URL: z
    .string()
    .url()
    .default("https://ark.cn-beijing.volces.com/api/v3"),

  /**
   * Default model ID (Doubao ARK model endpoint ID)
   * Different tenants may have different endpoints, this is the platform-level default
   */
  DOUBAO_DEFAULT_MODEL: z.string().default("doubao-seed-2-0-lite-260215"),

  /** Embedding model ID */
  DOUBAO_EMBEDDING_MODEL: z.string().default("doubao-embedding"),
});

// ----------------------------------------------------------------------------
// Claude (Anthropic)
// ----------------------------------------------------------------------------
const claudeSchema = z.object({
  /** Anthropic API Key — optional; agent-server must assert presence before invoking Claude */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),

  /** Anthropic API Base URL, can be overridden for private deployments */
  ANTHROPIC_API_URL: z.string().url().default("https://api.anthropic.com"),

  /** Default model */
  ANTHROPIC_DEFAULT_MODEL: z.string().default("claude-sonnet-4-20250514"),
});

// ----------------------------------------------------------------------------
// ChatGPT (OpenAI)
// ----------------------------------------------------------------------------
const chatgptSchema = z.object({
  /** OpenAI API Key — optional; agent-server must assert presence before invoking OpenAI */
  OPENAI_API_KEY: z.string().min(1).optional(),

  /** OpenAI API Base URL, can be overridden for private deployments */
  OPENAI_API_URL: z.string().url().default("https://api.openai.com/v1"),

  /** Default model */
  OPENAI_DEFAULT_MODEL: z.string().default("gpt-4o"),

  /** Embedding model */
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
});

// ----------------------------------------------------------------------------
// Qwen (Tongyi Qianwen)
// ----------------------------------------------------------------------------
const qwenSchema = z.object({
  /** Tongyi Qianwen API Key — optional; agent-server must assert presence before invoking Qwen */
  QWEN_API_KEY: z.string().min(1).optional(),

  /** Tongyi Qianwen API Base URL, can be overridden for private deployments */
  QWEN_API_URL: z
    .string()
    .url()
    .default("https://dashscope.aliyuncs.com/compatible-mode"),

  /** Default model */
  QWEN_DEFAULT_MODEL: z.string().default("qwen-plus"),

  /** Embedding model */
  QWEN_EMBEDDING_MODEL: z.string().default("text-embedding-v2"),
});

// ----------------------------------------------------------------------------
// Custom / private model endpoint (OpenAI compatible interface)
// ----------------------------------------------------------------------------
const customModelSchema = z.object({
  /** Private model Base URL, must be compatible with OpenAI Chat Completions API */
  CUSTOM_MODEL_API_URL: z.string().url().optional(),

  /** Private model API Key, can be empty if no authentication needed */
  CUSTOM_MODEL_API_KEY: z.string().optional(),

  /** Private model name */
  CUSTOM_MODEL_NAME: z.string().optional(),
});

// ----------------------------------------------------------------------------
// Global AI rate limiting and timeout configuration
// ----------------------------------------------------------------------------
const aiGlobalSchema = z.object({
  /** Single LLM request timeout (milliseconds) */
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(60_000),

  /** Maximum retry attempts after LLM request failure */
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),

  /** Retry interval (milliseconds, exponential backoff base) */
  AI_RETRY_DELAY_MS: z.coerce.number().int().min(100).default(1000),
});

// ----------------------------------------------------------------------------
// Combined export
// ----------------------------------------------------------------------------
export const aiSchema = doubaoSchema
  .merge(claudeSchema)
  .merge(chatgptSchema)
  .merge(qwenSchema)
  .merge(customModelSchema)
  .merge(aiGlobalSchema);

export type AiConfig = z.infer<typeof aiSchema>;

// Export subtypes separately, for ai-sdk modules to use as needed
export type DoubaoConfig = z.infer<typeof doubaoSchema>;
export type ClaudeConfig = z.infer<typeof claudeSchema>;
export type ChatgptConfig = z.infer<typeof chatgptSchema>;
export type QwenConfig = z.infer<typeof qwenSchema>;
export type CustomModelConfig = z.infer<typeof customModelSchema>;
