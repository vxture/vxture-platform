/**
 * useVardaChat.ts - 聊天发送与流式接收逻辑
 * @package @vxture/agent-studio-varda
 * @layer Presentation
 * @category Hook
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

"use client";

import { useCallback } from "react";
import { useVardaStore } from "../stores/varda.store";
import { streamChat } from "../lib/varda.client";
import type { VardaMessage, VardaToolMessage } from "../types/varda.types";

type VardaDisplayHint = NonNullable<VardaToolMessage["displayHint"]>;

// ============================================================================
// Hook
// ============================================================================

export function useVardaChat() {
  const {
    surface,
    sessionId,
    isStreaming,
    appendMessage,
    appendTextDelta,
    setSessionId,
    setStreaming,
    setPendingConfirm,
  } = useVardaStore();

  const sendMessage = useCallback(
    async (text: string) => {
      if (!surface || isStreaming || !text.trim()) return;

      // 立即追加用户消息
      const userMsg: VardaMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
      };
      appendMessage(userMsg);

      // 预先创建助手消息占位
      const assistantId = crypto.randomUUID();
      const assistantMsg: VardaMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
      };
      appendMessage(assistantMsg);
      setStreaming(true);

      try {
        for await (const event of streamChat({
          message: text.trim(),
          sessionId,
          surface,
        })) {
          switch (event.type) {
            case "text":
              appendTextDelta(assistantId, event.delta);
              break;

            case "tool_call": {
              const toolMsg: VardaMessage = {
                id: event.toolId,
                role: "tool",
                toolId: event.toolId,
                data: null,
              };
              appendMessage(toolMsg);
              break;
            }

            case "tool_result": {
              // 找到对应 tool 消息，更新 data 和 displayHint
              useVardaStore.setState((s) => ({
                messages: s.messages.map((m) => {
                  if (m.role !== "tool" || m.toolId !== event.toolId) {
                    return m;
                  }

                  const nextMessage: VardaToolMessage = {
                    ...m,
                    data: event.data,
                  };
                  if (event.displayHint) {
                    nextMessage.displayHint =
                      event.displayHint as VardaDisplayHint;
                  }
                  return nextMessage;
                }),
              }));
              break;
            }

            case "confirm_required":
              setPendingConfirm({
                auditId: event.auditId,
                toolId: event.toolId,
                summary: event.summary,
              });
              break;

            case "done":
              if (event.sessionId) setSessionId(event.sessionId);
              break;

            case "error":
              appendTextDelta(assistantId, `\n\n[错误：${event.message}]`);
              break;
          }
        }
      } finally {
        setStreaming(false);
      }
    },
    [
      surface,
      sessionId,
      isStreaming,
      appendMessage,
      appendTextDelta,
      setSessionId,
      setStreaming,
      setPendingConfirm,
    ],
  );

  return { sendMessage, isStreaming };
}
