/**
 * varda.client.ts - Varda 聊天 HTTP 客户端
 * @package @vxture/agent-studio-varda
 * @layer Presentation
 * @category Lib
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import { parseSseStream } from "./stream";
import type { ChatStreamEvent, VardaSurface } from "../types/varda.types";

// ============================================================================
// 请求参数
// ============================================================================

export interface StreamChatParams {
  message: string;
  sessionId: string | null;
  surface: VardaSurface;
}

function normalizeOrigin(value: string | undefined): string {
  return value?.trim().replace(/\/+$/, "") ?? "";
}

const VARDA_BFF_ORIGIN = normalizeOrigin(process.env.NEXT_PUBLIC_VARDA_BFF_URL);

function vardaBffUrl(path: string): string {
  return `${VARDA_BFF_ORIGIN}${path}`;
}

// ============================================================================
// 客户端
// ============================================================================

/**
 * 向 varda-bff 发起 SSE 流式请求，返回异步生成器。
 * 请求携带 cookie（credentials: 'include'），认证由 varda-bff 中间件处理。
 */
export async function* streamChat({
  message,
  sessionId,
  surface,
}: StreamChatParams): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch(vardaBffUrl("/varda/chat"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Varda-Surface": surface,
    },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    yield { type: "error", message: `HTTP ${res.status}: ${text}` };
    return;
  }

  if (!res.body) {
    yield { type: "error", message: "响应体为空" };
    return;
  }

  yield* parseSseStream(res.body);
}

// ============================================================================
// 确认接口
// ============================================================================

export interface ConfirmParams {
  auditId: string;
  confirmed: boolean;
  surface: VardaSurface;
  /** 传递给服务端，确认成功后将工具结果写入该会话历史 */
  sessionId?: string | null;
}

/** 向 varda-bff 发送用户确认或取消指令，返回 agent-server 的响应 JSON。 */
export async function sendConfirm({
  auditId,
  confirmed,
  surface,
  sessionId,
}: ConfirmParams): Promise<unknown> {
  const res = await fetch(vardaBffUrl("/varda/confirm"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Varda-Surface": surface,
    },
    body: JSON.stringify({
      auditId,
      confirmed,
      sessionId: sessionId ?? undefined,
    }),
  });

  const json = (await res.json()) as unknown;
  if (!res.ok) {
    const message =
      (json as { message?: string })?.message ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  return json;
}
