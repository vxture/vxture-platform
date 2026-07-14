/**
 * DetailSectionHeading.tsx - 管理后台详情分区标题。
 * @package @vxture/admin
 * @layer Presentation
 * @category Modules - Shared
 * @author AI-Generated
 * @date 2026-05-17
 */

import {
  DetailSectionHeading as DesignDetailSectionHeading,
  type DetailSectionHeadingProps,
} from "@vxture/design-system";

export function DetailSectionHeading({
  className,
  iconClassName,
  copyClassName,
  ...props
}: DetailSectionHeadingProps) {
  return (
    <DesignDetailSectionHeading
      className={["admin-overview-heading", className]
        .filter(Boolean)
        .join(" ")}
      iconClassName={["admin-overview-heading__icon", iconClassName]
        .filter(Boolean)
        .join(" ")}
      copyClassName={["admin-overview-heading__copy", copyClassName]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
