/**
 * my-subscription.tool.ts - 当前租户订阅查询（console surface）
 * @package varda-server
 * @layer Application
 * @category Tool
 *
 * @description
 *   tenantId 强制来自 CallerContext，前端无法篡改（spec §11.3）。
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import type { VardaTool } from "../tool.types";

export const mySubscriptionTool: VardaTool = {
  id: "my_subscription",
  name: "我的订阅",
  description: "查询当前租户的订阅计划、到期时间和功能权限",
  surfaces: ["console"],
  dataScope: "tenant",
  inputSchema: { type: "object", properties: {} },
  async execute(_input, _ctx) {
    return { success: false, error: "my_subscription: not yet implemented" };
  },
};
