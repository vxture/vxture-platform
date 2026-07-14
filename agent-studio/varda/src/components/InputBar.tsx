/**
 * InputBar.tsx - 消息输入框 + 发送按钮
 * @package @vxture/agent-studio-varda
 * @layer Presentation
 * @category Component
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Button, Textarea } from "@vxture/design-system";
import { useVardaChat } from "../hooks/useVardaChat";
import { useVardaStore } from "../stores/varda.store";

// ============================================================================
// 组件
// ============================================================================

export function InputBar() {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isStreaming } = useVardaChat();
  const pendingConfirm = useVardaStore((s) => s.pendingConfirm);

  /** 有挂起确认时禁用输入，防止在确认前发送新消息 */
  const isDisabled = isStreaming || !!pendingConfirm;

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isDisabled) return;
    setText("");
    await sendMessage(trimmed);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Shift+Enter 换行
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="vx-varda-inputbar">
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          pendingConfirm
            ? "请先处理上方的确认请求…"
            : "输入消息… (Enter 发送，Shift+Enter 换行)"
        }
        disabled={isDisabled}
        rows={1}
        className="vx-varda-inputbar__textarea"
      />
      <Button
        onClick={() => void handleSend()}
        disabled={!text.trim() || isDisabled}
        className="vx-varda-inputbar__send"
      >
        {isStreaming ? "…" : "发送"}
      </Button>
    </div>
  );
}
