/**
 * Textarea.tsx - 多行输入（shadcn 惯例）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Form
 *
 * 结构承 shadcn 官方 Textarea，与 Input 共用同一套边框、焦点环与失效态，
 * 差别只在最小高度与 `field-sizing-content`（随内容增高，上游新版行为）。
 *
 * 原实现挂了 .vx-textarea，并引用不存在的 ring-offset-vx-surface，一并清除。
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          "flex field-sizing-content min-h-row-4xl w-full rounded-md border border-input bg-card px-sm py-xs",
          "text-body-sm text-foreground placeholder:text-muted-foreground",
          "transition-[color,box-shadow] duration-fast ease-standard outline-none",
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

Textarea.displayName = "Textarea";
