/**
 * page-section.tsx - 跨应用页面内容分区 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export type PageSectionTone = "default" | "muted";

export interface PageSectionProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  "title"
> {
  readonly title?: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly action?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly tone?: PageSectionTone;
  readonly headerClassName?: string;
  readonly bodyClassName?: string;
}

const PageSection = React.forwardRef<HTMLElement, PageSectionProps>(
  function PageSection(
    {
      className,
      title,
      description,
      action,
      children,
      tone = "default",
      headerClassName,
      bodyClassName,
      ...props
    },
    ref,
  ) {
    return (
      <section
        ref={ref}
        className={cn("vx-page-section", `vx-page-section--${tone}`, className)}
        {...props}
      >
        {title || description || action ? (
          <header className={cn("vx-page-section__header", headerClassName)}>
            <div>
              {title ? (
                <h2 className="vx-page-section__title">{title}</h2>
              ) : null}
              {description ? (
                <p className="vx-page-section__description">{description}</p>
              ) : null}
            </div>
            {action ? (
              <div className="vx-page-section__action">{action}</div>
            ) : null}
          </header>
        ) : null}
        <div className={cn("vx-page-section__body", bodyClassName)}>
          {children}
        </div>
      </section>
    );
  },
);

PageSection.displayName = "PageSection";

export { PageSection };
