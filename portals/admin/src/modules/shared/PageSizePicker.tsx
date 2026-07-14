/**
 * PageSizePicker.tsx - 管理后台分页尺寸选择器。
 * @package @vxture/admin
 * @layer Presentation
 * @category Modules - Shared
 * @author AI-Generated
 * @date 2026-05-17
 */

import {
  cn,
  PageSizePicker as DesignPageSizePicker,
  type PageSizePickerProps as DesignPageSizePickerProps,
} from "@vxture/design-system";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export type PageSizePickerProps = Omit<
  DesignPageSizePickerProps<PageSize>,
  "options"
>;

export function PageSizePicker({ className, ...props }: PageSizePickerProps) {
  return (
    <DesignPageSizePicker
      className={cn("vx-tenant-page-size", className)}
      options={PAGE_SIZE_OPTIONS}
      {...props}
    />
  );
}
