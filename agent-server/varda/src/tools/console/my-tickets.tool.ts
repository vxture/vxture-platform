/**
 * my-tickets.tool.ts - 当前租户工单查询（console surface）
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

export const myTicketsTool: VardaTool = {
  id: "my_tickets",
  name: "我的工单",
  description: "查询当前租户提交的支持工单列表",
  surfaces: ["console"],
  dataScope: "tenant",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["open", "in_progress", "resolved", "closed"],
        description: "工单状态筛选（不传则返回全部）",
      },
      limit: {
        type: "number",
        default: 10,
        description: "最多返回条数，最大 50",
      },
    },
  },
  async execute(_input, _ctx) {
    return { success: false, error: "my_tickets: not yet implemented" };
  },
};
