/**
 * chat.types.ts - /varda/chat 接口 DTO 与请求上下文类型
 * @package @vxture/bff-varda
 * @layer Application
 * @category Types
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import type { Request } from "express";
import type { CallerContext, VardaUserType } from "./caller-context.types";

// ============================================================================
// 请求 DTO
// ============================================================================

/** POST /varda/chat 请求体 */
export interface ChatRequestDto {
  /** 会话 ID，null 表示新建会话 */
  sessionId: string | null;
  /** 用户输入内容 */
  message: string;
}

// ============================================================================
// 中间件注入的请求上下文
// ============================================================================

/** auth.middleware.ts 挂载到 req.user 的最小用户信息 */
export interface VardaAuthUser {
  userId: string;
  userType: VardaUserType;
  role: string;
  tenantId: string | null;
  email: string;
}

/**
 * 经过中间件处理后的 Express Request 扩展类型。
 * auth.middleware.ts 写入 user，surface.middleware.ts 写入 callerContext。
 */
export interface VardaRequest extends Request {
  user: VardaAuthUser;
  callerContext: CallerContext;
}
