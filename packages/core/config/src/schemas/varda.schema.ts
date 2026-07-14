/**
 * varda.schema.ts - Varda agent-server 运行配置 Schema
 * @package  @vxture/core-config
 * @layer    Infrastructure
 * @category schema
 * @description
 *   Varda 专属运行配置集中在 core-config 校验，避免业务服务绕过配置模块直接读取环境变量。
 *
 * @author AI-Generated
 * @date 2026-05-28
 */

import { z } from "zod";

export const vardaSchema = z.object({
  /** admin surface 缺少租户上下文时，用平台租户承接 LLM 网关计费归因 */
  VARDA_PLATFORM_LLM_TENANT_ID: z.string().uuid(),

  /** 未提供会话级模型覆盖时使用的默认模型编码 */
  VARDA_DEFAULT_MODEL_CODE: z.string().min(1),

  /** 可选的 LLM 网关 Agent 过滤 ID，缺省时不启用过滤 */
  VARDA_LLM_AGENT_ID: z.string().min(1).optional(),
});

export type VardaConfig = z.infer<typeof vardaSchema>;
