/**
 * MessageList.tsx - 消息列表（自动滚动到底部）
 * @package @vxture/agent-studio-varda
 * @layer Presentation
 * @category Component
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { useVardaStore } from "../stores/varda.store";

// ============================================================================
// 组件
// ============================================================================

export function MessageList() {
  const messages = useVardaStore((s) => s.messages);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 每次消息变化时滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!messages.length) {
    return (
      <div className="vx-varda-messages vx-varda-messages--empty">
        你好！有什么可以帮助你的？
      </div>
    );
  }

  return (
    <div className="vx-varda-messages">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
