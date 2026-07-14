/**
 * stream.ts - SSE 流式响应解析工具
 * @package @vxture/agent-studio-varda
 * @layer Presentation
 * @category Lib
 *
 * @author AI-Generated
 * @date 2026-04-30
 */

import type { ChatStreamEvent } from "../types/varda.types";

/**
 * 将 fetch 的 ReadableStream 解析为 ChatStreamEvent 异步生成器。
 * 每个 SSE `data:` 行解析为一个 ChatStreamEvent。
 */
export async function* parseSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (!payload) continue;
        try {
          yield JSON.parse(payload) as ChatStreamEvent;
        } catch {
          // 继续处理后续行，但记录日志便于调试
          if (process.env.NODE_ENV !== "production") {
            console.warn(
              "[varda/stream] SSE parse error, raw payload:",
              payload,
            );
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
