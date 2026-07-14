/**
 * subscription-query.tool.ts - 订阅列表工具（admin surface）
 * @package varda-server
 * @layer Application
 * @category Tool
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import type { VardaTool } from "../tool.types";

export const subscriptionListTool: VardaTool = {
  id: "subscription_list",
  name: "订阅列表",
  description: "查询平台全部租户的订阅计划列表，可按状态筛选",
  surfaces: ["admin"],
  dataScope: "global",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["active", "cancelled", "expired", "trialing"],
        description: "订阅状态筛选（不传则返回全部）",
      },
      limit: {
        type: "number",
        default: 20,
        description: "最多返回条数，最大 100",
      },
    },
  },
  async execute(_input, _ctx) {
    return { success: false, error: "subscription_list: not yet implemented" };
  },
};
