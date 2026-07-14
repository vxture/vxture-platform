/**
 * billing-query.tool.ts - 账单总览工具（admin surface）
 * @package varda-server
 * @layer Application
 * @category Tool
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import type { VardaTool } from "../tool.types";

export const billingOverviewTool: VardaTool = {
  id: "billing_overview",
  name: "平台账单总览",
  description: "查询平台整体账单统计，包括 GMV、ARR、近期发票汇总",
  surfaces: ["admin"],
  dataScope: "global",
  inputSchema: {
    type: "object",
    properties: {
      period: {
        type: "string",
        enum: ["7d", "30d", "90d", "1y"],
        default: "30d",
        description: "统计周期",
      },
    },
  },
  async execute(_input, _ctx) {
    return { success: false, error: "billing_overview: not yet implemented" };
  },
};
