-- F1: 为 VelaMessage 补充 toolCallId 字段
-- 用途：存储 LLM 分配的 tool call ID，支持多轮对话历史中工具调用上下文的完整还原。
-- 历史数据：旧记录 toolCallId 为 NULL，toLLMHistory 会跳过 toolCallId 为 NULL 的 tool 消息。

ALTER TABLE "VelaMessage"
  ADD COLUMN IF NOT EXISTS "toolCallId" text;
