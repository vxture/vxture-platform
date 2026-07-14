/**
 * tenant-execute.tool.ts - 租户订阅执行类工具（admin surface）
 * @package varda-server
 * @layer Application
 * @category Tool
 *
 * @description
 *   tenant_pause_subscription：暂停指定租户的订阅
 *   tenant_resume_subscription：恢复指定租户的订阅
 *   tenant_change_plan：调整指定租户的订阅套餐
 *
 *   三个工具均为执行类（requiresConfirmation=true），经用户确认后才执行，
 *   并由 ToolRegistry.executeAfterConfirm() 负责写入 VardaAuditLog（spec §6.5）。
 *
 * @author AI-Generated
 * @date 2026-05-01
 */

import type { VardaTool } from "../tool.types";

// ============================================================================
// tenant_pause_subscription
// ============================================================================

export const tenantPauseSubscriptionTool: VardaTool = {
  id: "tenant_pause_subscription",
  name: "暂停租户订阅",
  description:
    "暂停指定租户的订阅，暂停后租户无法使用付费功能。操作不可自动恢复，须由运营人员手动恢复。",
  surfaces: ["admin"],
  dataScope: "global",
  requiresConfirmation: true,
  confirmSummary: (input) => {
    const { subscriptionId, tenantId, reason } = input as {
      subscriptionId: string;
      tenantId: string;
      reason?: string;
    };
    const reasonPart = reason ? `，原因：${reason}` : "";
    return `暂停租户 ${tenantId} 的订阅（${subscriptionId}）${reasonPart}`;
  },
  inputSchema: {
    type: "object",
    properties: {
      subscriptionId: { type: "string", description: "要暂停的订阅 ID" },
      tenantId: {
        type: "string",
        description: "所属租户 ID（仅用于确认摘要展示）",
      },
      reason: {
        type: "string",
        description: "暂停原因（可选，将记录至审计日志）",
      },
    },
    required: ["subscriptionId", "tenantId"],
  },
  async execute(_input, _ctx) {
    return {
      success: false,
      error: "tenant_pause_subscription: not yet implemented",
    };
  },
};

// ============================================================================
// tenant_resume_subscription
// ============================================================================

export const tenantResumeSubscriptionTool: VardaTool = {
  id: "tenant_resume_subscription",
  name: "恢复租户订阅",
  description: "恢复处于暂停状态的租户订阅，恢复后租户可重新使用付费功能。",
  surfaces: ["admin"],
  dataScope: "global",
  requiresConfirmation: true,
  confirmSummary: (input) => {
    const { subscriptionId, tenantId } = input as {
      subscriptionId: string;
      tenantId: string;
    };
    return `恢复租户 ${tenantId} 的订阅（${subscriptionId}）`;
  },
  inputSchema: {
    type: "object",
    properties: {
      subscriptionId: { type: "string", description: "要恢复的订阅 ID" },
      tenantId: {
        type: "string",
        description: "所属租户 ID（仅用于确认摘要展示）",
      },
    },
    required: ["subscriptionId", "tenantId"],
  },
  async execute(_input, _ctx) {
    return {
      success: false,
      error: "tenant_resume_subscription: not yet implemented",
    };
  },
};

// ============================================================================
// tenant_change_plan
// ============================================================================

export const tenantChangePlanTool: VardaTool = {
  id: "tenant_change_plan",
  name: "调整租户套餐",
  description:
    "将指定租户的订阅切换至新套餐。升级立即生效，降级在当前周期结束时生效。",
  surfaces: ["admin"],
  dataScope: "global",
  requiresConfirmation: true,
  confirmSummary: (input) => {
    const { subscriptionId, tenantId, newPlanId } = input as {
      subscriptionId: string;
      tenantId: string;
      newPlanId: string;
    };
    return `将租户 ${tenantId} 的订阅（${subscriptionId}）套餐调整为 ${newPlanId}`;
  },
  inputSchema: {
    type: "object",
    properties: {
      subscriptionId: { type: "string", description: "要调整的订阅 ID" },
      tenantId: {
        type: "string",
        description: "所属租户 ID（仅用于确认摘要展示）",
      },
      newPlanId: { type: "string", description: "目标套餐 ID" },
    },
    required: ["subscriptionId", "tenantId", "newPlanId"],
  },
  async execute(_input, _ctx) {
    return { success: false, error: "tenant_change_plan: not yet implemented" };
  },
};
