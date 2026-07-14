/**
 * chat.types.ts - 对话相关 DTO 与流事件类型
 * @package varda-server
 * @layer Application
 * @category Types
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

// ============================================================================
// 请求 DTO
// ============================================================================

export interface ChatInternalRequestDto {
  sessionId: string | null;
  message: string;
}

// ============================================================================
// SSE 流事件类型（varda-bff 透传给前端，spec §6.4）
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
