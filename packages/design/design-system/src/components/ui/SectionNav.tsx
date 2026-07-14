/**
 * section-nav.tsx - 分区导航 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { cn } from "../../utils/cn";
import { Button } from "./Button";

export interface SectionNavItem {
  readonly key: string;
  readonly label: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly meta?: React.ReactNode;
}

export interface SectionNavProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  "onSelect"
> {
  readonly items: readonly SectionNavItem[];
  readonly activeKey: string;
  readonly onSelect?: (key: string) => void;
}

const SectionNav = React.forwardRef<HTMLElement, SectionNavProps>(
  function SectionNav(
    {
      className,
      items,
      activeKey,
      onSelect,
      "aria-label": ariaLabel = "Section navigation",
      ...props
    },
    ref,
  ) {
    return (
      <nav
        ref={ref}
        className={cn("vx-section-nav", className)}
        aria-label={ariaLabel}
        {...props}
      >
        {items.map((item) => {
          const isActive = item.key === activeKey;

          return (
            <Button
              key={item.key}
              variant="ghost"
              className={cn(
                "vx-section-nav__item",
                isActive && "vx-section-nav__item--active",
              )}
              onClick={() => onSelect?.(item.key)}
            >
              <div className="vx-section-nav__copy">
                <strong>{item.label}</strong>
                {item.description ? <span>{item.description}</span> : null}
              </div>
              {item.meta ? (
                <div className="vx-section-nav__meta">{item.meta}</div>
              ) : null}
            </Button>
          );
        })}
      </nav>
    );
  },
);

SectionNav.displayName = "SectionNav";

export { SectionNav };
