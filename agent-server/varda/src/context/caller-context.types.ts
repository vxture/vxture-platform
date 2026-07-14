/**
 * caller-context.types.ts - CallerContext 上下文隔离核心类型
 * @package varda-server
 * @layer Application
 * @category Types
 *
 * @description
 *   与 bff/varda-bff/src/types/caller-context.types.ts 保持一致。
 *   两处各自独立定义，禁止跨包 import（spec §4.2 显式约定）。
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

export type VardaSurface = "admin" | "console";

export type VardaUserType = "operator" | "tenant_user";

/** surface × userType 合法组合（此文件是 server 侧的唯一权威） */
export const VALID_COMBINATIONS: Record<VardaSurface, VardaUserType> = {
  admin: "operator",
  console: "tenant_user",
};

export interface CallerContext {
  surface: VardaSurface;
  userId: string;
  userType: VardaUserType;
  role: string;
  tenantId: string | null;
  allowedTools: readonly string[];
  dataScope: "global" | "tenant";
}
