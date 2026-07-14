/**
 * detail-section-heading.tsx - 详情分区标题 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { Icon } from "../../icons";
import type { IconName, IconSize } from "../../icons";
import { cn } from "../../utils/cn";

export type DetailSectionHeadingLevel = 2 | 3 | 4;

export interface DetailSectionHeadingProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  readonly icon: IconName;
  readonly title: React.ReactNode;
  readonly iconSize?: IconSize | number;
  readonly iconFallback?: IconName;
  readonly level?: DetailSectionHeadingLevel;
  readonly iconClassName?: string;
  readonly copyClassName?: string;
}

const headingTagByLevel = {
  2: "h2",
  3: "h3",
  4: "h4",
} as const;

function DetailSectionHeading({
  className,
  icon,
  title,
  iconSize = "lg",
  iconFallback = "placeholder",
  level = 2,
  iconClassName,
  copyClassName,
  ...props
}: DetailSectionHeadingProps) {
  const HeadingTag = headingTagByLevel[level];

  return (
    <div className={cn("vx-detail-section-heading", className)} {...props}>
      <span
        className={cn("vx-detail-section-heading__icon", iconClassName)}
        aria-hidden="true"
      >
        <Icon name={icon} size={iconSize} fallback={iconFallback} />
      </span>
      <div className={cn("vx-detail-section-heading__copy", copyClassName)}>
        <HeadingTag>{title}</HeadingTag>
      </div>
    </div>
  );
}

export { DetailSectionHeading };
