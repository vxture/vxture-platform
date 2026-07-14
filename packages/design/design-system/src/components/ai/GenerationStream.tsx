"use client";

/**
 * GenerationStream.tsx - AI 流式生成展示面
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - AI
 * @description
 *   呈现生成中状态、流式文本和 token 吞吐元信息，spark 色彩只在生成态使用。
 *
 * @author AI-Generated
 * @date 2026-05-16
 */

import { cn } from "../../utils/cn";

export interface GenerationStreamProps {
  readonly text: string;
  readonly streaming?: boolean;
  readonly modelId?: string;
  readonly tokensProduced?: number;
  readonly tokensPerSecond?: number;
  readonly label?: string;
  readonly className?: string;
}

export function GenerationStream({
  text,
  streaming = true,
  modelId,
  tokensProduced,
  tokensPerSecond,
  label,
  className,
}: GenerationStreamProps) {
  const hasMeta =
    modelId || tokensProduced !== undefined || tokensPerSecond !== undefined;

  return (
    <div
      className={cn(
        "vx-gen-stream",
        streaming ? "vx-gen-stream--streaming" : undefined,
        className,
      )}
    >
      <div className="vx-gen-stream__header">
        {streaming ? (
          <span className="vx-gen-stream__spark" aria-hidden />
        ) : null}
        <span className="vx-gen-stream__label">
          {label ?? (streaming ? "GENERATING" : "COMPLETE")}
        </span>
      </div>
      <div className="vx-gen-stream__body">
        {text}
        {streaming ? (
          <span className="vx-gen-stream__cursor" aria-hidden />
        ) : null}
      </div>
      {hasMeta ? (
        <div className="vx-gen-stream__meta">
          {tokensProduced !== undefined ? (
            <span>tokens: {tokensProduced.toLocaleString()}</span>
          ) : null}
          {tokensPerSecond !== undefined ? (
            <span>{tokensPerSecond} tok/s</span>
          ) : null}
          {modelId ? <span>{modelId}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
