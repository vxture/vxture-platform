/**
 * tool-whitelist.const.ts - Varda 工具白名单常量
 * @package @vxture/bff-varda
 * @layer Application
 * @category Types
 *
 * @description
 *   surface.middleware.ts 使用这两个常量计算 CallerContext.allowedTools。
 *   与 agent-server/varda/src/tools/tool-whitelist.const.ts 镜像保持一致。
 *   两处各自独立定义，禁止跨包 import。
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

/** admin surface 允许的工具集（operator 专用，全平台数据范围） */
export const ADMIN_TOOLS = [
  "tenant_search",
  "tenant_detail",
  "billing_overview",
  "subscription_list",
  "ticket_list",
  // 二期执行类工具（requiresConfirmation=true）
  "tenant_pause_subscription",
  "tenant_resume_subscription",
  "tenant_change_plan",
] as const;

/** console surface 允许的工具集（tenant_user 专用，tenantId 强制隔离） */
export const CONSOLE_TOOLS = [
  "my_subscription",
  "my_billing",
  "my_usage",
  "my_tickets",
  // 二期执行类工具（requiresConfirmation=true）
  "my_change_plan",
] as const;
