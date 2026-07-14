/**
 * native-select.tsx - NativeSelect 组件
 * @package @vxture/design-system
 *
 * 用于后台筛选器和紧凑表单中需要原生 select 语义的场景。
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  NativeSelectProps
>(function NativeSelect({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn("vx-input vx-select-trigger", className)}
      {...props}
    />
  );
});

NativeSelect.displayName = "NativeSelect";
