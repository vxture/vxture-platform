/**
 * my-usage.tool.ts - 当前租户用量查询（console surface）
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

export const myUsageTool: VardaTool = {
  id: "my_usage",
  name: "我的用量",
  description: "查询当前租户的功能用量统计（API 调用次数、存储用量等）",
  surfaces: ["console"],
  dataScope: "tenant",
  inputSchema: {
    type: "object",
    properties: {
      period: {
        type: "string",
        enum: ["7d", "30d", "90d"],
        default: "30d",
        description: "查询周期",
      },
    },
  },
  async execute(_input, _ctx) {
    return { success: false, error: "my_usage: not yet implemented" };
  },
};
