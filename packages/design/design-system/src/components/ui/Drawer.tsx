"use client";

/**
 * drawer.tsx - 侧滑抽屉组件
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - UI
 * @description
 *   提供带 scrim、Esc 关闭和 body scroll lock 的通用侧滑面板。
 *
 * @author AI-Generated
 * @date 2026-05-16
 */

import type { CSSProperties, ReactNode } from "react";
import { useEffect } from "react";
import { cn } from "../../utils/cn";

export interface DrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly side?: "right" | "left";
  readonly width?: number | string;
  readonly title?: ReactNode;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

export function Drawer({
  open,
  onClose,
  side = "right",
  width,
  title,
  footer,
  children,
  className,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const widthValue = typeof width === "number" ? `${width}px` : width;
  const panelStyle = widthValue
    ? ({ "--vx-drawer-width": widthValue } as CSSProperties)
    : undefined;

  return (
    <div className={cn("vx-drawer-root", `vx-drawer-root--${side}`, className)}>
      <button
        type="button"
        className="vx-drawer__scrim"
        onClick={onClose}
        aria-label="Close drawer"
      />
      <div
        className="vx-drawer__panel"
        role="dialog"
        aria-modal="true"
        style={panelStyle}
      >
        {title ? (
          <div className="vx-drawer__header">
            <div className="vx-drawer__title">{title}</div>
            <button
              type="button"
              className="vx-drawer__close"
              onClick={onClose}
              aria-label="Close drawer"
            >
              Close
            </button>
          </div>
        ) : null}
        <div className="vx-drawer__body">{children}</div>
        {footer ? <div className="vx-drawer__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
