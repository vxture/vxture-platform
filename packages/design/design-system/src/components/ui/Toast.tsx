"use client";

/**
 * toast.tsx - Toast 通知组件
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - UI
 * @description
 *   提供全局 ToastProvider 与 useToast Hook，统一系统通知层级和语义 tone。
 *
 * @author AI-Generated
 * @date 2026-05-16
 */

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { cn } from "../../utils/cn";

export type ToastTone = "success" | "error" | "warning" | "info" | "ai";

export interface ToastInput {
  readonly id?: string;
  readonly tone?: ToastTone;
  readonly title: string;
  readonly description?: string;
  readonly duration?: number;
}

interface ToastRecord {
  readonly id: string;
  readonly tone: ToastTone;
  readonly title: string;
  readonly description?: string;
  readonly duration: number;
}

interface ToastContextValue {
  readonly toast: (input: ToastInput) => string;
  readonly dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_LABEL: Record<ToastTone, string> = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info",
  ai: "AI",
};

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id =
        input.id ??
        `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const nextToast: ToastRecord = {
        id,
        tone: input.tone ?? "info",
        title: input.title,
        duration: input.duration ?? 4000,
      };
      const toastWithDescription = input.description
        ? { ...nextToast, description: input.description }
        : nextToast;

      setToasts((current) => [...current, toastWithDescription]);
      if (toastWithDescription.duration > 0) {
        window.setTimeout(() => dismiss(id), toastWithDescription.duration);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toast, dismiss }),
    [dismiss, toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="vx-toast-viewport"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn("vx-toast", `vx-toast--${item.tone}`)}
            role="alert"
          >
            <span className="vx-toast__icon" aria-hidden>
              {TONE_LABEL[item.tone]}
            </span>
            <div className="vx-toast__body">
              <div className="vx-toast__title">{item.title}</div>
              {item.description ? (
                <div className="vx-toast__desc">{item.description}</div>
              ) : null}
            </div>
            <button
              type="button"
              className="vx-toast__close"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
            >
              Close
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
