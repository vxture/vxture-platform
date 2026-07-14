/**
 * subscription-execute.tool.ts - 订阅套餐变更执行工具（console surface）
 * @package varda-server
 * @layer Application
 * @category Tool
 *
 * @description
 *   my_change_plan：升级或降级当前租户的订阅套餐。
 *
 *   tenantId 强制来自 CallerContext，前端无法篡改（spec §11.3）。
 *   requiresConfirmation=true，套餐变更前须用户二次确认。
 *
 * @author AI-Generated
 * @date 2026-05-01
 */

import type { VardaTool } from "../tool.types";

// ============================================================================
// my_change_plan
// ============================================================================

export const myChangePlanTool: VardaTool = {
  id: "my_change_plan",
  name: "变更订阅套餐",
  description:
    "升级或降级当前租户的订阅套餐。升级立即生效，降级在当前计费周期结束时生效。",
  surfaces: ["console"],
  dataScope: "tenant",
  requiresConfirmation: true,
  confirmSummary: (input) => {
    const { subscriptionId, newPlanId } = input as {
      subscriptionId: string;
      newPlanId: string;
    };
    return `将订阅（${subscriptionId}）的套餐变更为 ${newPlanId}`;
  },
  inputSchema: {
    type: "object",
    properties: {
      subscriptionId: {
        type: "string",
        description: "要变更的订阅 ID（可通过 my_subscription 工具查询）",
      },
      newPlanId: { type: "string", description: "目标套餐 ID" },
    },
    required: ["subscriptionId", "newPlanId"],
  },
  async execute(_input, _ctx) {
    return { success: false, error: "my_change_plan: not yet implemented" };
  },
};
