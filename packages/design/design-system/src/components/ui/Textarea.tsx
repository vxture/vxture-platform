/**
 * textarea.tsx - Textarea 组件
 * @package @vxture/design-system
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Form
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-20 w-full rounded-md border border-vx-border bg-vx-surface px-3 py-2 text-sm ring-offset-vx-surface placeholder:text-vx-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vx-ring-strong focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          "vx-textarea",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
