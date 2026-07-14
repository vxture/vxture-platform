/**
 * entity-table-section.tsx - 实体列表分区 pattern。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { EmptyState } from "./EmptyState";
import { PageSection } from "./PageSection";
import type { PageSectionProps } from "./PageSection";
import { TableToolbar } from "./TableToolbar";

export interface EntityTableSectionProps extends Omit<
  PageSectionProps,
  "title" | "description" | "action" | "children"
> {
  readonly title: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly toolbarTitle?: React.ReactNode;
  readonly toolbarHint?: React.ReactNode;
  readonly toolbarAction?: React.ReactNode;
  readonly filters?: React.ReactNode;
  readonly hasData?: boolean;
  readonly emptyTitle?: React.ReactNode;
  readonly emptyDescription?: React.ReactNode;
  readonly emptyAction?: React.ReactNode;
  readonly children: React.ReactNode;
}

const EntityTableSection = React.forwardRef<
  HTMLElement,
  EntityTableSectionProps
>(function EntityTableSection(
  {
    title,
    description,
    toolbarTitle,
    toolbarHint,
    toolbarAction,
    filters,
    hasData = true,
    emptyTitle = "No items found.",
    emptyDescription,
    emptyAction,
    children,
    ...props
  },
  ref,
) {
  return (
    <PageSection ref={ref} title={title} description={description} {...props}>
      <div className="vx-table-stack">
        {toolbarTitle || toolbarHint || toolbarAction ? (
          <TableToolbar
            title={toolbarTitle ?? ""}
            hint={toolbarHint}
            action={toolbarAction}
          />
        ) : null}
        {filters ? (
          <div className="vx-entity-table-section__filters">{filters}</div>
        ) : null}
        {hasData ? (
          children
        ) : (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
          />
        )}
      </div>
    </PageSection>
  );
});

EntityTableSection.displayName = "EntityTableSection";

export { EntityTableSection };
