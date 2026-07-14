/**
 * varda.types.ts - Varda 前端核心类型定义
 * @package @vxture/agent-studio-varda
 * @layer Presentation
 * @category Types
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

// ============================================================================
// Surface
// ============================================================================

export type VardaSurface = "admin" | "console";

// ============================================================================
// 消息
// ============================================================================

export type VardaMessageRole = "user" | "assistant" | "tool";

export interface VardaTextMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface VardaToolMessage {
  id: string;
  role: "tool";
  toolId: string;
  data: unknown;
  displayHint?: "table" | "list" | "text" | "card";
}

export type VardaMessage = VardaTextMessage | VardaToolMessage;

// ============================================================================
// SSE 流事件（与 agent-server/varda 定义对应）
// ============================================================================

export type ChatStreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool_call"; toolId: string; status: "running" }
  | { type: "tool_result"; toolId: string; data: unknown; displayHint?: string }
  | {
      type: "confirm_required";
      auditId: string;
      toolId: string;
      summary: string;
    }
  | { type: "done"; sessionId: string }
  | { type: "error"; message: string };

// ============================================================================
// 确认接口
// ============================================================================

export interface VardaConfirmRequest {
  auditId: string;
  confirmed: boolean;
}

/** store 中挂起的确认任务，来自 confirm_required 事件 */
export interface VardaConfirmPending {
  auditId: string;
  toolId: string;
  summary: string;
}
