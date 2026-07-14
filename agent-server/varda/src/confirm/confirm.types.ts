/**
 * confirm.types.ts - 执行确认接口 DTO
 * @package varda-server
 * @layer Application
 * @category Types
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

export interface ConfirmRequestDto {
  auditId: string;
  confirmed: boolean;
  /** 工具所在会话 ID，确认成功后将工具结果写入该会话历史，供后续对话恢复上下文 */
  sessionId?: string;
}
