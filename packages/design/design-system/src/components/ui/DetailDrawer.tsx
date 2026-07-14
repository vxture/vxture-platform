/**
 * detail-drawer.tsx - 跨应用详情抽屉 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { Icon } from "../../icons";
import { cn } from "../../utils/cn";
import { Button } from "./Button";
import { DetailPanel } from "./DetailPanel";
import type { DetailField, DetailPanelProps } from "./DetailPanel";

export interface DetailDrawerProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  readonly title: string;
  readonly description?: React.ReactNode;
  readonly fields?: readonly DetailField[];
  readonly children?: React.ReactNode;
  readonly onClose: () => void;
  readonly closeLabel?: string;
  readonly panelClassName?: string;
  readonly detailProps?: Omit<
    DetailPanelProps,
    "title" | "description" | "fields" | "children"
  >;
}

const DetailDrawer = React.forwardRef<HTMLDivElement, DetailDrawerProps>(
  function DetailDrawer(
    {
      className,
      title,
      description,
      fields,
      children,
      onClose,
      closeLabel = "Close details",
      panelClassName,
      detailProps,
      ...props
    },
    ref,
  ) {
    const descriptionProps = description ? { description } : {};
    const fieldProps = fields ? { fields } : {};

    return (
      <div
        ref={ref}
        className={cn("vx-overlay", className)}
        onClick={onClose}
        {...props}
      >
        <aside
          className={cn(
            "vx-card vx-card__content vx-drawer-like",
            panelClassName,
          )}
          aria-label={`${title} details`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="vx-drawer-like__header">
            <div />
            <Button
              variant="ghost"
              size="icon"
              aria-label={closeLabel}
              onClick={onClose}
            >
              <Icon
                name="x"
                size="xs"
                fallback="placeholder"
                className="vx-btn__icon"
              />
            </Button>
          </div>
          <DetailPanel
            title={title}
            {...descriptionProps}
            {...fieldProps}
            {...detailProps}
          >
            {children}
          </DetailPanel>
        </aside>
      </div>
    );
  },
);

DetailDrawer.displayName = "DetailDrawer";

export { DetailDrawer };
