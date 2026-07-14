/**
 * api.types.ts - API Type Definitions
 * @package @vxture/core-api
 * @description
 *   Type definitions for API responses, request configuration, and contexts.
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

// ============================================================================
// Standard Response Types
// ============================================================================

/**
 * Unified API response wrapper
 * All responses from BFF to frontend follow this structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  code: string;
  message?: string;
  requestId?: string;
  timestamp: string;
}

/**
 * Pagination query parameters
 * Received by BFF router for frontend pagination requests
 */
export interface PageQuery {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Pagination result
 */
export interface PageResult<T = unknown> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Standard error response body
 */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

// ============================================================================
// HTTP Client Configuration
// ============================================================================

/**
 * VxHttpClient single request configuration
 * Overrides global configuration or provides additional options
 */
export interface RequestOptions {
  /** Overrides global baseURL for third-party API calls */
  baseURL?: string;
  /** Additional request headers merged with global headers */
  headers?: Record<string, string>;
  /** Timeout in milliseconds, overrides global config */
  timeout?: number;
  /** Number of retries, overrides global config */
  retries?: number;
  /** Skip automatic response unwrapping, return raw axios response */
  raw?: boolean;
  /** Response type for file download */
  responseType?: "json" | "arraybuffer" | "stream" | "blob";
}

/**
 * File upload options
 */
export interface UploadOptions extends RequestOptions {
  /** Upload progress callback */
  onProgress?: (percent: number) => void;
}

// ============================================================================
// Interceptor Context
// — For BFF to build context-aware header injection
// ============================================================================

/**
 * Request context containing information to be passed through
 */
export interface RequestContext {
  /** Bearer token automatically injected into Authorization header */
  accessToken?: string;
  /** Tenant ID automatically injected into x-tenant-id header */
  tenantId?: string;
  /** Request ID for distributed tracing */
  requestId?: string;
}
