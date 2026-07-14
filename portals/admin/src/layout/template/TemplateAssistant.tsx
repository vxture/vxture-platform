"use client";

/* 设计稿 .assistant 外壳（is-wide/is-full 三档、reflow 由 app.css 承接），
 * 内部渲染真实 VardaChat（inline 模式，自带 header/消息/输入与档位控制）。
 * admin surface —— 与 console 外壳完全一致，仅 surface 不同。 */

import dynamic from "next/dynamic";
import type { VardaInlineMode } from "@vxture/agent-studio-varda";

const VardaChat = dynamic(
  () => import("@vxture/agent-studio-varda").then((m) => m.VardaChat),
  { ssr: false },
);

export interface TemplateAssistantProps {
  mode: VardaInlineMode;
  onClose: () => void;
  onToggleWide: () => void;
  onToggleFull: () => void;
}

export function TemplateAssistant({
  mode,
  onClose,
  onToggleWide,
  onToggleFull,
}: TemplateAssistantProps) {
  return (
    <aside
      className={
        "assistant" +
        (mode === "wide" ? " is-wide" : "") +
        (mode === "full" ? " is-full" : "")
      }
    >
      <VardaChat
        surface="admin"
        position="inline"
        mode={mode}
        onClose={onClose}
        onToggleWide={onToggleWide}
        onToggleFull={onToggleFull}
      />
    </aside>
  );
}
