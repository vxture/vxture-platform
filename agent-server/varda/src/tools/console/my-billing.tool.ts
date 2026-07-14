/**
 * my-billing.tool.ts - 当前租户账单查询（console surface）
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

export const myBillingTool: VardaTool = {
  id: "my_billing",
  name: "我的账单",
  description: "查询当前租户的近期发票和账单记录",
  surfaces: ["console"],
  dataScope: "tenant",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        default: 5,
        description: "返回最近 N 张发票，最大 20",
      },
    },
  },
  async execute(_input, _ctx) {
    return { success: false, error: "my_billing: not yet implemented" };
  },
};
