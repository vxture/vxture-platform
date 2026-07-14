/**
 * tool-whitelist.const.ts - Varda 工具白名单常量
 * @package varda-server
 * @layer Application
 * @category Types
 *
 * @description
 *   与 bff/varda-bff/src/tools/tool-whitelist.const.ts 镜像保持一致。
 *   两处各自独立定义，禁止跨包 import。
 *   新增工具时必须同时更新两处（spec §11.3 检查清单）。
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

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

export const CONSOLE_TOOLS = [
  "my_subscription",
  "my_billing",
  "my_usage",
  "my_tickets",
  // 二期执行类工具（requiresConfirmation=true）
  "my_change_plan",
] as const;

export type AdminToolId = (typeof ADMIN_TOOLS)[number];
export type ConsoleToolId = (typeof CONSOLE_TOOLS)[number];
