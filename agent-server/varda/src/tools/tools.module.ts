/**
 * tools.module.ts - 工具注册模块
 * @package varda-server
 * @layer Application
 * @category Module
 *
 * @description
 *   @Global() 使 ToolRegistry 在整个 varda-server 中可直接注入，
 *   ChatModule 和 ConfirmModule 无需互相导入即可使用同一个 ToolRegistry 实例。
 *
 * @author AI-Generated
 * @date 2026-05-01
 */

import { Global, Module } from "@nestjs/common";
import {
  OrganizationModule,
  OrganizationService,
} from "@vxture/service-organization";
import { AuditRepository } from "../audit/audit.repository";
import { ToolRegistry } from "./tool-registry";

// ============================================================================
// 工具导入（一期只读工具 + 二期执行类工具在此集中注册）
// ============================================================================

import {
  createTenantSearchTool,
  createTenantDetailTool,
} from "./admin/tenant-query.tool";
import { billingOverviewTool } from "./admin/billing-query.tool";
import { subscriptionListTool } from "./admin/subscription-query.tool";
import { ticketListTool } from "./admin/ticket-query.tool";
import {
  tenantPauseSubscriptionTool,
  tenantResumeSubscriptionTool,
  tenantChangePlanTool,
} from "./admin/tenant-execute.tool";
import { mySubscriptionTool } from "./console/my-subscription.tool";
import { myBillingTool } from "./console/my-billing.tool";
import { myUsageTool } from "./console/my-usage.tool";
import { myTicketsTool } from "./console/my-tickets.tool";
import { myChangePlanTool } from "./console/subscription-execute.tool";

// admin org tools depend on OrganizationService (built in the factory below).
const ALL_TOOLS = [
  // admin — 只读工具（一期）
  billingOverviewTool,
  subscriptionListTool,
  ticketListTool,
  // admin — 执行类工具（二期）
  tenantPauseSubscriptionTool,
  tenantResumeSubscriptionTool,
  tenantChangePlanTool,
  // console — 只读工具（一期）
  mySubscriptionTool,
  myBillingTool,
  myUsageTool,
  myTicketsTool,
  // console — 执行类工具（二期）
  myChangePlanTool,
];

@Global()
@Module({
  imports: [OrganizationModule],
  providers: [
    {
      provide: ToolRegistry,
      useFactory: (audit: AuditRepository, org: OrganizationService) => {
        const registry = new ToolRegistry(audit);
        for (const tool of ALL_TOOLS) {
          registry.register(tool);
        }
        // admin org tools (backed by the identity-core Organization model)
        registry.register(createTenantSearchTool(org));
        registry.register(createTenantDetailTool(org));
        return registry;
      },
      inject: [AuditRepository, OrganizationService],
    },
  ],
  exports: [ToolRegistry],
})
export class ToolsModule {}
