/**
 * ticket-query.tool.ts - 工单列表工具（admin surface）
 * @package varda-server
 * @layer Application
 * @category Tool
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import type { VardaTool } from "../tool.types";

export const ticketListTool: VardaTool = {
  id: "ticket_list",
  name: "工单列表",
  description: "查询平台全部支持工单，可按状态和优先级筛选",
  surfaces: ["admin"],
  dataScope: "global",
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["open", "in_progress", "resolved", "closed"],
        description: "工单状态筛选",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "urgent", "critical"],
        description: "优先级筛选",
      },
      limit: {
        type: "number",
        default: 20,
        description: "最多返回条数，最大 100",
      },
    },
  },
  async execute(_input, _ctx) {
    return { success: false, error: "ticket_list: not yet implemented" };
  },
};
