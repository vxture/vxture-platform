/**
 * MessageBubble.tsx - 单条消息气泡
 * @package @vxture/agent-studio-varda
 * @layer Presentation
 * @category Component
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import { ToolCallCard } from "./ToolCallCard";
import type { VardaMessage, VardaToolMessage } from "../types/varda.types";

// ============================================================================
// 组件
// ============================================================================

interface Props {
  message: VardaMessage;
}

export function MessageBubble({ message }: Props) {
  if (message.role === "tool") {
    return <ToolCallCard message={message as VardaToolMessage} />;
  }

  const isUser = message.role === "user";

  return (
    <div
      className={
        isUser
          ? "vx-varda-message vx-varda-message--user"
          : "vx-varda-message vx-varda-message--assistant"
      }
    >
      <div
        className={
          isUser
            ? "vx-varda-message__bubble vx-varda-message__bubble--user"
            : "vx-varda-message__bubble vx-varda-message__bubble--assistant"
        }
      >
        {message.content || (
          // 助手消息占位符（流式接收中）
          <span className="vx-varda-message__cursor">▍</span>
        )}
      </div>
    </div>
  );
}
