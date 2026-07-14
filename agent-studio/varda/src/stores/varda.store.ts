/**
 * varda.store.ts - Varda 全局状态（Zustand）
 * @package @vxture/agent-studio-varda
 * @layer Presentation
 * @category Store
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import { create } from "zustand";
import type {
  VardaConfirmPending,
  VardaMessage,
  VardaSurface,
} from "../types/varda.types";

// ============================================================================
// 状态类型
// ============================================================================

export interface VardaState {
  /** 当前会话 ID，null 表示尚未建立 */
  sessionId: string | null;
  /** 当前面的所有消息 */
  messages: VardaMessage[];
  /** 是否正在流式接收响应 */
  isStreaming: boolean;
  /** 侧边栏/浮窗是否展开 */
  isOpen: boolean;
  /** 所在 surface，由宿主注入 */
  surface: VardaSurface | null;
  /** 挂起等待用户确认的执行类工具，null 表示无待确认任务 */
  pendingConfirm: VardaConfirmPending | null;
}

export interface VardaActions {
  setSurface: (surface: VardaSurface) => void;
  setOpen: (open: boolean) => void;
  toggleOpen: () => void;
  setSessionId: (id: string) => void;
  appendMessage: (msg: VardaMessage) => void;
  appendTextDelta: (id: string, delta: string) => void;
  setStreaming: (streaming: boolean) => void;
  setPendingConfirm: (confirm: VardaConfirmPending | null) => void;
  reset: () => void;
}

export type VardaStore = VardaState & VardaActions;

// ============================================================================
// 初始状态
// ============================================================================

const INITIAL_STATE: VardaState = {
  sessionId: null,
  messages: [],
  isStreaming: false,
  isOpen: false,
  surface: null,
  pendingConfirm: null,
};

// ============================================================================
// Store 实例
// ============================================================================

export const useVardaStore = create<VardaStore>((set) => ({
  ...INITIAL_STATE,

  setSurface: (surface) => set({ surface }),

  setOpen: (open) => set({ isOpen: open }),

  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),

  setSessionId: (id) => set({ sessionId: id }),

  appendMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  /** 追加文本 delta 到指定消息 id 的 content 末尾 */
  appendTextDelta: (id, delta) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id && m.role !== "tool"
          ? { ...m, content: m.content + delta }
          : m,
      ),
    })),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setPendingConfirm: (confirm) => set({ pendingConfirm: confirm }),

  reset: () => set(INITIAL_STATE),
}));
