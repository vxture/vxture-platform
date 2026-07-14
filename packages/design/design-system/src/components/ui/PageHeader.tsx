/**
 * page-header.tsx - 跨应用页面标题区 pattern。
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

export interface PageHeaderProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  "title"
> {
  readonly eyebrow?: React.ReactNode;
  readonly icon?: IconName;
  readonly iconFallback?: IconName;
  readonly iconSize?: IconSize | number;
  readonly title: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly action?: React.ReactNode;
  readonly actions?: React.ReactNode;
  readonly secondary?: React.ReactNode;
  readonly copyClassName?: string;
  readonly iconClassName?: string;
  readonly titleRowClassName?: string;
  readonly descriptionClassName?: string;
  readonly actionsClassName?: string;
}

const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
  function PageHeader(
    {
      className,
      eyebrow,
      icon,
      iconFallback = "placeholder",
      iconSize = "lg",
      title,
      description,
      action,
      actions,
      secondary,
      copyClassName,
      iconClassName,
      titleRowClassName,
      descriptionClassName,
      actionsClassName,
      ...props
    },
    ref,
  ) {
    const resolvedActions = actions ?? action;

    return (
      <section ref={ref} className={cn("vx-page-header", className)} {...props}>
        {icon ? (
          <span
            className={cn("vx-page-header__icon", iconClassName)}
            aria-hidden="true"
          >
            <Icon name={icon} size={iconSize} fallback={iconFallback} />
          </span>
        ) : null}
        <div className={cn("vx-page-header__copy", copyClassName)}>
          {eyebrow ? (
            <p className="vx-page-header__eyebrow">{eyebrow}</p>
          ) : null}
          <div className={cn("vx-page-header__title-row", titleRowClassName)}>
            <h1>{title}</h1>
            {secondary}
          </div>
          {description ? (
            <p
              className={cn(
                "vx-page-header__description",
                descriptionClassName,
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        {resolvedActions ? (
          <div className={cn("vx-page-header__actions", actionsClassName)}>
            {resolvedActions}
          </div>
        ) : null}
      </section>
    );
  },
);

PageHeader.displayName = "PageHeader";

export { PageHeader };
