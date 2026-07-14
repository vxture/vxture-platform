/**
 * confirm.service.ts - 执行类工具二次确认业务逻辑
 * @package varda-server
 * @layer Application
 * @category Service
 *
 * @description
 *   接收用户确认或取消指令，校验审计记录归属后：
 *   - confirmed=true：原子领取执行权 → 执行工具 → 将结果写入会话历史（若传入 sessionId）
 *   - confirmed=false：标记取消，不执行工具
 *
 *   TOCTOU 防护：通过 AuditRepository.claimForExecution() 原子 UPDATE
 *   WHERE confirmed=false AND cancelledAt IS NULL，双重保证：
 *   1) 并发请求中只有一个能成功执行，杜绝双重执行；
 *   2) 已取消的记录（cancelledAt IS NOT NULL）无法被重新确认。
 *
 * @author AI-Generated
 * @date 2026-05-01
 */

import {
  Injectable,
  ForbiddenException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { CallerContext } from "../context/caller-context.types";
import { AuditRepository } from "../audit/audit.repository";
import { MessageRepository } from "../storage/message.repository";
import { ToolRegistry } from "../tools/tool-registry";
import type { VardaToolResult } from "../tools/tool.types";

// ============================================================================
// ConfirmService
// ============================================================================

@Injectable()
export class ConfirmService {
  private readonly logger = new Logger(ConfirmService.name);

  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly toolRegistry: ToolRegistry,
    private readonly messageRepository: MessageRepository,
  ) {}

  async confirm(
    auditId: string,
    confirmed: boolean,
    ctx: CallerContext,
    sessionId?: string,
  ): Promise<VardaToolResult | { cancelled: true }> {
    const record = await this.auditRepository.findById(auditId);

    if (!record) {
      throw new NotFoundException(`Audit record '${auditId}' not found`);
    }

    // 校验记录归属：只允许同一用户、同一 surface、同一租户操作
    if (
      record.userId !== ctx.userId ||
      record.surface !== ctx.surface ||
      record.tenantId !== ctx.tenantId
    ) {
      throw new ForbiddenException(
        "Audit record does not belong to current context",
      );
    }

    if (!confirmed) {
      if (record.confirmed) {
        throw new ForbiddenException(
          "Audit record already confirmed, cannot cancel",
        );
      }
      if (record.cancelledAt) {
        throw new ForbiddenException("Audit record already cancelled");
      }
      await this.auditRepository.markCancelled(auditId);
      return { cancelled: true };
    }

    // 原子领取执行权：并发请求只有一个能拿到 claimed 记录
    const claimed = await this.auditRepository.claimForExecution(auditId);
    if (!claimed) {
      throw new ForbiddenException("Audit record already confirmed");
    }

    const result = await this.toolRegistry.executeAfterConfirm(
      record.toolId,
      auditId,
      record.input,
      ctx,
    );

    // 将工具执行结果写入会话历史，恢复 LLM 上下文
    if (sessionId) {
      await this.persistResultToSession(sessionId, record.toolId, result);
    }

    return result;
  }

  // ============================================================================
  // 内部：写入会话历史
  // ============================================================================

  private async persistResultToSession(
    sessionId: string,
    toolId: string,
    result: VardaToolResult,
  ): Promise<void> {
    try {
      const summary = result.success
        ? `已确认执行 ${toolId}，操作成功。`
        : `已确认执行 ${toolId}，操作失败：${result.error ?? "未知错误"}。`;

      await this.messageRepository.saveMessages([
        {
          sessionId,
          role: "assistant",
          content: summary,
          toolId,
          toolResult: result,
          ...(result.displayHint !== undefined
            ? { displayHint: result.displayHint }
            : {}),
        },
      ]);
    } catch (err) {
      // 写入失败不影响主流程，但记录警告便于排查
      this.logger.warn(
        `persistResultToSession failed [session=${sessionId}, tool=${toolId}]: ${String(err)}`,
      );
    }
  }
}
