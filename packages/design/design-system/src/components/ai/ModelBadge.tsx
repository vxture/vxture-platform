"use client";

/**
 * ModelBadge.tsx - AI 模型身份徽章
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - AI
 * @description
 *   用于模型选择、部署状态和 AI Header，不作为通用 Badge 的替代。
 *
 * @author AI-Generated
 * @date 2026-05-16
 */

import type { KeyboardEvent } from "react";
import { cn } from "../../utils/cn";

export type ModelBadgeStatus = "active" | "idle" | "deploying" | "error";

export interface ModelBadgeProps {
  readonly modelId: string;
  readonly variant?: "default" | "flagship";
  readonly status?: ModelBadgeStatus;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

const STATUS_LABEL: Record<ModelBadgeStatus, string> = {
  active: "ACTIVE",
  idle: "IDLE",
  deploying: "DEPLOYING",
  error: "ERROR",
};

export function ModelBadge({
  modelId,
  variant = "default",
  status = "active",
  onClick,
  disabled = false,
  className,
}: ModelBadgeProps) {
  const isInteractive = !!onClick && !disabled;

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (!isInteractive) return;
    if (event.key === " ") {
      event.preventDefault(); // prevent page scroll on Space
    } else if (event.key === "Enter") {
      event.preventDefault();
      onClick!();
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (!isInteractive || event.key !== " ") return;
    onClick!();
  };

  return (
    <span
      className={cn(
        "vx-model-badge",
        `vx-model-badge--${variant}`,
        `vx-model-badge--${status}`,
        isInteractive ? "vx-model-badge--interactive" : undefined,
        disabled ? "vx-model-badge--disabled" : undefined,
        className,
      )}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      role={onClick ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      aria-disabled={disabled || undefined}
    >
      <span className="vx-model-badge__dot" aria-hidden />
      <span className="vx-model-badge__id">{modelId}</span>
      <span className="vx-model-badge__status">{STATUS_LABEL[status]}</span>
    </span>
  );
}
