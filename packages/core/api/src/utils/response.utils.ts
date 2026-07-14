/**
 * response.utils.ts - Response Handling Utilities
 * @package @vxture/core-api
 * @description
 *   Pure function utilities for response unwrapping and pagination building.
 *
 * @author AI-Generated
 * @date 2026-03-15
 */

import type { ApiResponse, PageResult, PageQuery } from "../types/api.types";

// ============================================================================
// Response Builders (For BFF to build standard responses)
// ============================================================================

/**
 * Builds a success response
 *
 * @example
 * return ok(billingData);
 * // { success: true, data: billingData, code: 'OK', timestamp: '...' }
 */
export function ok<T>(data: T, requestId?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    code: "OK",
    timestamp: new Date().toISOString(),
    ...(requestId !== undefined ? { requestId } : {}),
  };
}

/**
 * Builds a failure response
 *
 * @example
 * return fail('NOT_FOUND', 'User not found');
 */
export function fail(
  code: string,
  message: string,
  requestId?: string,
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    code,
    message,
    timestamp: new Date().toISOString(),
    ...(requestId !== undefined ? { requestId } : {}),
  };
}

// ============================================================================
// Pagination Utilities
// ============================================================================

/**
 * Builds pagination result
 *
 * @example
 * const result = buildPageResult(users, total, { page: 1, pageSize: 20 });
 */
export function buildPageResult<T>(
  items: T[],
  total: number,
  query: PageQuery,
): PageResult<T> {
  const totalPages = Math.ceil(total / query.pageSize);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages,
    hasNextPage: query.page < totalPages,
    hasPrevPage: query.page > 1,
  };
}

/**
 * Calculates pagination offset (used for Prisma skip)
 *
 * @example
 * const skip = pageToOffset({ page: 2, pageSize: 20 }); // → 20
 */
export function pageToOffset(query: PageQuery): number {
  return (query.page - 1) * query.pageSize;
}

/**
 * Validates pagination parameters and returns safe pagination parameters
 * Prevents page=0 or pageSize being too large
 */
export function safePageQuery(query: Partial<PageQuery>): PageQuery {
  return {
    page: Math.max(1, query.page ?? 1),
    pageSize: Math.min(100, Math.max(1, query.pageSize ?? 20)),
    ...(query.sortBy !== undefined ? { sortBy: query.sortBy } : {}),
    sortOrder: query.sortOrder ?? "desc",
  };
}
