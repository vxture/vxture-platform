/**
 * tenant-query.tool.ts - organization query tools (admin surface)
 * @package varda-server
 * @layer Application
 * @category Tool
 *
 * @description
 *   tenant_search: search organizations by name/id, backed by
 *   @vxture/service-organization OrganizationService.searchOrgs.
 *   tenant_detail: look up a single organization by id (getOrgById).
 *   Both are admin surface / global dataScope / read-only. The tool ids stay
 *   "tenant_*" to preserve the whitelist + spec contract; the data is now the
 *   identity-core Organization model (the tenant entity was retired).
 *
 * @author AI-Generated
 * @date 2026-05-02
 */

import type { OrganizationService } from "@vxture/service-organization";
import type { VardaTool } from "../tool.types";

// ============================================================================
// tenant_search
// ============================================================================

export function createTenantSearchTool(org: OrganizationService): VardaTool {
  return {
    id: "tenant_search",
    name: "搜索组织",
    description:
      "根据组织名称或 ID 搜索平台组织（租户），返回基本信息概览。关键词大小写不敏感，同时匹配名称与组织 ID。",
    surfaces: ["admin"],
    dataScope: "global",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "搜索关键词（组织名称或组织 ID）",
        },
        limit: {
          type: "number",
          default: 10,
          description: "最多返回条数，最大 50",
        },
      },
      required: ["query"],
    },
    async execute(input, _ctx) {
      const { query, limit = 10 } = input as { query: string; limit?: number };
      if (!query?.trim()) {
        return { success: false, error: "搜索关键词不能为空" };
      }
      const results = await org.searchOrgs(query, limit);
      return { success: true, data: results, displayHint: "table" };
    },
  };
}

// ============================================================================
// tenant_detail
// ============================================================================

export function createTenantDetailTool(org: OrganizationService): VardaTool {
  return {
    id: "tenant_detail",
    name: "组织详情",
    description: "按组织 ID 查询组织（租户）详情，包含组织类型、状态与所有者。",
    surfaces: ["admin"],
    dataScope: "global",
    inputSchema: {
      type: "object",
      properties: {
        tenantId: { type: "string", description: "组织 ID" },
      },
      required: ["tenantId"],
    },
    async execute(input, _ctx) {
      const { tenantId } = input as { tenantId: string };
      if (!tenantId?.trim()) {
        return { success: false, error: "组织 ID 不能为空" };
      }
      const found = await org.getOrgById(tenantId);
      if (!found) {
        return { success: false, error: `组织 ${tenantId} 不存在` };
      }
      return { success: true, data: found, displayHint: "card" };
    },
  };
}
