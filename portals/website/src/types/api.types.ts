/**
 * API 相关类型定义
 * @package @vxture/website
 * @layer Presentation
 * @category Types
 */

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T = unknown> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
