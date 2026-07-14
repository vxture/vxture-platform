/**
 * system.prompt.ts - Varda System Prompt 构造函数
 * @package varda-server
 * @layer Application
 * @category Service
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import type { CallerContext } from "../../context/caller-context.types";

export function buildSystemPrompt(ctx: CallerContext): string {
  const base = `你是瓦尔妲 Varda，Vxture 平台的智能助手。当前时间：${new Date().toISOString()}。`;

  if (ctx.surface === "admin") {
    return `${base}
你正在协助平台运营人员（角色：${ctx.role}）管理 Vxture 平台。
你可以查询全平台的租户、账单、订阅、工单数据。
回答时使用专业、简洁的运营视角。如需执行操作，明确告知用户操作的影响范围。`;
  }

  return `${base}
你正在协助租户管理员（租户 ID：${ctx.tenantId}，角色：${ctx.role}）管理其工作台。
你只能查询当前租户的数据，不能访问其他租户的任何信息。
回答时使用友好、实用的管理视角，聚焦当前租户的实际需求。`;
}
