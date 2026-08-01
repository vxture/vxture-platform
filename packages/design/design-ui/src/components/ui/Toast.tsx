"use client";

/**
 * Toast.tsx - 全局通知（自有实现，非 shadcn 上游件）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Overlay
 *
 * 为什么不照搬上游：shadcn 现行推荐是 sonner，换过去等于整套 API 改写并引一个
 * 新依赖，而本组件的 API（`toast()` 命令式调用、返回 id、tone / duration）已经被
 * 产品侧照抄了 16 处——换掉的收益是"跟上上游"，代价是让那 16 处全部返工。
 * 保留现有 API，只把样式换成 T2 语义类。真要迁 sonner 应当单独立项。
 *
 * 相对原实现的修正：
 * - 去掉整套 .vx-toast* 类（随遗留样式层退役后本组件完全无样式）。
 * - tone 图标原先渲染的是 "Success" / "Error" 这类英文文本当图标，且 aria-hidden；
 *   改为真图标，语义色绑 T2 的四个语义族。
 * - 关闭按钮原先是 "Close" 文本，改为图标 + aria-label。
 * - `role="alert"` 改为 `role="status"` + `aria-live`：alert 会打断屏幕阅读器，
 *   只有 error 需要这种强度。
 */

import * as React from "react";
import { cn } from "../../utils/cn";
import { Icon, type IconName } from "../../icons";

export type ToastTone = "success" | "error" | "warning" | "info" | "ai";

export interface ToastInput {
  readonly id?: string;
  readonly tone?: ToastTone;
  readonly title: string;
  readonly description?: string;
  /** 毫秒；<=0 表示不自动消失。 */
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

const ToastContext = React.createContext<ToastContextValue | null>(null);

const TONE: Record<
  ToastTone,
  { readonly icon: IconName; readonly cls: string }
> = {
  success: { icon: "check", cls: "border-success-border text-success-text" },
  error: {
    icon: "error",
    cls: "border-destructive-border text-destructive-text",
  },
  warning: {
    icon: "warning",
    cls: "border-warning-border text-warning-text",
  },
  info: { icon: "info", cls: "border-info-border text-info-text" },
  ai: { icon: "sparkles", cls: "border-ai-border text-ai-text" },
};

export function ToastProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id =
        input.id ??
        `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const record: ToastRecord = {
        id,
        tone: input.tone ?? "info",
        title: input.title,
        duration: input.duration ?? 4000,
        ...(input.description ? { description: input.description } : {}),
      };

      setToasts((current) => [...current, record]);
      if (record.duration > 0) {
        window.setTimeout(() => dismiss(id), record.duration);
      }
      return id;
    },
    [dismiss],
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({ toast, dismiss }),
    [dismiss, toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-none bottom-none z-toast flex flex-col items-center gap-sm p-lg sm:items-end"
        role="region"
        aria-label="通知"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            aria-live={item.tone === "error" ? "assertive" : "polite"}
            className={cn(
              "pointer-events-auto flex w-full max-w-content-narrow-lg items-start gap-sm",
              "rounded-lg border bg-popover p-md shadow-notification",
              "animate-in slide-in-from-bottom fade-in duration-base ease-enter",
              TONE[item.tone].cls,
            )}
          >
            <Icon
              name={TONE[item.tone].icon}
              size={16}
              className="mt-2xs shrink-0"
              aria-hidden
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2xs">
              <div className="text-label-md text-foreground">{item.title}</div>
              {item.description ? (
                <div className="text-body-sm text-muted-foreground">
                  {item.description}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="关闭通知"
              className={cn(
                "inline-flex size-control-2xs shrink-0 items-center justify-center rounded-sm",
                "text-muted-foreground transition-colors duration-fast ease-standard",
                "hover:bg-accent hover:text-foreground",
                "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              )}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
