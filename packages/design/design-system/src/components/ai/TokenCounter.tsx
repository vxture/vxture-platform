"use client";

/**
 * TokenCounter.tsx - AI token 用量条
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - AI
 * @description
 *   以 success、spark、danger 三段语义表达 token 预算消耗状态。
 *
 * @author AI-Generated
 * @date 2026-05-16
 */

import type { CSSProperties } from "react";
import { cn } from "../../utils/cn";

export interface TokenCounterProps {
  readonly used: number;
  readonly total: number;
  readonly label?: string;
  readonly showNumbers?: boolean;
  readonly className?: string;
}

export function TokenCounter({
  used,
  total,
  label = "USAGE",
  showNumbers = true,
  className,
}: TokenCounterProps) {
  const safeTotal = Math.max(total, 1);
  const percent = Math.min(100, Math.max(0, (used / safeTotal) * 100));
  const tone = percent >= 85 ? "danger" : percent >= 60 ? "spark" : "success";

  return (
    <div
      className={cn("vx-token-counter", `vx-token-counter--${tone}`, className)}
    >
      <span className="vx-token-counter__label">{label}</span>
      <div
        className="vx-token-counter__track"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
      >
        <div
          className="vx-token-counter__fill"
          style={{ "--vx-token-counter-value": `${percent}%` } as CSSProperties}
        />
      </div>
      {showNumbers ? (
        <span className="vx-token-counter__stats">
          <span className="vx-token-counter__used">
            {used.toLocaleString()}
          </span>
          <span className="vx-token-counter__total">
            {" "}
            / {safeTotal.toLocaleString()} tokens
          </span>
        </span>
      ) : (
        <span className="vx-token-counter__stats">{percent.toFixed(0)}%</span>
      )}
    </div>
  );
}
