"use client";

/**
 * skeleton.tsx - Shimmer 加载占位组件
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - UI
 * @description
 *   提供 line、rect、circle 三种占位形态，尺寸通过 CSS 变量承接运行时输入。
 *
 * @author AI-Generated
 * @date 2026-05-16
 */

import type { CSSProperties } from "react";
import { cn } from "../../utils/cn";

export interface SkeletonProps {
  readonly variant?: "line" | "rect" | "circle";
  readonly width?: number | string;
  readonly height?: number | string;
  readonly lines?: number;
  readonly className?: string;
}

function toCssLength(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

function buildSkeletonStyle(
  width: number | string | undefined,
  height: number | string | undefined,
): CSSProperties | undefined {
  const widthValue = toCssLength(width);
  const heightValue = toCssLength(height);
  if (!widthValue && !heightValue) return undefined;

  const style: Record<string, string> = {};
  if (widthValue) {
    style["--vx-skeleton-width"] = widthValue;
  }
  if (heightValue) {
    style["--vx-skeleton-height"] = heightValue;
  }
  return style as CSSProperties;
}

export function Skeleton({
  variant = "line",
  width,
  height,
  lines,
  className,
}: SkeletonProps) {
  const style = buildSkeletonStyle(width, height);

  if (variant === "line" && lines && lines > 1) {
    return (
      <div className={cn("vx-skeleton-group", className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "vx-skeleton",
              "vx-skeleton--line",
              index === lines - 1 ? "vx-skeleton--last-line" : undefined,
            )}
            style={style}
            aria-hidden
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("vx-skeleton", `vx-skeleton--${variant}`, className)}
      style={style}
      aria-hidden
    />
  );
}
