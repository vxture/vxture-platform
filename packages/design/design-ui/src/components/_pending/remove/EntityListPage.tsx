/**
 * entity-list-page.tsx - 实体列表页组合 pattern。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 * @author AI-Generated
 * @date 2026-05-17
 */

import * as React from "react";
import { ViewLayout } from "../patterns/ViewLayout";

export interface EntityListPageProps {
  readonly header: React.ReactNode;
  readonly summary?: React.ReactNode;
  readonly insights?: React.ReactNode;
  readonly list: React.ReactNode;
  readonly drawer?: React.ReactNode;
}

export function EntityListPage({
  header,
  summary,
  insights,
  list,
  drawer,
}: EntityListPageProps) {
  return (
    <ViewLayout>
      {header}
      {summary}
      {insights ? <ViewLayout>{insights}</ViewLayout> : null}
      {list}
      {drawer}
    </ViewLayout>
  );
}
