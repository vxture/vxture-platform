/**
 * Input.tsx - 单行输入（shadcn 惯例）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Form
 *
 * 结构承 shadcn 官方 Input。相对上游的定制：
 * - 焦点环与 Button 对齐（ring-[3px] + ring-ring/50 + border-ring），上游新旧两版
 *   写法不一，此处以本仓 Button 为准，保证同一表单行里控件的焦点表现一致。
 * - 失效态用 `aria-invalid` 驱动，不额外开 prop——校验状态由表单库写在 DOM 上。
 * - 尺度走 T2（h-control-lg / px-sm / text-body-sm），跟随密度与字号三档。
 *
 * 原实现挂了 .vx-input，并引用不存在的 ring-offset-vx-surface，两者一并清除。
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, type, ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "flex h-control-lg w-full min-w-0 rounded-md border border-input bg-card px-sm py-2xs",
          "text-body-sm text-foreground placeholder:text-muted-foreground",
          "transition-[color,box-shadow] duration-fast ease-standard outline-none",
          "file:inline-flex file:border-0 file:bg-transparent file:text-label-sm file:text-foreground",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          "disabled:cursor-not-allowed disabled:opacity-disabled",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
