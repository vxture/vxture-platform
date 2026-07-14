"use client";

/**
 * PromptInput.tsx - AI Prompt 输入框
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - AI
 * @description
 *   提供 AI 专用输入、mention chip、工具栏和快捷提交能力。
 *
 * @author AI-Generated
 * @date 2026-05-16
 */

import type { KeyboardEvent } from "react";
import { cn } from "../../utils/cn";

export interface PromptInputChip {
  readonly label: string;
  readonly active?: boolean;
  readonly onClick?: () => void;
}

export interface PromptInputProps {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly onSubmit?: (value: string) => void;
  readonly placeholder?: string;
  readonly label?: string;
  readonly chips?: readonly PromptInputChip[];
  readonly hint?: string;
  readonly submitLabel?: string;
  readonly busy?: boolean;
  readonly className?: string;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask anything...",
  label,
  chips,
  hint = "Cmd+Enter to send",
  submitLabel = "Generate",
  busy = false,
  className,
}: PromptInputProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return;
    event.preventDefault();
    if (!busy) {
      onSubmit?.(value);
    }
  };

  return (
    <div
      className={cn(
        "vx-prompt-input",
        busy ? "vx-prompt-input--busy" : undefined,
        className,
      )}
    >
      {chips && chips.length > 0 ? (
        <div className="vx-prompt-input__toolbar">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className={cn(
                "vx-prompt-input__chip",
                chip.active ? "vx-prompt-input__chip--active" : undefined,
              )}
              onClick={chip.onClick}
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}
      <textarea
        className="vx-prompt-input__textarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        rows={3}
      />
      <div className="vx-prompt-input__footer">
        <span className="vx-prompt-input__hint">{hint}</span>
        <button
          type="button"
          className="vx-prompt-input__send"
          disabled={busy || !value.trim()}
          onClick={() => onSubmit?.(value)}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
