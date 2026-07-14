/**
 * caller-context.types.ts - CallerContext 上下文隔离核心类型
 * @package @vxture/bff-varda
 * @layer Application
 * @category Types
 *
 * @description
 *   CallerContext 由 surface.middleware.ts 构造，携带到 agent-server/varda。
 *   两处定义保持一致（bff/varda-bff 与 agent-server/varda 各自独立定义，禁止跨包 import）。
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

// ============================================================================
// Surface 与用户身份类型
// ============================================================================

/** Varda 前端声明的入口面（由 X-Varda-Surface Header 携带，服务端二次校验） */
export type VardaSurface = "admin" | "console";

/** Varda 认可的用户身份类型（来自 JWT payload.userType） */
export type VardaUserType = "operator" | "tenant_user";

// ============================================================================
// CallerContext
// ============================================================================

/**
 * 调用上下文，贯穿 varda-bff → agent-server/varda 整个请求链路。
 * 由 varda-bff 的 surface.middleware.ts 在服务端构造，以 base64 JSON 编码通过
 * X-Varda-Context Header 传递给 agent-server/varda，agent-server 不信任前端输入。
 */
export interface CallerContext {
  /** 来自 X-Varda-Surface Header（服务端校验合法性） */
  surface: VardaSurface;

  /** 来自 JWT payload.sub */
  userId: string;

  /** 来自 JWT payload.userType */
  userType: VardaUserType;

  /** 用户角色：super_admin | admin | owner | member */
  role: string;

  /** 租户 ID，operator 时为 null */
  tenantId: string | null;

  /** 当前 surface + role 允许调用的工具 ID 列表（由 varda-bff 根据常量计算后注入） */
  allowedTools: readonly string[];

  /** 数据查询范围：admin surface → global；console surface → tenant */
  dataScope: "global" | "tenant";
}
