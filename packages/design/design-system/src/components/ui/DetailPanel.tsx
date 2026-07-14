/**
 * detail-panel.tsx - 跨应用详情面板 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { cn } from "../../utils/cn";

export interface DetailField {
  readonly label: string;
  readonly value: React.ReactNode;
}

export interface DetailPanelProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  readonly title: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly fields?: readonly DetailField[];
  readonly actions?: React.ReactNode;
}

const DetailPanel = React.forwardRef<HTMLDivElement, DetailPanelProps>(
  function DetailPanel(
    { className, title, description, fields, children, actions, ...props },
    ref,
  ) {
    return (
      <div ref={ref} className={cn("vx-detail-panel", className)} {...props}>
        <div className="vx-detail-panel__header">
          <div>
            <h3 className="vx-card-title">{title}</h3>
            {description ? (
              <p className="vx-card__description">{description}</p>
            ) : null}
          </div>
        </div>
        {fields?.length ? (
          <div className="vx-detail-grid">
            {fields.map((field) => (
              <div key={field.label}>
                <span>{field.label}</span>
                <strong>{field.value}</strong>
              </div>
            ))}
          </div>
        ) : null}
        {children ? (
          <div className="vx-detail-panel__body">{children}</div>
        ) : null}
        {actions ? (
          <div className="vx-detail-panel__actions">{actions}</div>
        ) : null}
      </div>
    );
  },
);

DetailPanel.displayName = "DetailPanel";

export { DetailPanel };
