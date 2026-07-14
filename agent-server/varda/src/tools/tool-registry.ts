/**
 * tool-registry.ts - Varda 工具注册中心
 * @package varda-server
 * @layer Application
 * @category Service
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import { Injectable } from "@nestjs/common";
import type { CallerContext } from "../context/caller-context.types";
import type { LLMTool } from "@vxture/model-runtime-client/llm";
import { AuditRepository } from "../audit/audit.repository";
import type { VardaTool, VardaToolResult } from "./tool.types";

// ============================================================================
// 内部类型
// ============================================================================

export type PrepareResult =
  | { status: "ready" }
  | { status: "confirmation_required"; auditId: string; summary: string };

// ============================================================================
// ToolRegistry
// ============================================================================

@Injectable()
export class ToolRegistry {
  private readonly tools = new Map<string, VardaTool>();

  constructor(private readonly auditRepository: AuditRepository) {}

  register(tool: VardaTool): void {
    this.tools.set(tool.id, tool);
  }

  /**
   * 根据 CallerContext 返回当前会话允许的工具集（用于构造 LLM functions）。
   * 三重过滤：allowedTools 白名单 + surfaces 白名单 + dataScope 匹配。
   */
  getAvailableTools(ctx: CallerContext): VardaTool[] {
    return ctx.allowedTools
      .map((id) => this.tools.get(id))
      .filter(
        (t): t is VardaTool =>
          !!t &&
          t.surfaces.includes(ctx.surface) &&
          t.dataScope === ctx.dataScope,
      );
  }

  /** 将工具列表转换为 @vxture/model-runtime-client 的 LLMTool 格式 */
  toLLMTools(tools: VardaTool[]): LLMTool[] {
    return tools.map((tool) => ({
      name: tool.id,
      description: tool.description,
      parameters: tool.inputSchema,
    }));
  }

  /**
   * 执行前预检。
   * - 只读工具（requiresConfirmation 未设置）：返回 { status: 'ready' }，可直接调用 execute()。
   * - 执行类工具（requiresConfirmation=true）：写入 VardaAuditLog（confirmed=false）作为挂起记录，
   *   返回 { status: 'confirmation_required', auditId, summary }；
   *   调用方 yield confirm_required 事件后结束本轮流，等待用户确认。
   */
  async prepareExecution(
    toolId: string,
    input: unknown,
    ctx: CallerContext,
  ): Promise<PrepareResult> {
    const tool = this.tools.get(toolId);
    if (
      !tool ||
      !ctx.allowedTools.includes(toolId) ||
      !tool.requiresConfirmation
    ) {
      return { status: "ready" };
    }

    const auditRecord = await this.auditRepository.create({
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      surface: ctx.surface,
      toolId,
      input,
      result: {},
      confirmed: false,
    });

    return {
      status: "confirmation_required",
      auditId: auditRecord.id,
      summary: tool.confirmSummary?.(input) ?? `执行工具：${tool.name}`,
    };
  }

  /**
   * 只读工具执行入口（由 ChatService Tool Use Loop 调用）。
   * 仅允许 requiresConfirmation 未设置的工具；执行类工具须走 executeAfterConfirm。
   */
  async execute(
    toolId: string,
    input: unknown,
    ctx: CallerContext,
  ): Promise<VardaToolResult> {
    const tool = this.tools.get(toolId);

    if (!tool || !ctx.allowedTools.includes(toolId)) {
      return {
        success: false,
        error: `Tool '${toolId}' not allowed in current context`,
      };
    }

    if (tool.requiresConfirmation) {
      return {
        success: false,
        error: `Tool '${toolId}' requires user confirmation before execution`,
      };
    }

    try {
      return await tool.execute(input, ctx);
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * 确认后执行入口（由 ConfirmService 调用）。
   * 执行工具，更新审计记录（confirmed=true + 实际 result）。
   */
  async executeAfterConfirm(
    toolId: string,
    auditId: string,
    input: unknown,
    ctx: CallerContext,
  ): Promise<VardaToolResult> {
    const tool = this.tools.get(toolId);

    if (!tool || !ctx.allowedTools.includes(toolId)) {
      await this.auditRepository.updateExecution(auditId, false, {
        error: `Tool '${toolId}' not allowed in current context`,
      });
      return {
        success: false,
        error: `Tool '${toolId}' not allowed in current context`,
      };
    }

    let result: VardaToolResult;
    try {
      result = await tool.execute(input, ctx);
    } catch (err) {
      result = { success: false, error: String(err) };
    }

    await this.auditRepository.updateExecution(auditId, true, result);
    return result;
  }
}
